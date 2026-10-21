'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ApplyCreditCta, type ApplyCreditMoto } from '@/components/ApplyCreditCta';
import { HeroMotoRotator } from '@/components/HeroMotoRotator';
import { trackVideoCtaClick, trackVideoOpen } from '@/lib/analytics';
import type { Motorcycle } from '@/types/motorcycle';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const VIDEO_LOCATION = 'home_hero';
const FOCUSABLE = 'button, a[href], iframe, select, input, textarea, [tabindex]:not([tabindex="-1"])';

type Props = {
  /** Fotos del carrusel del hero (se siguen mostrando igual que antes; son el LCP). */
  slides: Motorcycle[];
  /** ID del video de YouTube (Short), p. ej. "RlHX_EdgMkI". */
  videoId: string;
  /** Catálogo para el CTA "Aplica ahora" del modal (mismo flujo que la página Así funciona). */
  applyMotos: ApplyCreditMoto[];
  /** Título accesible del iframe. */
  videoTitle?: string;
  /** aria-label del botón disparador. */
  triggerLabel?: string;
  /** Texto visible bajo el botón de play. */
  badgeLabel?: string;
  ctaLabel?: string;
};

/** Preconnect a youtube-nocookie la primera vez que el usuario muestra intención (hover/focus). */
let preconnected = false;
function preconnectYouTube() {
  if (preconnected || typeof document === 'undefined') return;
  preconnected = true;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = YT_ORIGIN;
  document.head.appendChild(link);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden focusable="false">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Tarjeta del hero del home: la foto de la moto (carrusel) es un botón con un play
 * propio en verde de marca. Al hacer clic se abre un <dialog> nativo y SOLO entonces
 * se crea el iframe de YouTube. Al cerrar, el iframe se desmonta (se destruye), así
 * el audio se detiene y no queda nada cargado.
 *
 * Debajo del video va `ApplyCreditCta` (selector marca/moto → modal de Finva). El resto
 * del contenido del modal se queda montado aunque el <dialog> esté cerrado: así el
 * brick de Finva sigue vivo cuando cerramos el video justo antes de abrir su overlay.
 */
export function HeroVideoCard({
  slides,
  videoId,
  applyMotos,
  videoTitle = 'Cómo funciona MotoClick',
  triggerLabel = 'Ver video: cómo funciona MotoClick',
  badgeLabel = 'Ver cómo funciona · 30 s',
  ctaLabel = 'Aplica ahora',
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLDivElement>(null);
  /** true cuando cerramos el video para abrir Finva: no regresamos el foco al hero (lo tiene Finva). */
  const skipFocusRestoreRef = useRef(false);

  const openModal = () => {
    skipFocusRestoreRef.current = false;
    setOpen(true);
    trackVideoOpen({ videoId, location: VIDEO_LOCATION });
  };

  /** Cierra el <dialog>; el evento `close` se encarga de desmontar el iframe y devolver el foco. */
  const requestClose = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Al abrir: showModal() (hace inerte el resto de la página), bloquea scroll y enfoca la X.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;

    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  /** Se dispara con la X, con Esc (cancel nativo), con clic en el overlay y al abrir Finva. */
  const handleClose = () => {
    setOpen(false); // desmonta el iframe → se destruye el reproductor
    if (!skipFocusRestoreRef.current) triggerRef.current?.focus();
    skipFocusRestoreRef.current = false;
  };

  /** Clic fuera del contenido (sobre el overlay oscuro) cierra. */
  const handleDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) requestClose();
  };

  /** Focus trap: Tab / Shift+Tab ciclan entre los controles visibles del modal. */
  const handleDialogKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && !el.closest('[hidden]') && el.getClientRects().length > 0,
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /** "Aplica ahora": mide el clic y lleva el panel de selección a la vista (el modal hace scroll). */
  const handleApplyToggle = (panelOpen: boolean) => {
    if (!panelOpen) return;
    trackVideoCtaClick({ videoId, location: VIDEO_LOCATION, destination: 'apply_credit_panel' });
    requestAnimationFrame(() => {
      applyRef.current
        ?.querySelector('.apply-cta__panel')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  /**
   * Finva está por abrir su overlay (en body). Cerramos antes el video: un <dialog> modal
   * abierto taparía el overlay y lo dejaría inerte, y al cerrarse después le robaría el foco.
   */
  const handleBeforeCheckoutOpen = () => {
    skipFocusRestoreRef.current = true;
    requestClose();
  };

  const src = `${YT_ORIGIN}/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="hero-video-trigger"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        onClick={openModal}
        onPointerOver={preconnectYouTube}
        onFocus={preconnectYouTube}
      >
        <HeroMotoRotator slides={slides} interactive={false} />
        <span className="hero-video-trigger__overlay" aria-hidden>
          <span className="hero-video-trigger__play">
            <PlayIcon />
          </span>
          <span className="hero-video-trigger__badge">{badgeLabel}</span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="video-modal"
        role="dialog"
        aria-modal="true"
        aria-label={videoTitle}
        onClose={handleClose}
        onClick={handleDialogClick}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="video-modal__inner">
          <button
            ref={closeRef}
            type="button"
            className="video-modal__close"
            aria-label="Cerrar video"
            onClick={requestClose}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className="video-modal__frame">
            {/* El iframe SOLO existe con el modal abierto: al cerrar se destruye. */}
            {open ? (
              <iframe
                src={src}
                title={videoTitle}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : null}
          </div>
          <div className="video-modal__apply" ref={applyRef}>
            <ApplyCreditCta
              motos={applyMotos}
              label={ctaLabel}
              buttonClassName="btn green video-modal__cta"
              onToggle={handleApplyToggle}
              onBeforeCheckoutOpen={handleBeforeCheckoutOpen}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}

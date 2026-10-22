'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { ApplyCreditCta, type ApplyCreditMoto } from '@/components/ApplyCreditCta';
import { trackVideoCtaClick, trackVideoOpen } from '@/lib/analytics';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const FOCUSABLE = 'button, a[href], iframe, select, input, textarea, [tabindex]:not([tabindex="-1"])';

type Props = {
  /**
   * Lo que se ve en la tarjeta antes del clic (foto/miniatura). Va dentro del <button>,
   * así que no debe traer enlaces ni otros controles. En el home es el carrusel de motos
   * (es el LCP: no se reemplaza ni se retrasa).
   */
  thumbnail: ReactNode;
  /** Dónde está el video, para analytics (`video_location`): p. ej. "home_hero". */
  location: string;
  /** ID del video de YouTube, p. ej. "wsL1FlyJNMs". */
  videoId: string;
  /** Formato del video: 'vertical' (Short, 9:16) u 'horizontal' (16:9). Default: vertical. */
  orientation?: 'vertical' | 'horizontal';
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
    // Triángulo con su centroide en (32, 32) = centro del círculo: (24.5·2 + 47) / 3 = 32.
    <svg viewBox="0 0 64 64" aria-hidden focusable="false">
      <path
        d="M24.5 19 L47 32 L24.5 45 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Tarjeta con video: la miniatura (`thumbnail`) es un botón con un play propio en
 * verde de marca. Se usa en el hero del home y en el paso 1 de "Así funciona". Al hacer clic se abre un <dialog> nativo y SOLO entonces
 * se crea el iframe de YouTube. Al cerrar, el iframe se desmonta (se destruye), así
 * el audio se detiene y no queda nada cargado.
 *
 * Debajo del video va `ApplyCreditCta` (selector marca/moto → modal de Finva). El resto
 * del contenido del modal se queda montado aunque el <dialog> esté cerrado: así el
 * brick de Finva sigue vivo cuando cerramos el video justo antes de abrir su overlay.
 */
export function VideoModalCard({
  thumbnail,
  location,
  videoId,
  orientation = 'vertical',
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
    trackVideoOpen({ videoId, location });
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
    trackVideoCtaClick({ videoId, location, destination: 'apply_credit_panel' });
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
        {thumbnail}
        <span className="hero-video-trigger__overlay" aria-hidden>
          <span className="hero-video-trigger__play">
            <PlayIcon />
          </span>
          <span className="hero-video-trigger__badge">{badgeLabel}</span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className={orientation === 'horizontal' ? 'video-modal video-modal--horizontal' : 'video-modal'}
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

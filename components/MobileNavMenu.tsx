'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { NAV_LINKS, NAV_WHATSAPP_HREF } from '@/lib/nav';
import { site } from '@/lib/site';

/** Mismo corte que oculta `.nav-links` en globals.css. */
const DESKTOP_QUERY = '(min-width: 861px)';

/**
 * Menú del header en móvil: botón hamburguesa + panel desplegable con los mismos
 * enlaces del nav de escritorio (que se oculta debajo de 860 px).
 * Se cierra al elegir un enlace, al cambiar de ruta, con Esc, con clic fuera
 * o si la ventana pasa a tamaño escritorio.
 */
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Cambio de ruta → cerrar (cubre también el botón "atrás" del navegador).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [open]);

  return (
    <div className="mobile-nav-root" ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div id={panelId} className="mobile-nav" hidden={!open}>
        <nav aria-label="Menú principal">
          <ul className="mobile-nav__links">
            {NAV_LINKS.map((link) => {
              const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                    <span aria-hidden className="mobile-nav__chevron">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <a
            className="btn green mobile-nav__cta"
            href={NAV_WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            WhatsApp · {site.whatsappDisplay}
          </a>
        </nav>
      </div>
    </div>
  );
}

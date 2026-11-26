'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isWhatsappHref, metaEvent, motoSlugFromPath } from '@/lib/meta/pixel';

/**
 * FIN-151: `PageView` con `eventID` en cada cambio de ruta (el pixel ya no lo
 * manda solo: `fbq.disablePushState = true` en el snippet) y `Contact` en
 * cualquier clic a WhatsApp del sitio. Los clics dentro del package llegan
 * aparte, por `finva:event` (lib/finva/brick.ts).
 */
export function MetaPixelEvents() {
  const pathname = usePathname();

  useEffect(() => {
    metaEvent('PageView');
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest?.('a');
      if (!link || !isWhatsappHref(link.getAttribute('href'))) return;
      const slug = motoSlugFromPath(window.location.pathname);
      metaEvent('Contact', slug ? { content_ids: [slug] } : {});
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';
import { initPostHogClient } from '@/lib/posthog-client';

/** Respaldo de init en el árbol React; garantiza que posthog-js esté en el bundle principal.
 *  `token` llega como prop desde el layout (server) — evita el <Script beforeInteractive>
 *  que provocaba un error de hidratación al colisionar con el loader de posthog-js. */
export function PostHogInit({ token }: { token?: string }) {
  useEffect(() => {
    if (token && typeof window !== 'undefined' && !window.__POSTHOG_TOKEN__) {
      window.__POSTHOG_TOKEN__ = token;
    }
    if (initPostHogClient()) return;

    void fetch('/api/posthog-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { token?: string } | null) => {
        if (!data?.token) return;
        window.__POSTHOG_TOKEN__ = data.token;
        initPostHogClient();
      })
      .catch(() => {
        /* sin token configurado */
      });
  }, []);

  return null;
}

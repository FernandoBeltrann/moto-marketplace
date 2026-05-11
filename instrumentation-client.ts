import posthog from 'posthog-js';
import { posthogIngestHost, posthogProjectToken } from '@/lib/posthog-env';

const token = posthogProjectToken();
const disabled = process.env.NEXT_PUBLIC_POSTHOG_DISABLE === '1';

if (!disabled && token) {
  /** En dev el proxy `/ingest` a veces falla con Turbopack; por defecto ingestión directa (CORS permitido por PostHog). */
  const forceProxy = process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY === '1';
  const useProxy = process.env.NODE_ENV === 'production' || forceProxy;
  const apiHost = useProxy ? '/ingest' : posthogIngestHost();

  posthog.init(token, {
    api_host: apiHost,
    ui_host: (process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://us.posthog.com').replace(/\/$/, ''),
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
}

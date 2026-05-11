import posthog from 'posthog-js';
import { posthogProjectToken } from '@/lib/posthog-env';

const token = posthogProjectToken();
const disabled = process.env.NEXT_PUBLIC_POSTHOG_DISABLE === '1';

if (!disabled && token) {
  const rawHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, '') || '';
  const forceProxy = process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY === '1';
  /** Dominio propio (reverse proxy gestionado o self‑host) ≠ ingestión directa PostHog Cloud. */
  const isCustomIngestHost =
    Boolean(rawHost) &&
    !rawHost.includes('us.i.posthog.com') &&
    !rawHost.includes('eu.i.posthog.com');
  const apiHost = isCustomIngestHost
    ? rawHost
    : process.env.NODE_ENV === 'development' && !forceProxy
      ? rawHost || 'https://us.i.posthog.com'
      : '/ingest';

  posthog.init(token, {
    api_host: apiHost,
    ui_host: (process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://us.posthog.com').replace(/\/$/, ''),
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
}

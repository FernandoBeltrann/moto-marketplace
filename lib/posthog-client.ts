import posthog from 'posthog-js';
import { posthogProjectToken } from '@/lib/posthog-env';

function resolveApiHost(): string {
  const rawHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, '') || '';
  const forceProxy = process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY === '1';
  const isCustomIngestHost =
    Boolean(rawHost) &&
    !rawHost.includes('us.i.posthog.com') &&
    !rawHost.includes('eu.i.posthog.com');

  if (isCustomIngestHost) return rawHost;
  if (process.env.NODE_ENV === 'development' && !forceProxy) {
    return rawHost || 'https://us.i.posthog.com';
  }
  return '/ingest';
}

/** Inicializa posthog-js una sola vez (cliente). Idempotente. */
export function initPostHogClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_POSTHOG_DISABLE === '1') return false;
  if (posthog.__loaded) return true;

  const token = posthogProjectToken();
  if (!token) return false;

  posthog.init(token, {
    api_host: resolveApiHost(),
    ui_host: (process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://us.posthog.com').replace(/\/$/, ''),
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });

  return posthog.__loaded;
}

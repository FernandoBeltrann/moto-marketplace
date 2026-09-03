declare global {
  interface Window {
    /** Inyectado en runtime desde el layout (POSTHOG_PROJECT_TOKEN en Railway). */
    __POSTHOG_TOKEN__?: string;
  }
}

/** Token de PostHog: runtime (servidor / window) o embebido en build (NEXT_PUBLIC_*). */
export function posthogProjectToken(): string | undefined {
  if (typeof window !== 'undefined') {
    const injected = window.__POSTHOG_TOKEN__?.trim();
    if (injected) return injected;
  }

  return (
    process.env.POSTHOG_PROJECT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
    undefined
  );
}

export function posthogIngestHost(): string {
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
}

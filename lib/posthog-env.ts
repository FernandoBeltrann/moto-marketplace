/** Token público de PostHog (mismo que en el dashboard del proyecto). */
export function posthogProjectToken(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || undefined;
}

export function posthogIngestHost(): string {
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
}

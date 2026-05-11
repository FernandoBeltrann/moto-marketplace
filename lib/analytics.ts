export type AnalyticsEvent =
  | 'view_home'
  | 'view_catalog'
  | 'view_product'
  | 'use_calculator'
  | 'start_financing'
  | 'click_whatsapp'
  | 'submit_lead'
  | 'search_catalog'
  | 'filter_catalog';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('marketplace:event', { detail: { event, properties } }));
  window.fbq?.('trackCustom', event, properties);
  window.ttq?.track(event, properties);
  window.gtag?.('event', event, properties);
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim()) return;
  void import('posthog-js')
    .then(({ default: posthog }) => {
      try {
        posthog.capture(event, properties);
      } catch {
        /* no-op */
      }
    })
    .catch(() => {
      /* fetch / chunk fallido: no romper UX */
    });
}

/**
 * Analytics centralizado.
 *
 * - `track()` → PostHog, Meta Pixel, gtag (eventos legacy internos; sin cambios).
 * - `trackApplication*` → dataLayer, eventos nuevos de conversión para GTM/Ads.
 *
 * Eventos GTM ya configurados (view_motorcycle, calculator_interaction, filter_catalog)
 * viven en lib/gtm.ts — no moverlos aquí.
 */
import posthog from 'posthog-js';
import { posthogProjectToken } from '@/lib/posthog-env';

type AnalyticsEventPayload = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsEvent =
  | 'view_home'
  | 'view_catalog'
  | 'view_product'
  | 'use_calculator'
  | 'start_financing'
  | 'credit_app_start'
  | 'credit_app_step'
  | 'credit_app_buro_ok'
  | 'credit_app_phone_change'
  | 'credit_app_contact_reset'
  | 'credit_app_resolution'
  | 'credit_app_solicitud_created'
  | 'click_whatsapp'
  | 'click_purchase_portal'
  | 'click_purchase_agent'
  | 'submit_lead'
  | 'search_catalog'
  | 'filter_catalog';

declare global {
  interface Window {
    dataLayer?: AnalyticsEventPayload[];
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
    gtag?: (...args: unknown[]) => void;
  }
}

function pushEvent(event: string, payload: AnalyticsEventPayload = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  const data = { event, ...payload };
  window.dataLayer.push(data);

  if (process.env.NODE_ENV === 'development') {
    console.log('[MotoClick analytics]', data);
  }
}

export function trackApplicationStarted(params: {
  motorcycleSlug?: string;
  motorcycleBrand?: string;
  motorcycleModel?: string;
  city?: string;
}) {
  pushEvent('application_started', {
    motorcycle_slug: params.motorcycleSlug,
    motorcycle_brand: params.motorcycleBrand,
    motorcycle_model: params.motorcycleModel,
    city: params.city,
  });
}

export function trackApplicationCompleted(params: {
  leadId?: string;
  motorcycleSlug?: string;
  motorcycleBrand?: string;
  motorcycleModel?: string;
  city?: string;
  value?: number;
}) {
  pushEvent('application_completed', {
    lead_id: params.leadId,
    motorcycle_slug: params.motorcycleSlug,
    motorcycle_brand: params.motorcycleBrand,
    motorcycle_model: params.motorcycleModel,
    city: params.city,
    value: params.value ?? 1,
    currency: 'MXN',
  });
}

export function trackWhatsappClicked(params: {
  motorcycleSlug?: string;
  motorcycleBrand?: string;
  motorcycleModel?: string;
  sourcePage?: string;
  city?: string;
}) {
  pushEvent('whatsapp_clicked', {
    motorcycle_slug: params.motorcycleSlug,
    motorcycle_brand: params.motorcycleBrand,
    motorcycle_model: params.motorcycleModel,
    source_page: params.sourcePage,
    city: params.city,
  });
}

/** PostHog / Meta / gtag — sin cambios respecto al setup anterior. */
export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('marketplace:event', { detail: { event, properties } }));
  window.fbq?.('trackCustom', event, properties);
  window.ttq?.track(event, properties);
  window.gtag?.('event', event, properties);
  if (!posthogProjectToken()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* PostHog no inicializado o red bloqueada */
  }
}

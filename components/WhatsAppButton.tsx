'use client';

import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

export function WhatsAppButton({ text, motorcycleId }: { text: string; motorcycleId?: string }) {
  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
  return <a className="btn light full" href={href} target="_blank" onClick={() => track('click_whatsapp', { motorcycleId })}>Quiero ayuda por WhatsApp</a>;
}

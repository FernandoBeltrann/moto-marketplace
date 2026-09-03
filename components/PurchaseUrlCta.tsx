'use client';

import { track } from '@/lib/analytics';
import { normalizeOutboundUrl } from '@/lib/purchase-url';

type Variant = 'light' | 'green';

export function PurchaseUrlCta({
  href,
  motorcycleId,
  variant = 'light',
  children,
}: {
  href: string;
  motorcycleId?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  const url = normalizeOutboundUrl(href);
  if (!url) return null;
  const cls = variant === 'green' ? 'btn green full' : 'btn light full';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
      onClick={() =>
        track(variant === 'green' ? 'click_purchase_agent' : 'click_purchase_portal', {
          motorcycleId,
          href: url,
          variant,
        })
      }
    >
      {children}
    </a>
  );
}

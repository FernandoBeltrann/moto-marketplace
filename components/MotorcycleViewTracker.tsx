'use client';

import { useEffect, useRef } from 'react';
import { trackViewMotorcycle } from '@/lib/gtm';
import { track } from '@/lib/analytics';
import { cashPrice } from '@/lib/catalog-format';
import { metaEvent, motoContent } from '@/lib/meta/pixel';
import type { Motorcycle } from '@/types/motorcycle';

/** Dispara view_motorcycle (GTM), view_product (analytics) y ViewContent (Meta) una vez por ficha. */
export function MotorcycleViewTracker({ motorcycle }: { motorcycle: Motorcycle }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackViewMotorcycle(motorcycle);
    track('view_product', { motorcycleId: motorcycle.id, slug: motorcycle.slug });
    metaEvent('ViewContent', motoContent({ ...motorcycle, price: cashPrice(motorcycle) }));
  }, [motorcycle]);

  return null;
}

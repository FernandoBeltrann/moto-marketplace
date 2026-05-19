'use client';

import { useEffect, useRef } from 'react';
import { trackViewMotorcycle } from '@/lib/gtm';
import { track } from '@/lib/analytics';
import type { Motorcycle } from '@/types/motorcycle';

/** Dispara view_motorcycle (GTM) y view_product (analytics) una vez por ficha. */
export function MotorcycleViewTracker({ motorcycle }: { motorcycle: Motorcycle }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackViewMotorcycle(motorcycle);
    track('view_product', { motorcycleId: motorcycle.id, slug: motorcycle.slug });
  }, [motorcycle]);

  return null;
}

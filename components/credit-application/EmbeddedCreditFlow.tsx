'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { formatMXN } from '@/lib/catalog-format';
import { CreditApplicationShell } from './CreditApplicationShell';

export type EmbedMotoOption = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  name: string;
  /** Precio de contado ya resuelto (promo si aplica). */
  price: number;
  suggestedDownPayment: number;
  finvaMotorcycleId: number | null;
  purchaseUrl: string | null;
  imageUrl: string | null;
};

/**
 * Flujo embebible completo: selector de moto → calculador (cotización) →
 * wizard de solicitud. Reutiliza `CreditApplicationShell`, que ya maneja el
 * paso calculador → wizard para la moto seleccionada.
 */
export function EmbeddedCreditFlow({
  motorcycles,
  initialId = '',
}: {
  motorcycles: EmbedMotoOption[];
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId);

  const selected = useMemo(
    () => motorcycles.find((m) => m.id === selectedId) ?? null,
    [motorcycles, selectedId]
  );

  const byBrand = useMemo(() => {
    const map = new Map<string, EmbedMotoOption[]>();
    for (const m of motorcycles) {
      const arr = map.get(m.brand) ?? [];
      arr.push(m);
      map.set(m.brand, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [motorcycles]);

  if (motorcycles.length === 0) {
    return (
      <p className="small muted embed-flow__hint">
        No hay motos disponibles para mostrar en este momento.
      </p>
    );
  }

  return (
    <div className="embed-flow">
      <div className="embed-flow__picker">
        <label className="small muted" htmlFor="embed-moto-select">
          Elige tu moto
        </label>
        <select
          id="embed-moto-select"
          className="select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Selecciona una moto…</option>
          {byBrand.map(([brand, items]) => (
            <optgroup key={brand} label={brand}>
              {items.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.model} {m.year} — {formatMXN(m.price)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selected ? (
          <div className="embed-flow__selected">
            {selected.imageUrl ? (
              <Image
                src={selected.imageUrl}
                alt={selected.name}
                width={72}
                height={54}
                className="embed-flow__thumb"
              />
            ) : null}
            <div className="embed-flow__selected-meta">
              <strong>{selected.name}</strong>
              <span className="small muted">{formatMXN(selected.price)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <CreditApplicationShell
          key={selected.id}
          price={selected.price}
          suggestedDownPayment={selected.suggestedDownPayment}
          motorcycleId={selected.id}
          motorcycleSlug={selected.slug}
          motorcycleName={selected.name}
          motorcycleBrand={selected.brand}
          motorcycleModel={selected.model}
          motorcycleYear={selected.year}
          finvaMotorcycleId={selected.finvaMotorcycleId}
          purchaseUrl={selected.purchaseUrl}
          motorcycle={{
            slug: selected.slug,
            brand: selected.brand,
            model: selected.model,
            year: selected.year,
            price: selected.price,
          }}
        />
      ) : (
        <p className="small muted embed-flow__hint">
          Selecciona una moto para calcular tu mensualidad y solicitar tu crédito.
        </p>
      )}
    </div>
  );
}

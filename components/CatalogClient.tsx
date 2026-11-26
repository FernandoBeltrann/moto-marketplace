'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cashPrice } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';
import { MotorcycleCard } from './MotorcycleCard';
import { trackCatalogFilter } from '@/lib/gtm';
import { track } from '@/lib/analytics';
import { metaBrowserEvent } from '@/lib/meta/pixel';

export function CatalogClient({ motos }: { motos: Motorcycle[] }) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState(() => searchParams.get('brand') ?? '');
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('budget') ?? '');

  // FIN-151: `Search` de Meta (solo navegador) cuando deja de escribir 1 s.
  useEffect(() => {
    const text = q.trim();
    if (text.length < 3) return;
    const timer = window.setTimeout(() => metaBrowserEvent('Search', { search_string: text }), 1000);
    return () => window.clearTimeout(timer);
  }, [q]);

  const brands = Array.from(new Set(motos.map((m) => m.brand))).sort();
  const categories = Array.from(new Set(motos.map((m) => m.category))).sort();

  const filtered = useMemo(
    () =>
      motos.filter((m) => {
        const text = `${m.brand} ${m.model} ${m.year} ${m.tags.join(' ')}`.toLowerCase();
        return (
          (!q || text.includes(q.toLowerCase())) &&
          (!brand || m.brand === brand) &&
          (!category || m.category === category) &&
          (!maxPrice || cashPrice(m) <= Number(maxPrice))
        );
      }),
    [motos, q, brand, category, maxPrice]
  );

  return (
    <>
      <div className="filters">
        <input
          className="input"
          placeholder="Buscar modelo, marca o uso"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select"
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            if (e.target.value) {
              trackCatalogFilter('brand', e.target.value);
              track('filter_catalog', { filter: 'brand', value: e.target.value });
              metaBrowserEvent('Search', { search_string: `marca ${e.target.value}` });
            }
          }}
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            if (e.target.value) {
              trackCatalogFilter('category', e.target.value);
              track('filter_catalog', { filter: 'category', value: e.target.value });
              metaBrowserEvent('Search', { search_string: `uso ${e.target.value}` });
            }
          }}
        >
          <option value="">Todos los usos</option>
          {categories.map((c) => (
            <option key={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            if (e.target.value) {
              trackCatalogFilter('maxPrice', Number(e.target.value));
              track('filter_catalog', { filter: 'maxPrice', value: e.target.value });
              metaBrowserEvent('Search', { search_string: `hasta ${e.target.value}` });
            }
          }}
        >
          <option value="">Precio máximo</option>
          <option value="50000">$50,000</option>
          <option value="80000">$80,000</option>
          <option value="120000">$120,000</option>
          <option value="200000">$200,000</option>
        </select>
      </div>
      <p className="small muted">{filtered.length} motos encontradas</p>
      <div className="grid">{filtered.map((m) => <MotorcycleCard moto={m} key={m.id} />)}</div>
    </>
  );
}

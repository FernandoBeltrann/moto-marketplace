'use client';

import { useMemo, useState } from 'react';
import { Motorcycle } from '@/data/motorcycles';
import { MotorcycleCard } from './MotorcycleCard';
import { track } from '@/lib/analytics';

export function CatalogClient({ motos }: { motos: Motorcycle[] }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const brands = Array.from(new Set(motos.map((m) => m.brand))).sort();
  const categories = Array.from(new Set(motos.map((m) => m.category))).sort();

  const filtered = useMemo(() => motos.filter((m) => {
    const text = `${m.brand} ${m.model} ${m.year} ${m.tags.join(' ')}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) &&
      (!brand || m.brand === brand) &&
      (!category || m.category === category) &&
      (!maxPrice || m.price <= Number(maxPrice));
  }), [motos, q, brand, category, maxPrice]);

  return (
    <>
      <div className="filters">
        <input className="input" placeholder="Buscar modelo, marca o uso" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={brand} onChange={(e) => { setBrand(e.target.value); if (e.target.value) track('filter_catalog', { filter: 'brand', value: e.target.value }); }}>
          <option value="">Todas las marcas</option>{brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); if (e.target.value) track('filter_catalog', { filter: 'category', value: e.target.value }); }}>
          <option value="">Todos los usos</option>{categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="select" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); if (e.target.value) track('filter_catalog', { filter: 'maxPrice', value: e.target.value }); }}>
          <option value="">Precio máximo</option>
          <option value="50000">$50,000</option><option value="80000">$80,000</option><option value="120000">$120,000</option><option value="200000">$200,000</option>
        </select>
      </div>
      <p className="small muted">{filtered.length} motos encontradas</p>
      <div className="grid">{filtered.map((m) => <MotorcycleCard moto={m} key={m.id} />)}</div>
    </>
  );
}

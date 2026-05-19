'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { track } from '@/lib/analytics';

export function SearchBox({ brands }: { brands: string[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState('');
  const [budget, setBudget] = useState('');
  const [useCase, setUseCase] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    track('search_catalog', { brand, budget, useCase });
    const params = new URLSearchParams();
    if (brand) params.set('brand', brand);
    if (budget) params.set('budget', budget);
    if (useCase) params.set('category', useCase);
    const qs = params.toString();
    router.push(qs ? `/motos?${qs}` : '/motos');
  }

  return (
    <form className="search-panel" onSubmit={submit}>
      <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Marca">
        <option value="">Todas las marcas</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select className="select" value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Presupuesto">
        <option value="">Sin límite en presupuesto</option>
        <option value="50000">Hasta $50,000</option>
        <option value="80000">Hasta $80,000</option>
        <option value="120000">Hasta $120,000</option>
        <option value="200000">Hasta $200,000</option>
      </select>
      <select className="select" value={useCase} onChange={(e) => setUseCase(e.target.value)} aria-label="Uso">
        <option value="">Todos los usos</option>
        <option value="Trabajo">Trabajo</option>
        <option value="Ciudad">Ciudad</option>
        <option value="Deportiva">Deportiva</option>
        <option value="Doble propósito">Doble propósito</option>
        <option value="Scooter">Scooter</option>
      </select>
      <button type="submit" className="btn green">
        Ver motos
      </button>
    </form>
  );
}

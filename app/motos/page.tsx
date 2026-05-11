import type { Metadata } from 'next';
import { CatalogClient } from '@/components/CatalogClient';
import { getMotorcycles } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Catálogo de motos nuevas',
  description: 'Explora motos nuevas por marca, precio, uso y mensualidades estimadas. Compra ahora y recoge en tu distribuidor mas cercano.'
};

export default function CatalogPage() {
  const motos = getMotorcycles();
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Catálogo</span>
        <h1>Motos nuevas disponibles</h1>
        <p>Filtra por marca, precio o uso.</p>
        <CatalogClient motos={motos} />
      </div>
    </main>
  );
}

import type { Motorcycle } from '@/types/motorcycle';
import { MotorcycleCard } from './MotorcycleCard';

/**
 * Fallback de <Suspense> para <CatalogClient>. CatalogClient usa useSearchParams(),
 * así que en una página estática/ISR Next lo omite del HTML del server y solo
 * renderiza el fallback. Antes el fallback era "Cargando catálogo…" y Google veía
 * la página sin motos. Ahora el HTML ya trae todo el inventario (sin filtrar) con
 * sus links a las fichas; al hidratar, CatalogClient lo reemplaza con filtros.
 * Los controles se pintan deshabilitados con las mismas clases para que no salte
 * el layout cuando aparecen los reales.
 */
export function CatalogFallback({ motos }: { motos: Motorcycle[] }) {
  return (
    <>
      <div className="filters" aria-hidden="true">
        <input className="input" placeholder="Buscar modelo, marca o uso" disabled />
        <select className="select" disabled>
          <option>Todas las marcas</option>
        </select>
        <select className="select" disabled>
          <option>Todos los usos</option>
        </select>
        <select className="select" disabled>
          <option>Precio máximo</option>
        </select>
      </div>
      <p className="small muted">{motos.length} motos encontradas</p>
      <div className="grid">
        {motos.map((m) => (
          <MotorcycleCard moto={m} key={m.id} />
        ))}
      </div>
    </>
  );
}

import Link from 'next/link';
import { Motorcycle } from '@/data/motorcycles';
import { formatMXN, productPath } from '@/lib/catalog';

export function MotorcycleCard({ moto }: { moto: Motorcycle }) {
  return (
    <article className="card">
      <Link href={productPath(moto)} className="bike-visual" aria-label={`Ver ${moto.brand} ${moto.model}`}>
        <div className="bike-line" />
      </Link>
      <div className="card-body">
        <div className="small muted">{moto.brand} · {moto.year} · {moto.category}</div>
        <h3>{moto.model}</h3>
        <p>{moto.shortDescription}</p>
        <div className="tags">{moto.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="card-footer">
          <div className="price-row">
            <div>
              <span className="small muted">Desde</span>
              <strong>
                {formatMXN(moto.monthlyFrom)}
                <span className="price-suffix">/mes</span>
              </strong>
            </div>
            <div>
              <span className="small muted">Precio</span>
              <strong>{formatMXN(moto.price)}</strong>
            </div>
          </div>
          <Link className="btn full" href={productPath(moto)}>Calcular mi pago</Link>
        </div>
      </div>
    </article>
  );
}

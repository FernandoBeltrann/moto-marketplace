'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Motorcycle } from '@/types/motorcycle';
import { PrecioContado } from '@/components/PrecioContado';
import { formatMXN, productPath } from '@/lib/catalog-format';

export function MotorcycleCard({ moto }: { moto: Motorcycle }) {
  const hasPhoto = Boolean(moto.imageUrl);
  return (
    <article className="card">
      <Link
        href={productPath(moto)}
        className={'bike-visual' + (hasPhoto ? ' bike-visual--photo' : '')}
        aria-label={`Ver ${moto.brand} ${moto.model}`}
      >
        {hasPhoto && moto.imageUrl ? (
          <Image
            src={moto.imageUrl}
            alt={`${moto.brand} ${moto.model} ${moto.year}`}
            fill
            className="bike-visual__img"
            sizes="(max-width: 900px) 100vw, 360px"
          />
        ) : (
          <div className="bike-line" />
        )}
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
            <div className="price-row-price">
              <span className="small muted">Precio</span>
              <PrecioContado moto={moto} compact />
            </div>
          </div>
          <Link className="btn full" href={productPath(moto)}>Calcular mi pago</Link>
        </div>
      </div>
    </article>
  );
}

import type { MotorcycleReview } from '@/types/motorcycle-review';
import { headingTag } from '@/lib/cms/component-values';

function averageStars(reviews: MotorcycleReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
}

function Stars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="moto-reviews-stars" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? 'moto-reviews-star on' : 'moto-reviews-star'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function MotorcycleReviews({ reviews, title, titleLevel }: { reviews: MotorcycleReview[]; title?: string; titleLevel?: number }) {
  if (!reviews.length) return null;
  const avg = averageStars(reviews);
  const rounded = Math.round(avg * 10) / 10;
  const Title = headingTag(titleLevel, 2);

  return (
    <section className="moto-reviews section" data-cms-region="reviews" aria-labelledby="moto-reviews-title">
      <div className="container">
        <div className="moto-reviews-head">
          <Title id="moto-reviews-title">{title || 'Opiniones de clientes'}</Title>
          <p className="moto-reviews-summary">
            <Stars value={avg} />
            <span className="moto-reviews-score">
              <strong>{rounded}</strong> de 5 · {reviews.length}{' '}
              {reviews.length === 1 ? 'reseña' : 'reseñas'}
            </span>
          </p>
        </div>
        <ul className="moto-reviews-list">
          {reviews.map((r) => (
            <li key={r.id} className="moto-review-card">
              <div className="moto-review-card__meta">
                <Stars value={r.rating} />
                <span className="small muted">
                  {new Date(r.publishedAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {r.title ? <h3 className="moto-review-card__title">{r.title}</h3> : null}
              <p className="moto-review-card__author small muted">— {r.authorName}</p>
              <p className="moto-review-card__body">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

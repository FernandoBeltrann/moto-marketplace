import type { MotorcycleReview } from '@/types/motorcycle-review';

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

export function MotorcycleReviews({ reviews }: { reviews: MotorcycleReview[] }) {
  if (!reviews.length) return null;
  const avg = averageStars(reviews);
  const rounded = Math.round(avg * 10) / 10;

  return (
    <section className="moto-reviews section" aria-labelledby="moto-reviews-title">
      <div className="container">
        <div className="moto-reviews-head">
          <h2 id="moto-reviews-title">Opiniones de clientes</h2>
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

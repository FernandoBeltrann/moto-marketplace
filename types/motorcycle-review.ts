/** Reseña publicada en Supabase (`motorcycle_reviews`). */
export type MotorcycleReview = {
  id: string;
  motorcycleId: string;
  authorName: string;
  /** 1–5 */
  rating: number;
  title: string | null;
  body: string;
  publishedAt: string;
};

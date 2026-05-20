/** Catálogo de moto (dominio). Los valores vienen de Postgres vía `lib/catalog`. */
export type Motorcycle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  slug: string;
  price: number;
  promoPrice?: number | null;
  category: string;
  engineCc: number;
  monthlyFrom: number;
  suggestedDownPayment: number;
  availableCities: string[];
  tags: string[];
  shortDescription: string;
  bestFor: string[];
  specs: Record<string, string>;
  priorityScore: number;
  /** URL pública (p. ej. Supabase Storage). */
  imageUrl?: string | null;
  /** URLs extra para galería / futuro carrusel. */
  galleryUrls?: string[];
  /** URL externa (ej. Finva / CRM) para el CTA «Iniciar compra con un agente». */
  purchaseUrl?: string | null;
  /**
   * Precio cobrado al pagar con tarjeta (cashPrice + comisión Mercado Pago).
   * `null`/`undefined` → fallback a `cashPrice`.
   */
  cardPrice?: number | null;
  /** ID numérico de la moto en la base de datos de Finva (para `id_motorcycle`). */
  finvaMotorcycleId?: number | null;
};

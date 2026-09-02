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
  /** Fecha de última edición (columna `updated_at`). Usada para `sitemap.xml` (`lastmod`). */
  updatedAt?: string | null;
  /**
   * Respuesta directa/corta para AEO ("First Answer"). Columna `first_answer`,
   * opcional — no renderiza nada si está vacía. Requiere agregar la columna
   * (ver sql/motorcycles_add_first_answer_and_show_price.sql).
   */
  firstAnswer?: string | null;
  /**
   * Si el bloque de precio (precio de contado / mensualidad / enganche) se
   * muestra en la ficha de producto. Columna `show_price`, default `false`
   * mientras la columna no exista o no se haya definido explícitamente —
   * preserva el comportamiento actual (precio oculto) hasta que se decida
   * reactivarlo por producto desde Directus.
   */
  showPrice?: boolean;
};

export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'MotoClick',
  /** Texto del wordmark en nav y footer (ej. dominio). */
  logoText: process.env.NEXT_PUBLIC_LOGO_TEXT || 'motoclick.mx',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  /** Dígitos sin + para `wa.me`. En MX WhatsApp suele requerir 521 + 10 dígitos (móvil). */
  whatsapp: process.env.NEXT_PUBLIC_FINVA_WHATSAPP || '5215610420474',
  /** Texto visible del WhatsApp en nav u otros CTAs. */
  whatsappDisplay: '+52 56 1042 0474',
  description: 'Marketplace para encontrar motos nuevas, calcular mensualidad e iniciar compra con financiamiento.',
  /**
   * Si la moto no tiene `purchase_url` en Supabase, se usa esta URL (ej. portal Finva genérico).
   * Útil en local hasta que todas las filas tengan columna rellena.
   */
  defaultPurchaseUrl: process.env.NEXT_PUBLIC_DEFAULT_PURCHASE_URL?.trim() || null,
};

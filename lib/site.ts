export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'MotoClick',
  /** Texto del wordmark en nav y footer (ej. dominio). */
  logoText: process.env.NEXT_PUBLIC_LOGO_TEXT || 'motoclick.mx',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  whatsapp: process.env.NEXT_PUBLIC_FINVA_WHATSAPP || '5215512345678',
  description: 'Marketplace para encontrar motos nuevas, calcular mensualidad e iniciar compra con financiamiento gestionado por Finva.'
};

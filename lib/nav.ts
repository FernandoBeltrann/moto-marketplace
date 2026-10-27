import { site } from '@/lib/site';

/** Enlaces del header. Los usan el nav de escritorio (layout) y el menú móvil (MobileNavMenu). */
export const NAV_LINKS = [
  { href: '/motos', label: 'Motos' },
  { href: '/motos-a-credito', label: 'Motos a crédito' },
  { href: '/blog', label: 'Blog' },
  { href: '/asi-funciona-comprar-tu-moto-a-credito-con-motoclick', label: 'Cómo funciona' },
] as const;

/** CTA de WhatsApp del header. */
export const NAV_WHATSAPP_HREF = `https://wa.me/${site.whatsapp}?text=Hola%2C%20quiero%20comprar%20una%20moto`;

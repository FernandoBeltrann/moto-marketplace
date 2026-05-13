import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { NavComoFuncionaLink } from '@/components/NavComoFuncionaLink';
import { MetaPixel } from '@/components/MetaPixel';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Motos nuevas a crédito`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, type: 'website', url: site.url },
  /** URLs absolutas estables (public/) para que Google pueda indexar el favicon en resultados. */
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <MetaPixel />
        <nav className="nav">
          <div className="container nav-inner">
            <Link className="logo" href="/">{site.logoText}</Link>
            <div className="nav-links">
              <Link href="/motos">Motos</Link>
              <Link href="/motos-a-credito">Motos a crédito</Link>
              <NavComoFuncionaLink />
              <a
                className="btn green"
                href={`https://wa.me/${site.whatsapp}?text=Hola%2C%20quiero%20comprar%20una%20moto`}
                target="_blank"
                rel="noopener noreferrer"
                title={site.whatsappDisplay}
                aria-label={`WhatsApp ${site.whatsappDisplay}`}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </nav>
        {children}
        <footer className="footer">
          <div className="container two-col">
            <div>
              <div className="logo">{site.logoText}</div>
              <p>Marketplace de motos con financiamiento.</p>
            </div>
            <div>
              <p className="small">
                Las mensualidades son estimadas y pueden cambiar según precio final, enganche, plazo, perfil crediticio, disponibilidad, financiera y condiciones vigentes.
              </p>
              <p className="small" style={{ marginTop: 12 }}>
                <Link href="/envio-garantia">Envío y garantía</Link>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

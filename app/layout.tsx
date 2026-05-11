import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Motos nuevas a crédito`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, type: 'website', url: site.url },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <nav className="nav">
          <div className="container nav-inner">
            <Link className="logo" href="/">{site.logoText}</Link>
            <div className="nav-links">
              <Link href="/motos">Motos</Link>
              <Link href="/motos-a-credito">Motos a crédito</Link>
              <a href="#como-funciona">Cómo funciona</a>
              <a className="btn green" href={`https://wa.me/${site.whatsapp}?text=Hola%2C%20quiero%20comprar%20una%20moto`} target="_blank">WhatsApp</a>
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
              <p className="small">Las mensualidades son estimadas y pueden cambiar según precio final, enganche, plazo, perfil crediticio, disponibilidad, financiera y condiciones vigentes.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

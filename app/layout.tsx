import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Link from 'next/link';
import { NavComoFuncionaLink } from '@/components/NavComoFuncionaLink';
import { GoogleTag } from '@/components/GoogleTag';
import { GoogleTagManager } from '@/components/GoogleTagManager';
import { MetaPixel } from '@/components/MetaPixel';
import { PostHogInit } from '@/components/PostHogInit';
import { site } from '@/lib/site';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/organization-jsonld';

const posthogToken =
  process.env.POSTHOG_PROJECT_TOKEN?.trim() ||
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
  '';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Motos nuevas a crédito`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.description,
    type: 'website',
    url: site.url,
    // Imagen por defecto cuando una página no define la suya (ej. home, motos-a-credito,
    // envio-garantia) — antes no había ninguna, así que WhatsApp/Facebook mostraban la
    // tarjeta sin imagen. Product y BlogPosting siguen usando su propia foto real.
    images: [{ url: site.logoPath }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
    images: [site.logoPath],
  },
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
  const organizationJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();
  return (
    <html lang="es-MX">
      <body>
        {posthogToken ? (
          <Script
            id="posthog-token"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.__POSTHOG_TOKEN__=${JSON.stringify(posthogToken)};`,
            }}
          />
        ) : null}
        <PostHogInit />
        <GoogleTagManager />
        <GoogleTag />
        <MetaPixel />
        <nav className="nav">
          <div className="container nav-inner">
            <Link className="logo" href="/">{site.logoText}</Link>
            <div className="nav-links">
              <Link href="/motos">Motos</Link>
              <Link href="/motos-a-credito">Motos a crédito</Link>
              <Link href="/blog">Blog</Link>
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
                {' · '}
                <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
              </p>
            </div>
          </div>
        </footer>
        {/*
          A propósito al final de <body>, no justo después de la etiqueta de
          apertura: posthog-js (y en general los snippets clásicos de GTM/GA/
          Meta Pixel) insertan sus <script> dinámicos como primer hijo de
          <body> (`body.insertBefore(script, body.firstChild)`). Si estos dos
          <script type="application/ld+json"> son los primeros hijos de body,
          quedan en la posición exacta donde un tag manager inserta su script
          — cualquier re-render posterior de este árbol (ej. Fast Refresh en
          dev, o una navegación que vuelva a reconciliar el layout) encuentra
          ese slot ocupado por un <script src="https://...posthog..."> en vez
          del <script type="application/ld+json"> esperado, y React lo marca
          como error de hidratación. Un <script type="application/ld+json">
          es válido en cualquier posición del documento para SEO/schema.org,
          así que moverlo al final evita la colisión sin ningún costo.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}

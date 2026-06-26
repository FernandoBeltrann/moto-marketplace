import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout para las páginas pensadas para incrustarse en un iframe. Oculta el
 * chrome global del sitio (nav + footer, definidos en el layout raíz) para que
 * el contenedor solo muestre el flujo de la solicitud.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: '.nav,.footer{display:none!important;}body{background:transparent!important;}',
        }}
      />
      {children}
    </>
  );
}

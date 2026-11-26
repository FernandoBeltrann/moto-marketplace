import Script from 'next/script';
import { MetaPixelEvents } from '@/components/MetaPixelEvents';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

/**
 * Meta (Facebook) Pixel. Sin env no renderiza nada.
 *
 * FIN-151: el pixel ya no manda `PageView` solo al cambiar la URL
 * (`disablePushState`): sin `eventID` no se puede deduplicar con la copia por
 * servidor. `MetaPixelEvents` lo dispara en cada ruta con su `eventID`.
 */
export function MetaPixel() {
  if (!PIXEL_ID) return null;

  const bootstrap = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState=true;
fbq('init','${PIXEL_ID}');
`.trim();

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <MetaPixelEvents />
      <noscript>
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(PIXEL_ID)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

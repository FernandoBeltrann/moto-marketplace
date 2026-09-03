import Script from 'next/script';

const GOOGLE_TAG_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || process.env.NEXT_PUBLIC_GA_ID?.trim();

/** Google tag (gtag.js) para Google Ads / Analytics. Sin env no renderiza nada. */
export function GoogleTag() {
  if (!GOOGLE_TAG_ID) return null;

  const bootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');
`.trim();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_TAG_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
    </>
  );
}

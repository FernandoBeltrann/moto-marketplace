import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

const BINDING_KEY = 'static:envio-garantia';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  return {
    title: override?.title || 'Envío y garantía',
    description: override?.description || 'Políticas de envío en Ciudad de México y zona metropolitana, resto de la República, y garantías según marca.',
    alternates: { canonical: `${site.url.replace(/\/$/, '')}/envio-garantia` },
  };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function EnvioGarantiaPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const { doc: override, isPreview } = await getCmsOverrideForRequest(BINDING_KEY, sp.cmsPreview === '1');
  const overrideHtml = override ? renderDocHtml(override) : null;
  return (
    <main className="section">
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      {overrideHtml ? (
        <div className="container cms-page-body" style={{ maxWidth: 720 }} dangerouslySetInnerHTML={{ __html: overrideHtml }} />
      ) : (
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="small muted" style={{ marginBottom: 12 }}>
          <Link href="/">Inicio</Link>
          {' · '}
          <Link href="/motos">Motos</Link>
        </p>
        <h1 style={{ marginTop: 0 }}>Envío y garantía</h1>
        <p>
          Esta página resume cómo trabajamos el envío y qué ocurre con garantías y devoluciones. Los datos
          estructurados de cada moto enlazan aquí para que coincida con lo que ves en el sitio.
        </p>

        <nav aria-label="Índice" className="small muted" style={{ marginBottom: 24 }}>
          <Link href="#envio">Envío</Link>
          {' · '}
          <Link href="#garantia">Garantía y devoluciones</Link>
        </nav>

        <h2 id="envio">Envío</h2>
        <p>
          <strong>Ciudad de México y área metropolitana:</strong> envío sin costo para la entrega de la moto
          en las condiciones acordadas al cerrar la compra.
        </p>
        <p>
          <strong>Resto de la República:</strong> por defecto la unidad se recoge en tienda o punto acordado.
          En algunos casos se puede cotizar envío a otro estado, sujeto a disponibilidad logística, costo y
          tiempos que se confirman por escrito antes de pagar.
        </p>

        <h2 id="garantia">Garantía y devoluciones</h2>
        <p>
          Las motos nuevas se rigen por la <strong>garantía de fabricante</strong> de cada marca. Los plazos,
          exclusiones y procedimientos (incluido el contacto con red de servicio autorizado) están en la{' '}
          <strong>póliza o manual de garantía</strong> que aplica a tu modelo, no en un plazo único fijado por
          este marketplace.
        </p>
        <p>
          Cualquier gestión de inconformidad, garantía o servicio posventa se canaliza según esas políticas de
          marca y la normativa aplicable en México. Si compraste con nosotros y tienes dudas, escríbenos por{' '}
          <Link href={`https://wa.me/${site.whatsapp}`}>WhatsApp</Link> indicando marca, modelo y folio o
          contrato cuando lo tengas.
        </p>

        <p className="small muted" style={{ marginTop: 40 }}>
          El aviso de privacidad que aplica al tratamiento de tus datos personales ahora vive en su propia
          página: <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>.
        </p>
      </div>
      )}
    </main>
  );
}

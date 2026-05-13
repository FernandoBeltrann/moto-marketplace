import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Envío y garantía',
  description:
    'Políticas de envío en Ciudad de México y zona metropolitana, resto de la República, y garantías según marca y póliza de cada motocicleta.',
  alternates: { canonical: `${site.url.replace(/\/$/, '')}/envio-garantia` },
};

export default function EnvioGarantiaPage() {
  return (
    <main className="section">
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
      </div>
    </main>
  );
}

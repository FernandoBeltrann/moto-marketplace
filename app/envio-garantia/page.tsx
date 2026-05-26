import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Envío, garantía y aviso de privacidad',
  description:
    'Políticas de envío en Ciudad de México y zona metropolitana, resto de la República, garantías según marca y aviso de privacidad de Finvatecapp SA de CV (Finva).',
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
        <h1 style={{ marginTop: 0 }}>Envío, garantía y aviso de privacidad</h1>
        <p>
          Esta página resume cómo trabajamos el envío, qué ocurre con garantías y devoluciones y cuál es el
          aviso de privacidad que aplica al tratamiento de tus datos personales. Los datos estructurados de
          cada moto enlazan aquí para que coincida con lo que ves en el sitio.
        </p>

        <nav aria-label="Índice" className="small muted" style={{ marginBottom: 24 }}>
          <Link href="#envio">Envío</Link>
          {' · '}
          <Link href="#garantia">Garantía y devoluciones</Link>
          {' · '}
          <Link href="#aviso-privacidad">Aviso de privacidad</Link>
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

        <h2 id="aviso-privacidad" style={{ marginTop: 40 }}>
          Aviso de privacidad
        </h2>

        <h3>Responsable del tratamiento de sus datos personales</h3>
        <p>
          <strong>Finvatecapp SA de CV (Finva)</strong> con domicilio en Blvd. Manuel Ávila Camacho 1920,
          C.P. 53100, Estado de México, es responsable de la recolección y tratamiento de sus datos
          personales conforme a lo estipulado en la <em>Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares</em>.
        </p>

        <h3>Finalidades del tratamiento de los datos personales</h3>
        <p>
          Los datos personales que nos proporcione a través de este formulario serán utilizados para las
          siguientes finalidades:
        </p>
        <ul>
          <li>
            Elaborar un perfil crediticio que nos permita ofrecerle productos financieros ajustados a sus
            necesidades y capacidad de pago.
          </li>
          <li>Evaluar y determinar su elegibilidad para la aprobación de crédito.</li>
          <li>
            Utilizar la información obtenida para el análisis y mejoramiento continuo de nuestros servicios,
            con el fin de optimizar las ofertas de crédito para usted y otros clientes futuros.
          </li>
          <li>
            Cumplir con obligaciones derivadas de cualquier relación jurídica que establezca con Finvatecapp
            SA de CV (Finva).
          </li>
        </ul>

        <h3>Datos personales que serán recabados</h3>
        <p>
          Para las finalidades señaladas en el presente aviso de privacidad, podríamos recabar los siguientes
          datos personales:
        </p>
        <ul>
          <li>Datos de identificación (nombre, dirección, teléfono, correo electrónico, etc.).</li>
          <li>Datos financieros y patrimoniales (ingresos, deudas, historial crediticio, etc.).</li>
          <li>Otros datos que sean necesarios para realizar el perfilamiento crediticio.</li>
        </ul>

        <h3>Transferencia de datos personales</h3>
        <p>
          Sus datos personales no serán transferidos a terceros, salvo en los casos previstos por la ley o
          cuando sea necesario para cumplir con las finalidades descritas en este aviso de privacidad.
        </p>

        <h3>Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h3>
        <p>
          Usted tiene derecho a acceder, rectificar, cancelar u oponerse al tratamiento de sus datos
          personales en cualquier momento, enviando una solicitud a{' '}
          <Link href="mailto:fernando@finva-app.com">fernando@finva-app.com</Link>.
        </p>

        <h3>Modificaciones al aviso de privacidad</h3>
        <p>
          Este aviso de privacidad puede ser modificado, cambiado o actualizado derivado de nuevos
          requerimientos legales o de nuestras propias necesidades por los productos o servicios que
          ofrecemos. Cualquier modificación será publicada o comunicada a través de los medios de contacto
          proporcionados.
        </p>

        <h3>Contacto</h3>
        <p>
          Si tiene alguna duda o desea ejercer alguno de sus derechos, por favor comuníquese con nosotros a{' '}
          <Link href="mailto:fernando@finva-app.com">fernando@finva-app.com</Link>.
        </p>
        <p className="small muted">
          También puede hacer valer sus derechos ante la autoridad:{' '}
          <Link
            href="https://www.gob.mx/buengobierno"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.gob.mx/buengobierno
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

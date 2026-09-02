import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

const BINDING_KEY = 'static:aviso-de-privacidad';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  return {
    title: override?.title || 'Aviso de privacidad',
    description: override?.description || 'Aviso de privacidad de Finvatecapp S.A. de C.V. (Finva): datos personales que recaba, finalidades, transferencias, derechos ARCO y contacto.',
    alternates: { canonical: `${site.url.replace(/\/$/, '')}/aviso-de-privacidad` },
  };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function AvisoDePrivacidadPage({ searchParams }: Props) {
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
          {' · '}
          <Link href="/envio-garantia">Envío y garantía</Link>
        </p>
        <h1 style={{ marginTop: 0 }}>Aviso de privacidad</h1>
        <p className="small muted" style={{ marginBottom: 24 }}>
          Última actualización: 18/06/2026
        </p>

        <nav aria-label="Índice" className="small muted" style={{ marginBottom: 24 }}>
          <Link href="#responsable">Responsable</Link>
          {' · '}
          <Link href="#datos-recabados">Datos recabados</Link>
          {' · '}
          <Link href="#finalidades-primarias">Finalidades</Link>
          {' · '}
          <Link href="#transferencias">Transferencias</Link>
          {' · '}
          <Link href="#arco">Derechos ARCO</Link>
          {' · '}
          <Link href="#cookies">Cookies</Link>
          {' · '}
          <Link href="#contacto">Contacto</Link>
        </nav>

        <h2 id="responsable">Responsable del tratamiento</h2>
        <p>
          <strong>Finvatecapp S.A. de C.V.</strong> ("Finva"), con domicilio en Blvd. Manuel Ávila Camacho
          1920, Naucalpan de Juárez, Estado de México, C.P. 53100, es responsable de la recolección y
          tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP), su Reglamento y demás disposiciones aplicables.
        </p>

        <h2 id="datos-recabados">Datos personales que se recaban</h2>
        <ul>
          <li>Datos de identificación (nombre, domicilio, teléfono, correo electrónico, RFC/CURP).</li>
          <li>Datos financieros y patrimoniales (ingresos, deudas, historial crediticio).</li>
          <li>Otros datos necesarios para el perfilamiento crediticio.</li>
        </ul>

        <h2 id="finalidades-primarias">Finalidades primarias (necesarias para la relación jurídica)</h2>
        <ul>
          <li>Elaborar su perfil crediticio.</li>
          <li>Evaluar y determinar su elegibilidad para la aprobación de crédito.</li>
          <li>
            Consultar su historial crediticio ante las Sociedades de Información Crediticia, previa
            autorización expresa.
          </li>
          <li>Cumplir las obligaciones derivadas de la relación jurídica con Finva.</li>
        </ul>

        <h2>Finalidades secundarias (no necesarias; usted puede negarse sin afectar el servicio)</h2>
        <ul>
          <li>Análisis y mejora continua de nuestros servicios y ofertas.</li>
        </ul>
        <p className="small muted">
          Si no desea que sus datos se traten para las finalidades secundarias, puede manifestarlo enviando
          un correo a{' '}
          <Link href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</Link> en
          un plazo de cinco días hábiles. La negativa no será motivo para negarle los servicios.
        </p>

        <h2 id="transferencias">Transferencias de datos</h2>
        <p>
          Para evaluar su solicitud, sus datos serán transferidos a las{' '}
          <strong>Sociedades de Información Crediticia</strong> (Buró de Crédito / Círculo de Crédito) con el
          fin de consultar y reportar su historial crediticio, previa autorización expresa. Salvo esta
          transferencia y las previstas en el artículo 37 de la LFPDPPP (que no requieren su consentimiento),
          sus datos no serán transferidos a terceros sin su autorización.
        </p>

        <h2 id="arco">Derechos ARCO</h2>
        <p>
          Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos
          (derechos ARCO). Para ejercerlos, envíe una solicitud a{' '}
          <Link href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</Link> que
          contenga: (i) su nombre y medio para recibir respuesta; (ii) documento que acredite su identidad o
          representación legal; (iii) descripción clara de los datos respecto de los que ejerce el derecho; y
          (iv) cualquier elemento que facilite la localización de los datos. Finva responderá en un plazo
          máximo de 20 días hábiles.
        </p>

        <h2>Revocación del consentimiento</h2>
        <p>
          Usted puede revocar en cualquier momento el consentimiento otorgado para el tratamiento de sus
          datos, en la medida en que la ley lo permita, mediante solicitud al mismo buzón. La revocación
          podría implicar la imposibilidad de continuar con la prestación del servicio.
        </p>

        <h2 id="cookies">Uso de cookies y tecnologías de rastreo</h2>
        <p>
          Nuestro sitio y aplicaciones pueden utilizar cookies y tecnologías similares para mejorar la
          experiencia del usuario. Usted puede deshabilitarlas desde la configuración de su navegador.
        </p>

        <h2>Modificaciones al aviso de privacidad</h2>
        <p>
          Este aviso puede modificarse derivado de nuevos requerimientos legales o de nuestras necesidades.
          Cualquier modificación se publicará en esta página o se comunicará por los medios de contacto
          proporcionados.
        </p>

        <h2>Autoridad garante</h2>
        <p>
          Si considera que su derecho a la protección de datos ha sido vulnerado, puede acudir ante la
          autoridad competente en materia de protección de datos personales. Verifique en{' '}
          <Link href="https://www.gob.mx/conapo" target="_blank" rel="noopener noreferrer">
            https://www.gob.mx/conapo
          </Link>{' '}
          el organismo garante en funciones al momento de su solicitud.
        </p>

        <h2 id="contacto">Contacto</h2>
        <p>
          Para dudas o para ejercer sus derechos:{' '}
          <Link href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</Link>.
        </p>

        <p className="small muted" style={{ marginTop: 24 }}>
          Fecha de última actualización: 18/06/2026
        </p>
      </div>
      )}
    </main>
  );
}

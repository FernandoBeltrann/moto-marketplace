/**
 * Todas las páginas REALES del marketplace que el CMS puede controlar
 * (bindables): cada moto, cada post de blog, y las páginas estáticas
 * (home, listados, legales). Fuente única para "Importar existente"
 * (lib/cms/existing.ts) y para el Mapa del sitio interactivo
 * (lib/cms/site-map.ts) — así ambos flujos ven exactamente las mismas
 * páginas y las mismas bindingKey/urlPath.
 *
 * bindingKey es la llave que las páginas reales usan para buscar su
 * override (ver lib/cms/overrides.ts) — moto:<id>, blog:<id>, static:<key>.
 */
import { getBlogPostsAny } from '@/lib/blog';
import { getMotorcycles, cashPrice, productPath } from '@/lib/catalog';
import { blogPostPath } from '@/lib/blog';
import type { CmsSchemaMeta } from '@/types/cms';

export type BindablePage = {
  bindingKey: string;
  bindingKind: 'moto' | 'blog' | 'static';
  label: string;
  urlPath: string;
  schemaType: CmsSchemaMeta['type'];
  /** HTML semilla al importar por primera vez (contenido real actual). */
  importHtml: string;
  description?: string;
  /** Sugerencia de título para el doc del CMS. */
  title: string;
};

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const STATIC_PAGES: Omit<BindablePage, 'importHtml'>[] = [
  {
    bindingKey: 'static:home',
    bindingKind: 'static',
    label: 'Inicio',
    urlPath: '/',
    schemaType: 'WebPage',
    title: 'Encuentra tu moto y calcula cuánto pagarías al mes.',
    description: 'Sección adicional al final del home (el hero y el buscador siguen siendo funcionales, no bloques).',
  },
  {
    bindingKey: 'static:motos',
    bindingKind: 'static',
    label: 'Catálogo de motos (listado)',
    urlPath: '/motos',
    schemaType: 'WebPage',
    title: 'Catálogo de motos nuevas',
    description: 'Encabezado del listado — el grid de motos abajo sigue siendo el catálogo en vivo.',
  },
  {
    bindingKey: 'static:motos-a-credito',
    bindingKind: 'static',
    label: 'Motos a crédito (listado)',
    urlPath: '/motos-a-credito',
    schemaType: 'WebPage',
    title: 'Motos a crédito',
    description: 'Hero del listado de financiamiento — el grid de modelos abajo sigue siendo en vivo.',
  },
  {
    bindingKey: 'static:aviso-de-privacidad',
    bindingKind: 'static',
    label: 'Aviso de privacidad',
    urlPath: '/aviso-de-privacidad',
    schemaType: 'WebPage',
    title: 'Aviso de privacidad',
    description: 'Contenido legal completo — página estática, sin partes dinámicas.',
  },
  {
    bindingKey: 'static:envio-garantia',
    bindingKind: 'static',
    label: 'Envío y garantía',
    urlPath: '/envio-garantia',
    schemaType: 'WebPage',
    title: 'Envío y garantía',
    description: 'Contenido legal/operativo completo — página estática, sin partes dinámicas.',
  },
];

const AVISO_PRIVACIDAD_HTML = `<p><a href="/">Inicio</a> · <a href="/motos">Motos</a> · <a href="/envio-garantia">Envío y garantía</a></p>
<h1>Aviso de privacidad</h1>
<p>Última actualización: 18/06/2026</p>
<p><a href="#responsable">Responsable</a> · <a href="#datos-recabados">Datos recabados</a> · <a href="#finalidades-primarias">Finalidades</a> · <a href="#transferencias">Transferencias</a> · <a href="#arco">Derechos ARCO</a> · <a href="#cookies">Cookies</a> · <a href="#contacto">Contacto</a></p>
<h2 id="responsable">Responsable del tratamiento</h2>
<p><strong>Finvatecapp S.A. de C.V.</strong> ("Finva"), con domicilio en Blvd. Manuel Ávila Camacho 1920, Naucalpan de Juárez, Estado de México, C.P. 53100, es responsable de la recolección y tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y demás disposiciones aplicables.</p>
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
<li>Consultar su historial crediticio ante las Sociedades de Información Crediticia, previa autorización expresa.</li>
<li>Cumplir las obligaciones derivadas de la relación jurídica con Finva.</li>
</ul>
<h2>Finalidades secundarias (no necesarias; usted puede negarse sin afectar el servicio)</h2>
<ul>
<li>Análisis y mejora continua de nuestros servicios y ofertas.</li>
</ul>
<p>Si no desea que sus datos se traten para las finalidades secundarias, puede manifestarlo enviando un correo a <a href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</a> en un plazo de cinco días hábiles. La negativa no será motivo para negarle los servicios.</p>
<h2 id="transferencias">Transferencias de datos</h2>
<p>Para evaluar su solicitud, sus datos serán transferidos a las <strong>Sociedades de Información Crediticia</strong> (Buró de Crédito / Círculo de Crédito) con el fin de consultar y reportar su historial crediticio, previa autorización expresa. Salvo esta transferencia y las previstas en el artículo 37 de la LFPDPPP (que no requieren su consentimiento), sus datos no serán transferidos a terceros sin su autorización.</p>
<h2 id="arco">Derechos ARCO</h2>
<p>Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos (derechos ARCO). Para ejercerlos, envíe una solicitud a <a href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</a> que contenga: (i) su nombre y medio para recibir respuesta; (ii) documento que acredite su identidad o representación legal; (iii) descripción clara de los datos respecto de los que ejerce el derecho; y (iv) cualquier elemento que facilite la localización de los datos. Finva responderá en un plazo máximo de 20 días hábiles.</p>
<h2>Revocación del consentimiento</h2>
<p>Usted puede revocar en cualquier momento el consentimiento otorgado para el tratamiento de sus datos, en la medida en que la ley lo permita, mediante solicitud al mismo buzón. La revocación podría implicar la imposibilidad de continuar con la prestación del servicio.</p>
<h2 id="cookies">Uso de cookies y tecnologías de rastreo</h2>
<p>Nuestro sitio y aplicaciones pueden utilizar cookies y tecnologías similares para mejorar la experiencia del usuario. Usted puede deshabilitarlas desde la configuración de su navegador.</p>
<h2>Modificaciones al aviso de privacidad</h2>
<p>Este aviso puede modificarse derivado de nuevos requerimientos legales o de nuestras necesidades. Cualquier modificación se publicará en esta página o se comunicará por los medios de contacto proporcionados.</p>
<h2>Autoridad garante</h2>
<p>Si considera que su derecho a la protección de datos ha sido vulnerado, puede acudir ante la autoridad competente en materia de protección de datos personales. Verifique en <a href="https://www.gob.mx/conapo" target="_blank" rel="noopener noreferrer">https://www.gob.mx/conapo</a> el organismo garante en funciones al momento de su solicitud.</p>
<h2 id="contacto">Contacto</h2>
<p>Para dudas o para ejercer sus derechos: <a href="mailto:finva-notifications@finva-app.com">finva-notifications@finva-app.com</a>.</p>
<p>Fecha de última actualización: 18/06/2026</p>`;

const ENVIO_GARANTIA_HTML = `<p><a href="/">Inicio</a> · <a href="/motos">Motos</a></p>
<h1>Envío y garantía</h1>
<p>Esta página resume cómo trabajamos el envío y qué ocurre con garantías y devoluciones. Los datos estructurados de cada moto enlazan aquí para que coincida con lo que ves en el sitio.</p>
<p><a href="#envio">Envío</a> · <a href="#garantia">Garantía y devoluciones</a></p>
<h2 id="envio">Envío</h2>
<p><strong>Ciudad de México y área metropolitana:</strong> envío sin costo para la entrega de la moto en las condiciones acordadas al cerrar la compra.</p>
<p><strong>Resto de la República:</strong> por defecto la unidad se recoge en tienda o punto acordado. En algunos casos se puede cotizar envío a otro estado, sujeto a disponibilidad logística, costo y tiempos que se confirman por escrito antes de pagar.</p>
<h2 id="garantia">Garantía y devoluciones</h2>
<p>Las motos nuevas se rigen por la <strong>garantía de fabricante</strong> de cada marca. Los plazos, exclusiones y procedimientos (incluido el contacto con red de servicio autorizado) están en la <strong>póliza o manual de garantía</strong> que aplica a tu modelo, no en un plazo único fijado por este marketplace.</p>
<p>Cualquier gestión de inconformidad, garantía o servicio posventa se canaliza según esas políticas de marca y la normativa aplicable en México. Si compraste con nosotros y tienes dudas, escríbenos por WhatsApp indicando marca, modelo y folio o contrato cuando lo tengas.</p>
<p>El aviso de privacidad que aplica al tratamiento de tus datos personales ahora vive en su propia página: <a href="/aviso-de-privacidad">Aviso de privacidad</a>.</p>`;

const STATIC_IMPORT_HTML: Record<string, string> = {
  'static:home':
    '<h2>Por qué elegir MotoClick</h2><p>Cuéntales a tus clientes qué te hace diferente — esta sección aparece al final del home.</p>',
  'static:motos':
    '<span>Catálogo</span><h1>Motos nuevas disponibles</h1><p>Filtra por marca, precio o uso.</p>',
  'static:motos-a-credito':
    '<span>Motos a crédito</span><h1>Compra tu moto en mensualidades.</h1><p>Compara opciones, calcula un pago estimado y empieza tu proceso.</p>',
  // El contenido real vigente hoy en la página (app/aviso-de-privacidad y
  // app/envio-garantia) — antes esto era un placeholder y "Importar
  // existente" abría un doc casi vacío en vez del texto legal real.
  'static:aviso-de-privacidad': AVISO_PRIVACIDAD_HTML,
  'static:envio-garantia': ENVIO_GARANTIA_HTML,
};

export async function getBindablePages(): Promise<BindablePage[]> {
  const out: BindablePage[] = [];

  for (const s of STATIC_PAGES) {
    out.push({ ...s, importHtml: STATIC_IMPORT_HTML[s.bindingKey] ?? `<h1>${esc(s.title)}</h1>` });
  }

  try {
    const motos = await getMotorcycles();
    for (const m of motos) {
      const price = Number(cashPrice(m));
      const img = m.imageUrl ? `<img src="${esc(m.imageUrl)}" alt="${esc(m.brand + ' ' + m.model)}"/>` : '';
      out.push({
        bindingKey: `moto:${m.id}`,
        bindingKind: 'moto',
        label: `${m.brand} ${m.model} ${m.year}`,
        urlPath: productPath(m),
        schemaType: 'Article',
        title: `${m.brand} ${m.model} ${m.year}`,
        description: m.shortDescription || undefined,
        importHtml:
          (m.shortDescription ? `<p>${esc(m.shortDescription)}</p>` : '') +
          img +
          (price ? `<p>Precio desde $${price.toLocaleString('es-MX')} MXN.</p>` : ''),
      });
    }
  } catch {
    /* catálogo no disponible: se omite */
  }

  try {
    const posts = await getBlogPostsAny();
    for (const p of posts) {
      out.push({
        bindingKey: `blog:${p.id}`,
        bindingKind: 'blog',
        label: p.title,
        urlPath: blogPostPath(p),
        schemaType: 'Article',
        title: p.title,
        description: p.excerpt || undefined,
        importHtml:
          (p.excerpt ? `<p>${esc(p.excerpt)}</p>` : '') +
          (p.coverImageUrl ? `<img src="${esc(p.coverImageUrl)}" alt="${esc(p.title)}"/>` : '') +
          (p.body || ''),
      });
    }
  } catch {
    /* blog no disponible: se omite */
  }

  return out;
}

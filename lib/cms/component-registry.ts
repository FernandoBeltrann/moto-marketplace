/**
 * Registro de COMPONENTES editables por marketing — distinto de los bloques
 * de contenido (`types/cms.ts` -> `CmsBlock`), que se insertan/reordenan
 * libremente. Un componente registrado aquí es una pieza de código real
 * (ej. `<MotorcycleReviews>`) que YA vive en la página; el CMS solo expone
 * un subconjunto de sus props de copy/presentación como campos editables —
 * nunca su lógica (cálculos, checkout, envío de formularios).
 *
 * Cómo agregar un componente nuevo a este sistema (3 pasos):
 *   1. Aquí: agrega su entrada (id, label, fields) bajo el/los binding(s)
 *      donde aparece.
 *   2. En el componente real: acepta las props nuevas con un default igual
 *      al valor actual hardcodeado, y envuelve la región que edita con
 *      `data-cms-region="<id>"` (así el Studio puede resaltarla en la
 *      vista previa en vivo).
 *   3. En la página real (app/.../page.tsx): lee
 *      `override?.componentConfig?.<id>?.<field>` y pásalo como prop.
 *
 * El id de cada componente = la llave en `componentConfig` del doc = el
 * valor del atributo `data-cms-region` en el DOM real.
 */
import type { CmsBindingKind } from '@/types/cms';

export type CmsFieldType = 'text' | 'textarea' | 'number' | 'tags' | 'keyvalue' | 'heading';

export type CmsComponentField = {
  key: string;
  label: string;
  type: CmsFieldType;
  placeholder?: string;
  help?: string;
  /**
   * Solo para type: 'heading'. El texto se guarda en `key`; el nivel
   * (1/2/3, ej. <h2>/<h3>) se guarda aparte en `${key}Level` — así el HTML
   * real queda semánticamente correcto y configurable, no siempre <h2>.
   */
  defaultLevel?: 1 | 2 | 3;
  allowedLevels?: Array<1 | 2 | 3>;
};

export type CmsComponentDef = {
  /** = llave en doc.componentConfig = valor de data-cms-region en el DOM real. */
  id: string;
  label: string;
  /** Dónde vive esta región dentro de la página, en palabras simples. */
  where: string;
  fields: CmsComponentField[];
};

/**
 * Componentes editables por bindingKind genérico (aplica a TODAS las
 * páginas de ese tipo, ej. cualquier moto).
 */
const BY_KIND: Partial<Record<CmsBindingKind, CmsComponentDef[]>> = {
  moto: [
    {
      id: 'productHeader',
      label: 'Encabezado de la ficha (columna derecha)',
      where: 'Arriba del botón de compra: la etiqueta de categoría y la frase destacada bajo el título.',
      fields: [
        {
          key: 'category',
          label: 'Etiqueta de categoría (eyebrow)',
          type: 'text',
          placeholder: '(usa la categoría cargada desde Directus)',
          help: 'Vacío = se usa la categoría de Directus tal cual.',
        },
        {
          key: 'firstAnswer',
          label: 'Frase destacada bajo el título',
          type: 'text',
          placeholder: '(usa la frase cargada desde Directus)',
          help: 'Vacío = se usa el valor de Directus tal cual.',
        },
      ],
    },
    {
      id: 'productHighlights',
      label: '"¿Para quién es buena?" + Ficha rápida',
      where: 'Columna izquierda, debajo de la foto principal.',
      fields: [
        {
          key: 'heading',
          label: 'Título de esta sección',
          type: 'heading',
          placeholder: '¿Para quién es buena?',
          defaultLevel: 2,
          allowedLevels: [2, 3],
        },
        {
          key: 'bestFor',
          label: 'Etiquetas ("¿Para quién es buena?")',
          type: 'tags',
          placeholder: 'Delivery, Trabajo diario, Bajo presupuesto',
          help: 'Sepáralas con comas. Vacío = usa las etiquetas de Directus.',
        },
        {
          key: 'shortDescription',
          label: 'Descripción corta',
          type: 'textarea',
          placeholder: '(usa la descripción cargada desde Directus)',
          help: 'Vacío = se usa el valor de Directus tal cual.',
        },
        {
          key: 'specsHeading',
          label: 'Título de la ficha rápida',
          type: 'heading',
          placeholder: 'Ficha rápida',
          defaultLevel: 3,
          allowedLevels: [2, 3],
        },
        {
          key: 'specs',
          label: 'Ficha rápida (specs)',
          type: 'keyvalue',
          placeholder: 'Uso: Trabajo\nMotor: 144.8 cc',
          help: 'Una spec por línea, formato "Clave: Valor". Vacío = usa las specs de Directus.',
        },
      ],
    },
    {
      id: 'reviews',
      label: 'Sección de reseñas',
      where: 'Debajo de la ficha técnica, antes del pie de página.',
      fields: [
        {
          key: 'title',
          label: 'Título de la sección',
          type: 'heading',
          placeholder: 'Opiniones de clientes',
          defaultLevel: 2,
          allowedLevels: [2, 3],
        },
      ],
    },
  ],
};

/**
 * Componentes editables por bindingKey EXACTA (solo aplica a esa página
 * puntual, ej. solo /motos).
 */
const BY_KEY: Record<string, CmsComponentDef[]> = {
  'static:motos': [
    {
      id: 'catalogEmptyState',
      label: 'Catálogo — mensaje sin resultados',
      where: 'Debajo de los filtros, cuando una búsqueda no encuentra motos.',
      fields: [
        {
          key: 'message',
          label: 'Mensaje cuando no hay resultados',
          type: 'textarea',
          placeholder: 'No encontramos motos con esos filtros. Prueba ajustando tu búsqueda.',
        },
      ],
    },
  ],
};

/** Componentes editables aplicables a una página dada (por kind + key). */
export function getComponentDefsFor(bindingKind: CmsBindingKind, bindingKey: string | null): CmsComponentDef[] {
  const byKind = BY_KIND[bindingKind] || [];
  const byKey = (bindingKey && BY_KEY[bindingKey]) || [];
  return [...byKind, ...byKey];
}

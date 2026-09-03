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

export type CmsFieldType = 'text' | 'textarea' | 'number';

export type CmsComponentField = {
  key: string;
  label: string;
  type: CmsFieldType;
  placeholder?: string;
  help?: string;
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
      id: 'reviews',
      label: 'Sección de reseñas',
      where: 'Debajo de la ficha técnica, antes del pie de página.',
      fields: [
        {
          key: 'title',
          label: 'Título de la sección',
          type: 'text',
          placeholder: 'Opiniones de clientes',
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

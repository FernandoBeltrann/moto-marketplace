/**
 * Registro de SECCIONES movibles de una página con layout fijo — separado a
 * propósito de `component-registry.ts` (que registra CAMPOS de copy dentro de
 * un componente). Esto registra los bloques de más alto nivel de la página
 * (el hero, el grid de destacados, "cómo funciona"…) para que marketing pueda
 * reordenarlos desde el Studio (pestaña "Diseño") arrastrando o con
 * flechas — sin tocar CSS ni código.
 *
 * v1, a propósito simple: reordenar nada más (mover secciones enteras hacia
 * arriba/abajo en una sola columna). No hay grid 2D (columnas/filas) ni
 * mover piezas sueltas dentro de una sección — si eso hiciera falta después,
 * este archivo es el único lugar que habría que tocar para ampliarlo.
 *
 * Cómo agregar layout movible a una página nueva (2 pasos):
 *   1. Aquí: agrega su entrada en BY_KEY con la lista de secciones, en el
 *      orden en que hoy aparecen en código.
 *   2. En la página real: arma un objeto { [id]: <JSX de esa sección> } y
 *      renderízalo iterando `resolveSectionOrder(bindingKey, override?.sectionOrder)`
 *      en vez de la lista fija de JSX (ver app/page.tsx).
 * El Studio ya sabe mostrar la pestaña "Diseño" solo cuando la página
 * actual tiene secciones registradas aquí — no hace falta tocarlo aparte.
 */

export type LayoutSection = {
  /** Id estable — llave que se guarda en `doc.sectionOrder` y en el objeto de secciones de la página real. */
  id: string;
  label: string;
  /** Dónde/qué es, en palabras simples — mismo espíritu que `where` en component-registry.ts. */
  where: string;
};

const BY_KEY: Record<string, LayoutSection[]> = {
  'static:home': [
    { id: 'hero', label: 'Hero', where: 'Arriba del todo: etiqueta, título, buscador y el carrusel de motos a la derecha.' },
    { id: 'featured', label: 'Motos destacadas', where: 'Título "Motos destacadas", botón "Ver catálogo" y el grid de motos.' },
    { id: 'como-funciona', label: 'Cómo funciona', where: 'Los 4 pasos y el botón "Ver motos a crédito".' },
    { id: 'cms-extra', label: 'Sección extra (CMS)', where: 'El contenido libre que agregues al final en la pestaña Constructor. No aparece si no has escrito nada ahí.' },
  ],
};

/** Secciones registradas para una página (por bindingKey exacta) — [] si esa página no tiene layout movible. */
export function getLayoutSectionsFor(bindingKey: string | null): LayoutSection[] {
  return (bindingKey && BY_KEY[bindingKey]) || [];
}

/**
 * Orden final a usar al renderizar/editar: si no hay `saved` (o quedó vacío),
 * el orden por defecto (el de arriba, que es como se ve hoy en código).
 * Si hay `saved`, se descartan ids que ya no existen y se agregan al final
 * los ids nuevos que `saved` no contemplaba (ej. si se registra una sección
 * nueva después de que marketing ya guardó un orden) — así nunca desaparece
 * una sección por un doc viejo.
 */
export function resolveSectionOrder(bindingKey: string | null, saved: string[] | undefined): string[] {
  const defaultOrder = getLayoutSectionsFor(bindingKey).map((s) => s.id);
  if (!saved || !saved.length) return defaultOrder;
  const known = new Set(defaultOrder);
  const cleaned = saved.filter((id) => known.has(id));
  for (const id of defaultOrder) if (!cleaned.includes(id)) cleaned.push(id);
  return cleaned;
}

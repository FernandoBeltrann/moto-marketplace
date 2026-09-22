/**
 * Valores REALES actuales para pre-llenar los campos de componentes en el
 * Studio (ver `lib/cms/component-registry.ts`), para que marketing vea qué
 * es lo que está a punto de cambiar en vez de encontrar el campo vacío.
 *
 * Importante: esto SOLO alimenta la vista del Studio (input pre-llenado,
 * nunca escrito en `componentConfig` hasta que la persona edite algo). El
 * fallback real en cada página sigue siendo "vacío en componentConfig -> se
 * usa el dato de Directus/código", exactamente igual que antes — pre-llenar
 * no cambia esa regla, solo la hace visible antes de tocar nada.
 */
import { getMotorcycles } from '@/lib/catalog';
import { serializeTags, serializeKeyValue, serializeLines } from '@/lib/cms/component-values';
import type { CmsBindingKind } from '@/types/cms';

const CATALOG_EMPTY_STATE_DEFAULT = 'No encontramos motos con esos filtros. Prueba ajustando tu búsqueda.';

/**
 * Copy fijo actual del home (app/page.tsx) — única fuente para pre-llenar el
 * Studio Y para el fallback real en la página cuando marketing no ha editado
 * nada, así nunca quedan desincronizados.
 */
export const HOME_DEFAULTS = {
  eyebrow: 'Motos nuevas + financiamiento powered by Finva',
  featuredHeading: 'Motos destacadas',
  featuredSubtitle: 'Ordenadas por intención comercial: disponibilidad, precio, financiamiento y conversión esperada.',
  featuredCta: 'Ver catálogo',
  comoHeading: 'Cómo funciona',
  comoSteps: [
    'Encuentra tu moto.',
    'Calcula enganche y mensualidad estimada.',
    'WhatsApp e intención de compra.',
    'Finva continúa evaluación, documentos, aprobación y cierre.',
  ],
  comoCta: 'Ver motos a crédito',
} as const;

export async function getComponentDefaults(
  bindingKind: CmsBindingKind,
  bindingKey: string | null
): Promise<Record<string, Record<string, string | number>>> {
  if (bindingKind === 'moto' && bindingKey?.startsWith('moto:')) {
    const id = bindingKey.slice('moto:'.length);
    const motos = await getMotorcycles().catch(() => []);
    const moto = motos.find((m) => m.id === id);
    if (!moto) return {};
    return {
      productHeader: {
        category: moto.category || '',
        firstAnswer: moto.firstAnswer || '',
      },
      productHighlights: {
        bestFor: serializeTags(moto.bestFor || []),
        shortDescription: moto.shortDescription || '',
        specs: serializeKeyValue(moto.specs || {}),
        heading: '¿Para quién es buena?',
        headingLevel: 2,
        specsHeading: 'Ficha rápida',
        specsHeadingLevel: 3,
      },
      reviews: {
        title: 'Opiniones de clientes',
        titleLevel: 2,
      },
    };
  }
  if (bindingKey === 'static:motos') {
    return {
      catalogEmptyState: { message: CATALOG_EMPTY_STATE_DEFAULT },
    };
  }
  if (bindingKey === 'static:home') {
    return {
      homeHero: { eyebrow: HOME_DEFAULTS.eyebrow },
      homeFeatured: {
        heading: HOME_DEFAULTS.featuredHeading,
        subtitle: HOME_DEFAULTS.featuredSubtitle,
        ctaLabel: HOME_DEFAULTS.featuredCta,
      },
      homeComoFunciona: {
        heading: HOME_DEFAULTS.comoHeading,
        steps: serializeLines([...HOME_DEFAULTS.comoSteps]),
        ctaLabel: HOME_DEFAULTS.comoCta,
      },
    };
  }
  return {};
}

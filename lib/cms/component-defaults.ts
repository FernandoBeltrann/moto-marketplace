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
import { serializeTags, serializeKeyValue } from '@/lib/cms/component-values';
import type { CmsBindingKind } from '@/types/cms';

const CATALOG_EMPTY_STATE_DEFAULT = 'No encontramos motos con esos filtros. Prueba ajustando tu búsqueda.';

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
  return {};
}

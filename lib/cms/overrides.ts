/**
 * Puente entre las páginas REALES del marketplace (motos, blog, estáticas)
 * y el CMS: cada página real llama a `getCmsOverride(bindingKey)` para saber
 * si marketing tiene un override PUBLICADO para ella, y opcionalmente
 * `getCmsPreviewOverride` para previsualizar el DRAFT sin publicar (solo si
 * quien pide la página tiene sesión válida del Studio — ver lib/cms/auth.ts).
 *
 * bindingKey (ver types/cms.ts): 'moto:<id>' | 'blog:<id>' | 'static:home' |
 * 'static:motos' | 'static:motos-a-credito' | 'static:aviso-de-privacidad' |
 * 'static:envio-garantia'.
 */
import { cookies } from 'next/headers';
import { getPageByBindingKey, getPageById } from '@/lib/cms/pages';
import { verifyCmsAccessToken, CMS_ACCESS_COOKIE } from '@/lib/cms/auth';
import type { CmsPageDoc } from '@/types/cms';

/** true si quien hace la request tiene una sesión válida del Studio (cookie de acceso vigente). */
export async function hasCmsSession(): Promise<boolean> {
  const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
  const user = token ? await verifyCmsAccessToken(token) : null;
  return Boolean(user);
}

/** Override PUBLICADO para una página real, o null si marketing no la ha tocado. */
export async function getCmsOverride(bindingKey: string): Promise<CmsPageDoc | null> {
  const page = await getPageByBindingKey(bindingKey);
  if (!page || page.status !== 'published' || !page.publishedDoc) return null;
  return page.publishedDoc;
}

export type CmsPreview = { doc: CmsPageDoc; isDraft: true } | null;

/**
 * Si la request trae `?cmsPreview=1` Y quien la hace tiene sesión válida del
 * Studio, devuelve el DRAFT (sin publicar) para que pueda ver cómo quedaría
 * antes de publicar. Cualquier otro visitante recibe siempre el override
 * PUBLICADO (o null) — nunca un borrador sin revisar.
 */
export async function getCmsOverrideForRequest(
  bindingKey: string,
  wantsPreview: boolean
): Promise<{ doc: CmsPageDoc | null; isPreview: boolean }> {
  if (wantsPreview) {
    const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
    const user = token ? await verifyCmsAccessToken(token) : null;
    if (user) {
      const page = await getPageByBindingKey(bindingKey);
      if (page) return { doc: page.draftDoc, isPreview: true };
    }
  }
  const published = await getCmsOverride(bindingKey);
  return { doc: published, isPreview: false };
}

/**
 * Preview del DRAFT por pageId (páginas standalone, sin bindingKey) — solo
 * si quien pide la página tiene sesión válida del Studio. Úsalo desde el
 * catch-all de páginas standalone; las páginas bound (moto/blog/estáticas)
 * usan getCmsOverrideForRequest con su bindingKey en su lugar.
 */
export async function getCmsPreviewDocForPage(pageId: string): Promise<CmsPageDoc | null> {
  const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
  const user = token ? await verifyCmsAccessToken(token) : null;
  if (!user) return null;
  const page = await getPageById(pageId);
  return page?.draftDoc ?? null;
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { publishPage } from '@/lib/cms/pages';
import { publishBlogPostIfDraft, syncBlogPostMeta } from '@/lib/blog';
import { verifyCmsAccessToken, CMS_ACCESS_COOKIE } from '@/lib/cms/auth';

export const runtime = 'nodejs';

/**
 * POST /api/cms/pages/:id/publish — despliegue semimanual: copia el
 * borrador revisado a published_doc y revalida la ruta pública (ISR).
 * "Push a prod" sin deploy de código: para páginas standalone es su
 * urlPath (antes fijo en /p/[slug], ahora configurable); para páginas con
 * binding (moto/blog/estática) es la URL REAL que ya existía en el
 * sitio — así el cambio se refleja ahí mismo, no en una copia aparte.
 *
 * Solo 'admin' puede publicar — el Studio no tiene entorno de staging
 * aparte, así que un borrador guardado por marketing (rol 'editor') ya
 * vive en la misma base de producción, pero SOLO publicar lo empuja al
 * sitio público real. Mientras el equipo de marketing prueba el Studio,
 * esto evita que alguien le dé "Publicar" por accidente y rompa algo en
 * vivo — guardar borradores sigue funcionando normal para ambos roles.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
    const caller = token ? await verifyCmsAccessToken(token) : null;
    if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    if (caller.role !== 'admin') {
      return NextResponse.json({ error: 'Solo un admin puede publicar. Guarda tu borrador y avísale a un admin.' }, { status: 403 });
    }

    const { id } = await params;
    const page = await publishPage(id);
    if (!page) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    // Un post de blog creado desde "+ Nuevo artículo" nace en borrador
    // (published: false) — al publicar la página CMS por primera vez, el
    // post real también pasa a publicado (nunca al revés: si ya estaba
    // publicado, esto no hace nada).
    if (page.bindingKind === 'blog' && page.bindingKey) {
      const postId = page.bindingKey.slice('blog:'.length);
      await publishBlogPostIfDraft(postId).catch(() => {});
      // El listado público de /blog (BlogPostCard) lee blog_posts.title
      // directo, sin pasar por el override del CMS — hay que mantenerlo al
      // día en cada publicación, no solo en la primera.
      await syncBlogPostMeta(postId, page.title, page.publishedDoc?.description).catch(() => {});
    }
    revalidatePath(page.urlPath);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

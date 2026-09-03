import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getBlogPostBySlugAny, getBlogPosts, blogPostPath, blogPostDate } from '@/lib/blog';
import { buildBlogPostingJsonLd } from '@/lib/blog-jsonld';
import { absoluteAssetUrl } from '@/lib/product-jsonld';
import { site } from '@/lib/site';
import { getCmsOverrideForRequest, hasCmsSession } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Artículo no encontrado' };
  const { doc: override } = await getCmsOverrideForRequest(`blog:${post.id}`, false);
  const title = override?.title || post.title;
  const description = override?.description || post.excerpt || site.description;
  const ogImage = override?.ogImageUrl || (post.coverImageUrl ? absoluteAssetUrl(post.coverImageUrl) : undefined);
  return {
    title,
    description,
    alternates: { canonical: `${site.url}${blogPostPath(post)}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${site.url}${blogPostPath(post)}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

type PageProps = Props & { searchParams: Promise<{ cmsPreview?: string }> };

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const wantsPreview = sp.cmsPreview === '1';
  let post = await getBlogPostBySlug(slug);
  // Un artículo recién creado desde "+ nuevo artículo" nace sin publicar
  // (ver lib/blog.ts::createBlogPostDraft) — sin este fallback, su vista
  // previa del borrador daba 404 porque el post real todavía no existía
  // para efectos públicos. Solo se busca sin filtro de publicado si hay
  // sesión válida del Studio, para no exponer borradores adivinando el slug.
  if (!post && wantsPreview && (await hasCmsSession())) {
    post = await getBlogPostBySlugAny(slug);
  }
  if (!post) notFound();

  const jsonLd = buildBlogPostingJsonLd(post);
  const dateLabel = formatPostDate(blogPostDate(post));
  const { doc: override, isPreview } = await getCmsOverrideForRequest(`blog:${post.id}`, wantsPreview);
  // El body del post ya es HTML (Directus). Un override del CMS lo reemplaza
  // por completo — es el mismo tipo de contenido, solo con otro editor.
  const title = override?.title || post.title;
  const bodyHtml = override ? renderDocHtml(override) : post.body;

  return (
    <main className="section">
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container" style={{ maxWidth: 760 }}>
        <Link href="/blog" className="small muted">
          ← Volver al blog
        </Link>
        <span className="eyebrow" style={{ marginTop: 18 }}>
          Blog
        </span>
        <h1>{title}</h1>
        <div className="small muted" style={{ marginBottom: 18 }}>
          {post.author ? `${post.author}` : 'MotoClick'}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </div>
        {post.coverImageUrl ? (
          <div
            className="bike-visual bike-visual--photo"
            style={{ borderRadius: 24, height: 340, marginBottom: 26 }}
          >
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              className="bike-visual__img"
              sizes="(max-width: 900px) 100vw, 760px"
              priority
            />
          </div>
        ) : null}
        {/*
          `post.body` es HTML del editor WYSIWYG de Directus, escrito solo
          por editores con acceso al panel (no input de usuarios públicos) —
          igual de confiable que cualquier otro campo de cms_marketplace que
          ya se renderiza en el sitio.
        */}
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
    </main>
  );
}

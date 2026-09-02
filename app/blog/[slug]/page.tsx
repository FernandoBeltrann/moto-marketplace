import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getBlogPosts, blogPostPath, blogPostDate } from '@/lib/blog';
import { buildBlogPostingJsonLd } from '@/lib/blog-jsonld';
import { absoluteAssetUrl } from '@/lib/product-jsonld';
import { site } from '@/lib/site';

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
  const description = post.excerpt || site.description;
  const images = post.coverImageUrl ? [{ url: absoluteAssetUrl(post.coverImageUrl) }] : undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `${site.url}${blogPostPath(post)}` },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `${site.url}${blogPostPath(post)}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.coverImageUrl ? [absoluteAssetUrl(post.coverImageUrl)] : undefined,
    },
  };
}

function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = buildBlogPostingJsonLd(post);
  const dateLabel = formatPostDate(blogPostDate(post));

  return (
    <main className="section">
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
        <h1>{post.title}</h1>
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
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.body }} />
      </div>
    </main>
  );
}

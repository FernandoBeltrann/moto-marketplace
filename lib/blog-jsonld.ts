import type { BlogPost } from '@/types/blog';
import { blogPostPath, blogPostDate } from '@/lib/blog';
import { absoluteAssetUrl } from '@/lib/product-jsonld';
import { site } from '@/lib/site';

const CONTEXT = 'https://schema.org';

/**
 * Schema.org BlogPosting para cada artículo — uno de los puntos de AEO que
 * pidió marketing. Sigue el mismo patrón que `product-jsonld.ts`: se
 * construye por página, no una sola vez en el layout.
 */
export function buildBlogPostingJsonLd(post: BlogPost): Record<string, unknown> {
  const base = site.url.replace(/\/$/, '');
  const url = `${base}${blogPostPath(post)}`;
  const dateIso = blogPostDate(post);

  const node: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: post.title,
    url,
    mainEntityOfPage: url,
    datePublished: dateIso,
    dateModified: post.updatedAt || dateIso,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: { '@type': 'ImageObject', url: `${base}/favicon.png` },
    },
  };

  if (post.author) {
    node.author = { '@type': 'Person', name: post.author };
  }
  if (post.excerpt) {
    node.description = post.excerpt;
  }
  if (post.coverImageUrl) {
    node.image = [absoluteAssetUrl(post.coverImageUrl)];
  }

  return node;
}

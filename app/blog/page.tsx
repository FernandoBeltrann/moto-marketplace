import type { Metadata } from 'next';
import { BlogPostCard } from '@/components/BlogPostCard';
import { getBlogPosts } from '@/lib/blog';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guías y noticias sobre motos, financiamiento y cómo comprar tu moto con MotoClick.',
};

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Blog</span>
        <h1>Guías y noticias de MotoClick</h1>
        <p>Consejos para elegir moto, financiamiento y todo lo que necesitas saber antes de comprar.</p>
        {posts.length === 0 ? (
          <p className="small muted">Todavía no hay artículos publicados. Vuelve pronto.</p>
        ) : (
          <div className="grid">
            {posts.map((post) => (
              <BlogPostCard post={post} key={post.id} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

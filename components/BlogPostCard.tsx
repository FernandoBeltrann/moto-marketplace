import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types/blog';
import { blogPostPath, blogPostDate } from '@/lib/blog';

function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function BlogPostCard({ post }: { post: BlogPost }) {
  const hasPhoto = Boolean(post.coverImageUrl);
  const dateLabel = formatPostDate(blogPostDate(post));
  return (
    <article className="card">
      <Link
        href={blogPostPath(post)}
        className={'bike-visual' + (hasPhoto ? ' bike-visual--photo' : '')}
        aria-label={`Leer ${post.title}`}
      >
        {hasPhoto && post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="bike-visual__img"
            sizes="(max-width: 900px) 100vw, 360px"
          />
        ) : (
          <div className="bike-line" />
        )}
      </Link>
      <div className="card-body">
        <div className="small muted">
          {post.author ? `${post.author}` : 'MotoClick'}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </div>
        <h3>{post.title}</h3>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
        <div className="card-footer">
          <Link className="btn light full" href={blogPostPath(post)}>
            Leer artículo
          </Link>
        </div>
      </div>
    </article>
  );
}

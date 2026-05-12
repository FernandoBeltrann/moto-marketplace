'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { productPath } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';

const ROTATE_MS = 5500;

type Props = { slides: Motorcycle[] };

export function HeroMotoRotator({ slides }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="bike-visual" style={{ borderRadius: 24 }} aria-hidden>
        <div className="bike-line" />
      </div>
    );
  }

  const m = slides[index];

  return (
    <Link
      href={productPath(m)}
      className="bike-visual bike-visual--photo hero-moto-rotator"
      style={{ borderRadius: 24 }}
      aria-label={`Ver ${m.brand} ${m.model}`}
    >
      <Image
        key={m.id}
        src={m.imageUrl!}
        alt={`${m.brand} ${m.model} ${m.year}`}
        fill
        className="bike-visual__img hero-moto-rotator__img"
        sizes="(max-width: 900px) 100vw, 400px"
        priority={index === 0}
      />
      {slides.length > 1 ? (
        <span className="hero-moto-rotator__sr" aria-live="polite">
          {m.brand} {m.model}
        </span>
      ) : null}
    </Link>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { productPath } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';

const ROTATE_MS = 5500;

type Props = {
  slides: Motorcycle[];
  /** Si se define, la imagen enlaza aquí (p. ej. "/asi-funciona-…") en vez de a la ficha de la moto. */
  href?: string;
  /** aria-label del enlace cuando se usa `href` personalizado. */
  linkLabel?: string;
  /**
   * `false` = solo muestra las fotos (sin <Link>), para meter el carrusel dentro de
   * otro elemento interactivo, p. ej. el <button> de VideoModalCard. Default: true.
   */
  interactive?: boolean;
};

export function HeroMotoRotator({ slides, href, linkLabel, interactive = true }: Props) {
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
      <span className="bike-visual" style={{ borderRadius: 24 }} aria-hidden>
        <span className="bike-line" />
      </span>
    );
  }

  const m = slides[index];

  const image = (
    <Image
      key={m.id}
      src={m.imageUrl!}
      alt={`${m.brand} ${m.model} ${m.year}`}
      fill
      className="bike-visual__img hero-moto-rotator__img"
      sizes="(max-width: 900px) 100vw, 400px"
      priority={index === 0}
    />
  );
  const liveLabel =
    slides.length > 1 ? (
      <span className="hero-moto-rotator__sr" aria-live="polite">
        {m.brand} {m.model}
      </span>
    ) : null;

  // Mismas clases que la versión con enlace → mismo tamaño y misma imagen (no afecta LCP/CLS).
  if (!interactive) {
    return (
      <span className="bike-visual bike-visual--photo hero-moto-rotator" style={{ borderRadius: 24 }}>
        {image}
        {liveLabel}
      </span>
    );
  }

  return (
    <Link
      href={href ?? productPath(m)}
      className="bike-visual bike-visual--photo hero-moto-rotator"
      style={{ borderRadius: 24 }}
      aria-label={href ? (linkLabel ?? `Ver ${m.brand} ${m.model}`) : `Ver ${m.brand} ${m.model}`}
    >
      {image}
      {liveLabel}
    </Link>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = {
  /** Portada + galería, ya sin duplicados ni vacíos. */
  images: string[];
  alt: string;
};

const HERO_SIZES = "(max-width: 900px) 100vw, 560px";

/**
 * Foto principal de la ficha + galería (`galleryUrls`).
 *
 * - Una sola foto: mismo HTML que antes (sin carrusel, puntos ni flechas).
 * - Varias fotos: carrusel con CSS scroll-snap. En celular se desliza con el
 *   dedo; en computadora hay flechas, miniaturas y teclado (← → Inicio Fin).
 *   La foto activa, el contador y las miniaturas se mantienen sincronizados.
 *
 * La caja mide lo mismo con una o con varias fotos (430 px de alto), así que
 * no hay saltos de layout. Solo la primera foto lleva `priority` (LCP); las
 * demás cargan con lazy load.
 */
export function MotorcycleGallery({ images, alt }: Props) {
  if (images.length === 0) {
    return (
      <div className="bike-visual" style={{ borderRadius: 32, height: 430, marginTop: 18 }}>
        <div className="bike-line" />
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div
        className="bike-visual bike-visual--photo bike-visual--photo-hero"
        style={{ borderRadius: 32, height: 430, marginTop: 18 }}
      >
        <Image src={images[0]} alt={alt} fill className="bike-visual__img" sizes={HERO_SIZES} priority />
      </div>
    );
  }

  return <GalleryCarousel images={images} alt={alt} />;
}

function photoAlt(alt: string, index: number, total: number) {
  return index === 0 ? alt : `${alt} — foto ${index + 1} de ${total}`;
}

function GalleryCarousel({ images, alt }: Props) {
  const total = images.length;
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Mientras un scroll programático va hacia una foto, ignoramos las fotos
  // intermedias que cruzan la vista para que el contador no "parpadee".
  const pendingTarget = useRef<number | null>(null);

  // Sincroniza la foto activa con lo que el usuario ve al deslizar.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(index)) continue;
          if (pendingTarget.current !== null) {
            if (index !== pendingTarget.current) continue;
            pendingTarget.current = null;
          }
          setActive(index);
        }
      },
      { root: track, threshold: [0.6] }
    );
    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    const clearPending = () => {
      pendingTarget.current = null;
    };
    // Si el usuario toma el control a medio camino, manda lo que él ve.
    track.addEventListener("pointerdown", clearPending);
    track.addEventListener("wheel", clearPending, { passive: true });
    track.addEventListener("scrollend", clearPending);
    return () => {
      observer.disconnect();
      track.removeEventListener("pointerdown", clearPending);
      track.removeEventListener("wheel", clearPending);
      track.removeEventListener("scrollend", clearPending);
    };
  }, [total]);

  // Mantiene la miniatura activa a la vista (solo dentro de la tira, sin mover la página).
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = thumbRefs.current[active];
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: smoothOrAuto() });
  }, [active]);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const next = Math.min(Math.max(index, 0), total - 1);
      if (!track) return;
      pendingTarget.current = next;
      setActive(next);
      track.scrollTo({ left: next * track.clientWidth, behavior: smoothOrAuto() });
      // Respaldo para navegadores sin `scrollend`.
      window.setTimeout(() => {
        if (pendingTarget.current === next) pendingTarget.current = null;
      }, 900);
    },
    [total]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: total - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    goTo(keys[event.key]);
  };

  return (
    <div className="moto-gallery">
      <div
        className="moto-gallery__viewport"
        role="region"
        aria-roledescription="carrusel"
        aria-label={`Fotos de ${alt}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="moto-gallery__track" ref={trackRef}>
          {images.map((src, i) => (
            <div
              key={src}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="moto-gallery__slide"
              data-index={i}
              role="group"
              aria-roledescription="foto"
              aria-label={`Foto ${i + 1} de ${total}`}
            >
              <div className="moto-gallery__media">
                <Image
                  src={src}
                  alt={photoAlt(alt, i, total)}
                  fill
                  className="bike-visual__img"
                  sizes={HERO_SIZES}
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="moto-gallery__arrow moto-gallery__arrow--prev"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Foto anterior"
        >
          <span aria-hidden>‹</span>
        </button>
        <button
          type="button"
          className="moto-gallery__arrow moto-gallery__arrow--next"
          onClick={() => goTo(active + 1)}
          disabled={active === total - 1}
          aria-label="Foto siguiente"
        >
          <span aria-hidden>›</span>
        </button>

        <p className="moto-gallery__counter" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Foto </span>
          {active + 1}
          <span aria-hidden> / </span>
          <span className="sr-only"> de </span>
          {total}
        </p>
      </div>

      <div className="moto-gallery__dots" aria-hidden>
        {images.map((src, i) => (
          <span key={src} className={"moto-gallery__dot" + (i === active ? " is-active" : "")} />
        ))}
      </div>

      <div className="moto-gallery__thumbs" ref={thumbsRef} role="list" aria-label="Miniaturas de la galería">
        {images.map((src, i) => (
          <button
            key={src}
            ref={(el) => {
              thumbRefs.current[i] = el;
            }}
            type="button"
            role="listitem"
            className={"moto-gallery__thumb" + (i === active ? " is-active" : "")}
            onClick={() => goTo(i)}
            aria-label={`Ver foto ${i + 1} de ${total}`}
            aria-current={i === active}
          >
            <Image src={src} alt="" fill className="bike-visual__img" sizes="88px" />
          </button>
        ))}
      </div>
    </div>
  );
}

function smoothOrAuto(): ScrollBehavior {
  if (typeof window === "undefined" || !window.matchMedia) return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

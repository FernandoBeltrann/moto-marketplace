"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  /** Portada + galería, ya sin duplicados ni vacíos. */
  images: string[];
  alt: string;
};

/**
 * Foto principal de la ficha + tira de miniaturas con `galleryUrls`.
 * Con una sola imagen se ve igual que antes (sin miniaturas).
 */
export function MotorcycleGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return (
      <div className="bike-visual" style={{ borderRadius: 32, height: 430, marginTop: 18 }}>
        <div className="bike-line" />
      </div>
    );
  }

  return (
    <div>
      <div
        className="bike-visual bike-visual--photo bike-visual--photo-hero"
        style={{ borderRadius: 32, height: 430, marginTop: 18 }}
      >
        <Image
          key={current}
          src={current}
          alt={active === 0 ? alt : `${alt} — foto ${active + 1}`}
          fill
          className="bike-visual__img"
          sizes="(max-width: 900px) 100vw, 560px"
          priority={active === 0}
        />
      </div>

      {images.length > 1 ? (
        <div className="moto-gallery__thumbs" role="list" aria-label="Galería de fotos">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="listitem"
              className={"moto-gallery__thumb" + (i === active ? " is-active" : "")}
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1} de ${images.length}`}
              aria-current={i === active}
            >
              <Image src={src} alt="" fill className="bike-visual__img" sizes="88px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

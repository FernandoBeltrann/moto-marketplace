'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FinvaCheckoutModal } from '@/components/FinvaCheckoutModal';
import { site } from '@/lib/site';

/** Datos mínimos de cada moto que necesita el modal de Finva (el server los arma desde el catálogo). */
export type ApplyCreditMoto = {
  id: string;
  brand: string;
  model: string;
  year: number;
  slug: string;
  price: number;
  suggestedDownPayment: number;
  finvaMotorcycleId: number | null;
  purchaseUrl: string | null;
  imageUrl: string | null;
};

/**
 * CTA "Aplica tu crédito ahora" de la página Así funciona. La solicitud de Finva
 * necesita saber qué moto se financia (precio, enganche, id de Finva), y esta
 * página no tiene una moto elegida, así que el botón despliega dos selectores (marca y luego modelo, A-Z) y,
 * al elegir marca y moto, muestra el mismo modal de Finva que usa "Cómprala ya".
 */
export function ApplyCreditCta({ motos }: { motos: ApplyCreditMoto[] }) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState('');
  const [motoId, setMotoId] = useState('');
  const panelId = useId();
  const brandSelectId = useId();
  const motoSelectId = useId();

  // Marcas y modelos ordenados de la A a la Z (locale es, ignora mayúsculas y acentos).
  const brands = useMemo(
    () => [...new Set(motos.map((m) => m.brand))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    [motos],
  );
  const brandMotos = useMemo(
    () =>
      motos
        .filter((m) => m.brand === brand)
        .sort((a, b) => a.model.localeCompare(b.model, 'es', { sensitivity: 'base', numeric: true }) || a.year - b.year),
    [motos, brand],
  );
  const moto = brandMotos.find((m) => m.id === motoId);

  // Carrusel en miniatura: sigue al filtro de marca y se centra en la moto elegida.
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!motoId) return;
    const el = trackRef.current?.querySelector<HTMLElement>(`[data-moto-id="${CSS.escape(motoId)}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [motoId]);
  const scrollTrack = (dir: -1 | 1) =>
    trackRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

  return (
    <>
      <button
        type="button"
        className="btn green"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Aplica tu crédito ahora
      </button>

      <div id={panelId} className="apply-cta__panel" hidden={!open}>
        <label className="apply-cta__label" htmlFor={brandSelectId}>
          1. Elige la marca
        </label>
        <select
          id={brandSelectId}
          className="select"
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            setMotoId('');
          }}
        >
          <option value="" disabled>
            Marca
          </option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <label className="apply-cta__label" htmlFor={motoSelectId}>
          2. Elige la moto
        </label>
        <select
          id={motoSelectId}
          className="select"
          value={motoId}
          disabled={!brand}
          onChange={(e) => setMotoId(e.target.value)}
        >
          <option value="" disabled>
            {brand ? 'Modelo' : 'Primero elige una marca'}
          </option>
          {brandMotos.map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.model} ${m.year}`.trim()}
            </option>
          ))}
        </select>

        {brand ? (
          <div className="apply-cta__carousel">
            <button
              type="button"
              className="apply-cta__arrow"
              aria-label="Ver motos anteriores"
              onClick={() => scrollTrack(-1)}
            >
              ‹
            </button>
            <div className="apply-cta__track" ref={trackRef}>
              {brandMotos.map((m) => {
                const selected = m.id === motoId;
                const label = `${m.model} ${m.year}`.trim();
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-moto-id={m.id}
                    className={'apply-cta__thumb' + (selected ? ' apply-cta__thumb--selected' : '')}
                    aria-pressed={selected}
                    onClick={() => setMotoId(m.id)}
                  >
                    <span className="apply-cta__thumb-img">
                      {m.imageUrl ? (
                        <Image src={m.imageUrl} alt="" fill sizes="110px" className="apply-cta__thumb-photo" />
                      ) : (
                        <span aria-hidden="true">🏍️</span>
                      )}
                    </span>
                    <span className="apply-cta__thumb-name">{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="apply-cta__arrow"
              aria-label="Ver más motos"
              onClick={() => scrollTrack(1)}
            >
              ›
            </button>
          </div>
        ) : null}

        {moto ? (
          // key: el modal de Finva crea su instancia una sola vez; al cambiar de moto se remonta.
          <FinvaCheckoutModal
            key={moto.id}
            price={moto.price}
            suggestedDownPayment={moto.suggestedDownPayment}
            motorcycle={{
              id: moto.id,
              brand: moto.brand,
              model: moto.model,
              year: moto.year,
              slug: moto.slug,
              name: `${moto.brand} ${moto.model} ${moto.year}`.trim(),
              finvaMotorcycleId: moto.finvaMotorcycleId,
            }}
            purchaseUrl={moto.purchaseUrl || site.defaultPurchaseUrl}
          >
            Continuar con mi solicitud
          </FinvaCheckoutModal>
        ) : null}
      </div>
    </>
  );
}

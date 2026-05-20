'use client';

import { useEffect, useRef, useState } from 'react';
import type { AddressData } from '@/types/credit-application';
import { lookupZip } from '@/lib/credit-application/api';
import { isValidPostalCode } from '@/lib/credit-application/validation';
import { WizardField } from '../WizardField';

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; ciudad: string; estado: string; neighborhoods: string[] }
  | { status: 'error'; message: string };

export function StepAddress({
  initial,
  neighborhoodOptions,
  onChange,
  onSubmit,
}: {
  initial?: Partial<AddressData>;
  /** Colonias precargadas (e.g. desde una consulta previa). Se usan como seed. */
  neighborhoodOptions?: string[];
  /** Notifica al wizard de cada cambio para persistir live en sessionStorage. */
  onChange?: (partial: Partial<AddressData>) => void;
  onSubmit: (data: AddressData) => void | Promise<void>;
}) {
  const [street, setStreet] = useState(initial?.street ?? '');
  const [exteriorNumber, setExteriorNumber] = useState(initial?.exteriorNumber ?? '');
  const [interiorNumber, setInteriorNumber] = useState(initial?.interiorNumber ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '');
  const [ciudad, setCiudad] = useState(initial?.ciudad ?? '');
  const [estado, setEstado] = useState(initial?.estado ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lookup, setLookup] = useState<LookupState>(() => {
    if (neighborhoodOptions?.length) {
      return {
        status: 'ok',
        ciudad: initial?.ciudad ?? '',
        estado: initial?.estado ?? '',
        neighborhoods: neighborhoodOptions,
      };
    }
    return { status: 'idle' };
  });

  // Guardamos el último CP consultado para no re-pedir al re-render con el
  // mismo valor. Es un ref (no state) para no disparar nuevos efectos.
  const lastFetchedZipRef = useRef<string>(
    initial?.postalCode && neighborhoodOptions?.length ? initial.postalCode : ''
  );
  // Snapshot mutable de la colonia seleccionada: se lee dentro del efecto sin
  // que su cambio reinicie el fetch (evita cancelar la request en vuelo).
  const neighborhoodRef = useRef(neighborhood);
  useEffect(() => {
    neighborhoodRef.current = neighborhood;
  }, [neighborhood]);

  // Persistencia en vivo: emitimos al wizard cualquier cambio para que
  // sessionStorage no se quede atrás cuando el usuario navega entre pasos.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.({
      street,
      exteriorNumber,
      interiorNumber,
      postalCode,
      neighborhood,
      ciudad,
      estado,
    });
  }, [street, exteriorNumber, interiorNumber, postalCode, neighborhood, ciudad, estado]);

  useEffect(() => {
    if (!isValidPostalCode(postalCode)) {
      // CP incompleto: limpiamos resultados pero conservamos lo que el usuario
      // haya tipeado en ciudad/estado por si lo está haciendo manualmente.
      setLookup((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
      lastFetchedZipRef.current = '';
      return;
    }
    if (lastFetchedZipRef.current === postalCode) return;

    let cancelled = false;
    lastFetchedZipRef.current = postalCode;
    setLookup({ status: 'loading' });

    lookupZip(postalCode)
      .then((res) => {
        if (cancelled) return;
        setLookup({
          status: 'ok',
          ciudad: res.ciudad,
          estado: res.estado,
          neighborhoods: res.neighborhoods,
        });
        if (res.ciudad) setCiudad(res.ciudad);
        if (res.estado) setEstado(res.estado);
        // Si la colonia previa ya no aparece en el catálogo nuevo, la
        // limpiamos para forzar selección consciente.
        const currentNeighborhood = neighborhoodRef.current;
        if (
          currentNeighborhood &&
          res.neighborhoods.length > 0 &&
          !res.neighborhoods.includes(currentNeighborhood)
        ) {
          setNeighborhood('');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'No pudimos consultar tu código postal';
        setLookup({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [postalCode]);

  const hasColoniaSelect =
    lookup.status === 'ok' && lookup.neighborhoods.length > 0;
  const isLookingUp = lookup.status === 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!street.trim()) next.street = 'Requerido';
    if (!exteriorNumber.trim()) next.exterior = 'Requerido';
    if (!isValidPostalCode(postalCode)) next.postalCode = 'Código postal de 5 dígitos';
    if (!neighborhood.trim()) next.neighborhood = 'Requerido';
    // Ciudad y estado son requeridos siempre: cuando hay error de lookup el
    // usuario los completa a mano; cuando hay éxito ya vienen prellenados.
    if (!ciudad.trim()) next.ciudad = 'Requerido';
    if (!estado.trim()) next.estado = 'Requerido';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({
      street: street.trim(),
      exteriorNumber: exteriorNumber.trim(),
      interiorNumber: interiorNumber.trim(),
      postalCode: postalCode.trim(),
      neighborhood: neighborhood.trim(),
      ciudad: ciudad.trim(),
      estado: estado.trim(),
    });
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <p className="small muted wizard-hint">
        De preferencia utiliza el domicilio que tengas en tus comprobantes.
      </p>
      <WizardField label="Calle" error={errors.street}>
        <input
          className="input"
          placeholder="Calle ejemplo"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          disabled={isLookingUp}
        />
      </WizardField>
      <div className="wizard-address-grid">
        <WizardField label="Número exterior" error={errors.exterior}>
          <input
            className="input"
            placeholder="123"
            value={exteriorNumber}
            onChange={(e) => setExteriorNumber(e.target.value)}
            disabled={isLookingUp}
          />
        </WizardField>
        <WizardField label="Número interior (opcional)">
          <input
            className="input"
            placeholder="2-A"
            value={interiorNumber}
            onChange={(e) => setInteriorNumber(e.target.value)}
            disabled={isLookingUp}
          />
        </WizardField>
        <WizardField
          label="Código postal"
          error={
            errors.postalCode ||
            (lookup.status === 'error' ? lookup.message : undefined)
          }
        >
          <input
            className="input"
            inputMode="numeric"
            placeholder="01230"
            maxLength={5}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
            disabled={isLookingUp}
          />
          {isLookingUp ? (
            <span className="small muted" style={{ marginTop: 4, display: 'block' }}>
              Buscando colonia / ciudad…
            </span>
          ) : null}
        </WizardField>
        <WizardField label="Colonia" error={errors.neighborhood}>
          {hasColoniaSelect ? (
            <select
              className="select"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={isLookingUp}
            >
              <option value="">Selecciona colonia</option>
              {lookup.neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              placeholder="Santa Fe"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={isLookingUp}
            />
          )}
        </WizardField>
        <WizardField label="Ciudad" error={errors.ciudad}>
          <input
            className="input"
            placeholder="Álvaro Obregón"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            disabled={isLookingUp}
          />
        </WizardField>
        <WizardField label="Estado" error={errors.estado}>
          <input
            className="input"
            placeholder="Ciudad de México"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            disabled={isLookingUp}
          />
        </WizardField>
      </div>
    </form>
  );
}

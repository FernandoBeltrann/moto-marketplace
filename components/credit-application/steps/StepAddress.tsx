'use client';

import { useState } from 'react';
import type { AddressData } from '@/types/credit-application';
import { isValidPostalCode } from '@/lib/credit-application/validation';
import { WizardField } from '../WizardField';

export function StepAddress({
  initial,
  neighborhoodOptions,
  onSubmit,
}: {
  initial?: AddressData;
  neighborhoodOptions?: string[];
  onSubmit: (data: AddressData) => void | Promise<void>;
}) {
  const [street, setStreet] = useState(initial?.street ?? '');
  const [exteriorNumber, setExteriorNumber] = useState(initial?.exteriorNumber ?? '');
  const [interiorNumber, setInteriorNumber] = useState(initial?.interiorNumber ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasColoniaSelect = neighborhoodOptions && neighborhoodOptions.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!street.trim()) next.street = 'Requerido';
    if (!exteriorNumber.trim()) next.exterior = 'Requerido';
    if (!isValidPostalCode(postalCode)) next.postalCode = 'Código postal de 5 dígitos';
    if (!neighborhood.trim()) next.neighborhood = 'Requerido';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({
      street: street.trim(),
      exteriorNumber: exteriorNumber.trim(),
      interiorNumber: interiorNumber.trim(),
      postalCode: postalCode.trim(),
      neighborhood: neighborhood.trim(),
    });
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <p className="small muted wizard-hint">De preferencia utiliza el domicilio que tengas en tus comprobantes.</p>
      <WizardField label="Calle" error={errors.street}>
        <input className="input" placeholder="Calle ejemplo" value={street} onChange={(e) => setStreet(e.target.value)} />
      </WizardField>
      <div className="wizard-address-grid">
        <WizardField label="Número exterior" error={errors.exterior}>
          <input className="input" placeholder="123" value={exteriorNumber} onChange={(e) => setExteriorNumber(e.target.value)} />
        </WizardField>
        <WizardField label="Número interior (opcional)">
          <input className="input" placeholder="2-A" value={interiorNumber} onChange={(e) => setInteriorNumber(e.target.value)} />
        </WizardField>
        <WizardField label="Código postal" error={errors.postalCode}>
          <input
            className="input"
            inputMode="numeric"
            placeholder="01230"
            maxLength={5}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
          />
        </WizardField>
        <WizardField label="Colonia" error={errors.neighborhood}>
          {hasColoniaSelect ? (
            <select className="select" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
              <option value="">Selecciona colonia</option>
              {neighborhoodOptions!.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : (
            <input className="input" placeholder="Santa Fe" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          )}
        </WizardField>
      </div>
    </form>
  );
}

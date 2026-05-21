'use client';

import { useEffect, useRef, useState } from 'react';
import type { IdentityData } from '@/types/credit-application';
import { lookupCurp } from '@/lib/credit-application/api';
import { isValidCurp } from '@/lib/credit-application/validation';
import { WizardField } from '../WizardField';

export function StepIdentification({
  initial,
  onChange,
  onNeighborhoods,
  onSubmit,
}: {
  initial?: Partial<IdentityData>;
  /** Notifica al wizard de cada cambio para persistir live en sessionStorage. */
  onChange?: (partial: Partial<IdentityData>) => void;
  onNeighborhoods?: (neighborhoods: string[]) => void;
  onSubmit: (data: IdentityData) => void | Promise<void>;
}) {
  const [curp, setCurp] = useState(initial?.curp ?? '');
  const [identity, setIdentity] = useState<IdentityData | null>(
    initial?.firstName || initial?.lastName ? (initial as IdentityData) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Persistencia en vivo
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.({
      curp,
      firstName: identity?.firstName ?? '',
      middleName: identity?.middleName ?? '',
      lastName: identity?.lastName ?? '',
      secondLastName: identity?.secondLastName ?? '',
      birthDate: identity?.birthDate ?? '',
      rfc: identity?.rfc,
    });
  }, [curp, identity]);

  async function consultar() {
    setError('');
    if (!isValidCurp(curp)) {
      setError('CURP inválido (18 caracteres)');
      return;
    }
    setLoading(true);
    try {
      const data = await lookupCurp(curp.trim().toUpperCase());
      setIdentity({
        curp: data.curp,
        firstName: data.firstName,
        middleName: data.middleName ?? '',
        lastName: data.lastName,
        secondLastName: data.secondLastName ?? '',
        birthDate: data.birthDate,
        // CRÍTICO: persistimos el RFC (sea retornado por validate-curp o
        // generado por generate_rfc en el server). Sin esto el cliente queda
        // sin RFC en Finva y `/send_nip_kiban` lo rechaza por `rfc_pf` vacío.
        rfc: data.rfc,
      });
      if (data.neighborhoods?.length) onNeighborhoods?.(data.neighborhoods);
    } catch {
      setError('No pudimos consultar el CURP. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) {
      setError('Consulta tu CURP antes de continuar');
      return;
    }
    await onSubmit(identity);
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <WizardField label="CURP" error={error || undefined}>
        <div className="wizard-row">
          <input
            className="input"
            placeholder="ABCD123456HDFXXX00"
            value={curp}
            onChange={(e) => setCurp(e.target.value.toUpperCase())}
            maxLength={18}
          />
          <button type="button" className="btn" onClick={consultar} disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="btn-loading__spinner" aria-hidden />
                Consultando…
              </span>
            ) : (
              'Consultar'
            )}
          </button>
        </div>
      </WizardField>

      {identity ? (
        <div className="wizard-identity-grid">
          <WizardField label="Nombre">
            <input className="input" value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} />
          </WizardField>
          <WizardField label="Segundo nombre (opcional)">
            <input className="input" value={identity.middleName} onChange={(e) => setIdentity({ ...identity, middleName: e.target.value })} />
          </WizardField>
          <WizardField label="Apellido paterno">
            <input className="input" value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} />
          </WizardField>
          <WizardField label="Apellido materno">
            <input className="input" value={identity.secondLastName} onChange={(e) => setIdentity({ ...identity, secondLastName: e.target.value })} />
          </WizardField>
          <WizardField label="Fecha de nacimiento">
            <input
              className="input"
              type="date"
              value={identity.birthDate}
              onChange={(e) => setIdentity({ ...identity, birthDate: e.target.value })}
            />
          </WizardField>
        </div>
      ) : null}
    </form>
  );
}

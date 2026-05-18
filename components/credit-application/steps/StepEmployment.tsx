'use client';

import { useState } from 'react';
import type { EmploymentData } from '@/types/credit-application';
import { WizardField } from '../WizardField';

const TENURE_OPTIONS = [
  { value: 3, label: 'Menos de 6 meses' },
  { value: 9, label: '6–12 meses' },
  { value: 18, label: '1–2 años' },
  { value: 36, label: 'Más de 2 años' },
];

export function StepEmployment({
  initial,
  onSubmit,
}: {
  initial?: EmploymentData;
  onSubmit: (data: EmploymentData) => void | Promise<void>;
}) {
  const [company, setCompany] = useState(initial?.company ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [tenureMonths, setTenureMonths] = useState(initial?.tenureMonths ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!company.trim()) next.company = 'Requerido';
    if (!role.trim()) next.role = 'Requerido';
    if (!tenureMonths) next.tenure = 'Selecciona antigüedad';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({ company: company.trim(), role: role.trim(), tenureMonths });
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <WizardField label="Empresa" error={errors.company}>
        <input className="input" placeholder="Nombre de la empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
      </WizardField>
      <WizardField label="Puesto" error={errors.role}>
        <input className="input" placeholder="Tu puesto actual" value={role} onChange={(e) => setRole(e.target.value)} />
      </WizardField>
      <WizardField label="Antigüedad" error={errors.tenure}>
        <select
          className="select"
          value={tenureMonths || ''}
          onChange={(e) => setTenureMonths(Number(e.target.value))}
        >
          <option value="">Selecciona</option>
          {TENURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </WizardField>
    </form>
  );
}

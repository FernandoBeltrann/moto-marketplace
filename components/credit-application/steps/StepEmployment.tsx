'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CREDIT_HISTORY_OPTIONS,
  INCOME_PROOFS,
  INCOME_SOURCE_TYPES,
  type CreditHistoryOption,
  type EmploymentData,
  type GuarantorOption,
  type IncomeProof,
  type IncomeSourceType,
} from '@/types/credit-application';
import { WizardField } from '../WizardField';

const TENURE_OPTIONS = [
  { value: 3, label: 'Menos de 6 meses' },
  { value: 9, label: '6–12 meses' },
  { value: 18, label: '1–2 años' },
  { value: 36, label: 'Más de 2 años' },
];

export function StepEmployment({
  initial,
  onChange,
  onSubmit,
}: {
  initial?: Partial<EmploymentData>;
  /** Notifica al wizard de cada cambio para persistir live en sessionStorage. */
  onChange?: (partial: Partial<EmploymentData>) => void;
  onSubmit: (data: EmploymentData) => void | Promise<void>;
}) {
  const [company, setCompany] = useState(initial?.company ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [tenureMonths, setTenureMonths] = useState(initial?.tenureMonths ?? 0);
  const [incomeSourceType, setIncomeSourceType] = useState<IncomeSourceType | ''>(
    initial?.incomeSourceType ?? ''
  );
  const [incomeProof, setIncomeProof] = useState<IncomeProof | ''>(initial?.incomeProof ?? '');
  const [monthlyIncomeRaw, setMonthlyIncomeRaw] = useState<string>(
    initial?.monthlyIncome ? String(initial.monthlyIncome) : ''
  );
  const [creditHistory, setCreditHistory] = useState<CreditHistoryOption | ''>(
    initial?.creditHistory ?? ''
  );
  const [possibleGuarantor, setPossibleGuarantor] = useState<GuarantorOption | ''>(
    initial?.possibleGuarantor ?? ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function parseIncome(): number {
    const digits = monthlyIncomeRaw.replace(/[^\d.]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  // Persistencia en vivo
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.({
      company,
      role,
      tenureMonths,
      incomeSourceType: (incomeSourceType || undefined) as EmploymentData['incomeSourceType'],
      incomeProof: (incomeProof || undefined) as EmploymentData['incomeProof'],
      monthlyIncome: parseIncome(),
      creditHistory: (creditHistory || undefined) as EmploymentData['creditHistory'],
      possibleGuarantor: (possibleGuarantor || undefined) as EmploymentData['possibleGuarantor'],
    });
    // parseIncome es estable (lee monthlyIncomeRaw del closure actual).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    company,
    role,
    tenureMonths,
    incomeSourceType,
    incomeProof,
    monthlyIncomeRaw,
    creditHistory,
    possibleGuarantor,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!company.trim()) next.company = 'Requerido';
    if (!role.trim()) next.role = 'Requerido';
    if (!tenureMonths) next.tenure = 'Selecciona antigüedad';
    if (!incomeSourceType) next.incomeSourceType = 'Requerido';
    if (!incomeProof) next.incomeProof = 'Requerido';
    const income = parseIncome();
    if (!income || income < 1000) next.monthlyIncome = 'Ingresa un ingreso mensual válido';
    if (!creditHistory) next.creditHistory = 'Requerido';
    if (!possibleGuarantor) next.possibleGuarantor = 'Selecciona una opción';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({
      company: company.trim(),
      role: role.trim(),
      tenureMonths,
      incomeSourceType: incomeSourceType as IncomeSourceType,
      incomeProof: incomeProof as IncomeProof,
      monthlyIncome: income,
      creditHistory: creditHistory as CreditHistoryOption,
      possibleGuarantor: possibleGuarantor as GuarantorOption,
    });
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <WizardField label="Empresa" error={errors.company}>
        <input
          className="input"
          placeholder="Nombre de la empresa"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </WizardField>
      <WizardField label="Puesto" error={errors.role}>
        <input
          className="input"
          placeholder="Tu puesto actual"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
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

      <WizardField label="¿Cómo percibes tus ingresos?" error={errors.incomeSourceType}>
        <select
          className="select"
          value={incomeSourceType}
          onChange={(e) => setIncomeSourceType(e.target.value as IncomeSourceType)}
        >
          <option value="">Selecciona</option>
          {INCOME_SOURCE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </WizardField>

      <WizardField label="¿Cómo compruebas tus ingresos?" error={errors.incomeProof}>
        <select
          className="select"
          value={incomeProof}
          onChange={(e) => setIncomeProof(e.target.value as IncomeProof)}
        >
          <option value="">Selecciona</option>
          {INCOME_PROOFS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </WizardField>

      <WizardField label="Ingreso mensual (MXN)" error={errors.monthlyIncome}>
        <input
          className="input"
          inputMode="numeric"
          placeholder="$25,000"
          value={monthlyIncomeRaw}
          onChange={(e) => setMonthlyIncomeRaw(e.target.value)}
        />
      </WizardField>

      <WizardField label="Historial crediticio" error={errors.creditHistory}>
        <select
          className="select"
          value={creditHistory}
          onChange={(e) => setCreditHistory(e.target.value as CreditHistoryOption)}
        >
          <option value="">Selecciona</option>
          {CREDIT_HISTORY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </WizardField>

      <WizardField label="¿Puedes conseguir un aval?" error={errors.possibleGuarantor}>
        <div className="wizard-row">
          <button
            type="button"
            className={`btn ${possibleGuarantor === 'Si' ? 'green' : 'light'}`}
            onClick={() => setPossibleGuarantor('Si')}
          >
            Sí
          </button>
          <button
            type="button"
            className={`btn ${possibleGuarantor === 'NO' ? 'green' : 'light'}`}
            onClick={() => setPossibleGuarantor('NO')}
          >
            No
          </button>
        </div>
      </WizardField>
    </form>
  );
}

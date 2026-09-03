'use client';

import { useState } from 'react';
import type { ContactData } from '@/types/credit-application';
import { isValidEmail, isValidMxPhone, normalizeMxPhone } from '@/lib/credit-application/validation';
import { WizardField } from '../WizardField';

export function StepContact({
  initial,
  onSubmit,
}: {
  initial?: ContactData;
  onSubmit: (data: ContactData) => void | Promise<void>;
}) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { email?: string; phone?: string } = {};
    if (!isValidEmail(email)) next.email = 'Ingresa un correo válido';
    if (!isValidMxPhone(phone)) next.phone = 'WhatsApp debe tener 10 dígitos';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({ email: email.trim(), phone: normalizeMxPhone(phone) });
  }

  return (
    <form id="wizard-active-form" className="wizard-form" onSubmit={handleSubmit}>
      <WizardField label="Correo electrónico" error={errors.email}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </WizardField>
      <WizardField label="WhatsApp" error={errors.phone}>
        <input
          className="input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="55 1234 5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </WizardField>
    </form>
  );
}

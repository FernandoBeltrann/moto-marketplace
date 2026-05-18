'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CreditApplicationFormData, QuoteContext } from '@/types/credit-application';
import { CREDIT_APP_STEPS } from '@/types/credit-application';
import {
  saveAddress,
  saveContact,
  saveEmployment,
  saveIdentification,
  startApplication,
} from '@/lib/credit-application/api';
import { loadCreditAppState, saveCreditAppState } from '@/lib/credit-application/storage';
import { track } from '@/lib/analytics';
import { WizardProgress } from './WizardProgress';
import { StepContact } from './steps/StepContact';
import { StepIdentification } from './steps/StepIdentification';
import { StepAddress } from './steps/StepAddress';
import { StepEmployment } from './steps/StepEmployment';
import { StepBuroNip, type BuroPhase } from './steps/StepBuroNip';
import { StepOffer } from './steps/StepOffer';

export function CreditApplicationWizard({
  motorcycleId,
  motorcycleName,
  quote,
  onCancel,
}: {
  motorcycleId: string;
  motorcycleName: string;
  quote: QuoteContext;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [form, setForm] = useState<CreditApplicationFormData>({});
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState('');
  const [buroPhase, setBuroPhase] = useState<BuroPhase>('enter');
  const [buroBusy, setBuroBusy] = useState(false);

  useEffect(() => {
    const saved = loadCreditAppState(motorcycleId);
    if (saved?.step) setStep(saved.step);
    if (saved?.applicationId) setApplicationId(saved.applicationId);
    if (saved?.form) setForm(saved.form);
  }, [motorcycleId]);

  useEffect(() => {
    saveCreditAppState({
      applicationId,
      motorcycleId,
      motorcycleName,
      quote,
      step,
      form,
    });
  }, [applicationId, motorcycleId, motorcycleName, quote, step, form]);

  useEffect(() => {
    track('credit_app_step', { motorcycleId, step });
  }, [motorcycleId, step]);

  useEffect(() => {
    if (step !== 5) setBuroPhase('enter');
  }, [step]);

  function handleWizardBack() {
    if (step === 5 && buroPhase === 'authorize') {
      setBuroPhase('enter');
      return;
    }
    setStep((s) => s - 1);
  }

  const ensureApplication = useCallback(async () => {
    if (applicationId) return applicationId;
    const res = await startApplication({ motorcycleId, motorcycleName, quote });
    setApplicationId(res.applicationId);
    return res.applicationId;
  }, [applicationId, motorcycleId, motorcycleName, quote]);

  function goNext() {
    if (step < CREDIT_APP_STEPS.length) setStep((s) => s + 1);
  }

  async function handleContact(data: Parameters<typeof saveContact>[1]) {
    setLoading(true);
    setInitError('');
    try {
      const id = await ensureApplication();
      await saveContact(id, data);
      setForm((f) => ({ ...f, contact: data }));
      goNext();
    } catch {
      setInitError('No pudimos guardar tus datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleIdentification(data: Parameters<typeof saveIdentification>[1]) {
    setLoading(true);
    setInitError('');
    try {
      const id = await ensureApplication();
      await saveIdentification(id, data);
      setForm((f) => ({ ...f, identity: data }));
      goNext();
    } catch {
      setInitError('Error al guardar identificación.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddress(data: Parameters<typeof saveAddress>[1]) {
    setLoading(true);
    setInitError('');
    try {
      const id = await ensureApplication();
      await saveAddress(id, data);
      setForm((f) => ({ ...f, address: data }));
      goNext();
    } catch {
      setInitError('Error al guardar domicilio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmployment(data: Parameters<typeof saveEmployment>[1]) {
    setLoading(true);
    setInitError('');
    try {
      const id = await ensureApplication();
      await saveEmployment(id, data);
      setForm((f) => ({ ...f, employment: data }));
      goNext();
    } catch {
      setInitError('Error al guardar empleo.');
    } finally {
      setLoading(false);
    }
  }

  const showNav = step < 6;

  return (
    <div className="calculator credit-wizard">
      <WizardProgress step={step} />
      {initError ? (
        <p className="small wizard-error">{initError}</p>
      ) : null}

      {step === 1 ? <StepContact initial={form.contact} onSubmit={handleContact} /> : null}
      {step === 2 ? (
        <StepIdentification
          initial={form.identity}
          onNeighborhoods={setNeighborhoodOptions}
          onSubmit={handleIdentification}
        />
      ) : null}
      {step === 3 ? (
        <StepAddress
          initial={form.address}
          neighborhoodOptions={neighborhoodOptions}
          onSubmit={handleAddress}
        />
      ) : null}
      {step === 4 ? <StepEmployment initial={form.employment} onSubmit={handleEmployment} /> : null}
      {step === 5 && applicationId ? (
        <StepBuroNip
          applicationId={applicationId}
          phone={form.contact?.phone}
          phase={buroPhase}
          onPhaseChange={setBuroPhase}
          onBusyChange={setBuroBusy}
          onVerified={goNext}
        />
      ) : null}
      {step === 5 && !applicationId ? (
        <p className="small muted">Completa los pasos anteriores.</p>
      ) : null}
      {step === 6 && applicationId ? (
        <StepOffer motorcycleName={motorcycleName} applicationId={applicationId} quote={quote} />
      ) : null}

      {showNav ? (
        <div className="wizard-nav">
          {step === 1 ? (
            <button type="button" className="btn light" onClick={onCancel}>
              Cancelar
            </button>
          ) : (
            <button type="button" className="btn light" onClick={handleWizardBack} disabled={loading || buroBusy}>
              Atrás
            </button>
          )}
          <button
            type="submit"
            form="wizard-active-form"
            className="btn green"
            disabled={loading || buroBusy}
          >
            {loading
              ? 'Guardando…'
              : step === 5 && buroPhase === 'authorize'
                ? buroBusy
                  ? 'Autorizando…'
                  : 'Autorizar consulta'
                : 'Continuar'}
          </button>
        </div>
      ) : (
        <div className="wizard-nav">
          <button type="button" className="btn light" onClick={onCancel}>
            Volver al calculador
          </button>
        </div>
      )}
    </div>
  );
}


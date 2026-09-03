import { CREDIT_APP_STEPS } from '@/types/credit-application';

export function WizardProgress({ step }: { step: number }) {
  const meta = CREDIT_APP_STEPS[step - 1];
  const pct = Math.round((step / CREDIT_APP_STEPS.length) * 100);

  return (
    <div className="wizard-progress">
      <div className="wizard-progress__top">
        <span className="wizard-progress__step small">
          Paso <strong>{step}</strong> de {CREDIT_APP_STEPS.length}
        </span>
        <span className="wizard-progress__pct small muted">{pct}%</span>
      </div>
      <div className="wizard-progress__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="wizard-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <h3 className="wizard-progress__title">{meta.title}</h3>
      <p className="small muted wizard-progress__subtitle">{meta.subtitle}</p>
    </div>
  );
}

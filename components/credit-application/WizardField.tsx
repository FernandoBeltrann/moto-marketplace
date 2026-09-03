export function WizardField({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  const hasError = Boolean(error);
  return (
    <label className={`wizard-field${hasError ? ' wizard-field--has-error' : ''}`}>
      <span
        className={`wizard-field__label small${hasError ? ' wizard-field__label--error' : ' muted'}`}
      >
        {label}
      </span>
      {children}
      {error ? <span className="wizard-field__error small">{error}</span> : null}
    </label>
  );
}

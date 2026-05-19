export function WizardField({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="wizard-field">
      <span className="wizard-field__label small muted">{label}</span>
      {children}
      {error ? <span className="wizard-field__error small">{error}</span> : null}
    </label>
  );
}

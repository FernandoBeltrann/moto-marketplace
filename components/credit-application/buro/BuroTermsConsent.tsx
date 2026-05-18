'use client';

export function BuroTermsConsent({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="buro-consent">
      <input
        type="checkbox"
        className="buro-consent__check"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="buro-consent__text small">
        Acepto los{' '}
        <a href="/envio-garantia" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          términos y condiciones
        </a>{' '}
        y cláusula de medios electrónicos tales como NIP.
      </span>
    </label>
  );
}

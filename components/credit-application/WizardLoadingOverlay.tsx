'use client';

/**
 * Overlay translúcido + spinner que cubre el wizard durante cualquier request
 * asíncrona (guardar paso, probe, NIP, verificación de buró). Bloquea clicks
 * para evitar doble-submit y deja claro al usuario que algo está pasando.
 */
export function WizardLoadingOverlay({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  if (!show) return null;
  return (
    <div
      className="wizard-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="wizard-loading-overlay__panel">
        <span className="wizard-loading-overlay__spinner" aria-hidden />
        <span className="wizard-loading-overlay__text">
          {message ?? 'Procesando…'}
        </span>
      </div>
    </div>
  );
}

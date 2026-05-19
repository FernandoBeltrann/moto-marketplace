'use client';

import { useEffect, useState } from 'react';
import { requestBuroNip, verifyBuroNip } from '@/lib/credit-application/api';
import { formatMxPhoneDisplay } from '@/lib/credit-application/phone';
import { isValidNip } from '@/lib/credit-application/validation';
import { BuroAuthorizationNotice } from '../buro/BuroAuthorizationNotice';
import { BuroNipDigits } from '../buro/BuroNipDigits';
import { BuroTermsConsent } from '../buro/BuroTermsConsent';

export type BuroPhase = 'enter' | 'authorize';

export function StepBuroNip({
  applicationId,
  phone,
  phase,
  onPhaseChange,
  onBusyChange,
  onVerified,
}: {
  applicationId: string;
  phone?: string;
  phase: BuroPhase;
  onPhaseChange: (phase: BuroPhase) => void;
  onBusyChange?: (busy: boolean) => void;
  onVerified: () => void | Promise<void>;
}) {
  const [nip, setNip] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'verifying' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const phoneLabel = phone ? formatMxPhoneDisplay(phone) : null;
  const busy = status === 'requesting' || status === 'verifying';

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('requesting');
      try {
        const res = await requestBuroNip(applicationId);
        if (!cancelled) {
          setMessage(res.message ?? 'Hemos enviado un código de 6 dígitos a tu WhatsApp.');
          setStatus('ready');
          setResendIn(30);
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos solicitar el NIP. Intenta de nuevo.');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function handleResend() {
    if (resendIn > 0 || busy) return;
    setError('');
    setStatus('requesting');
    try {
      const res = await requestBuroNip(applicationId);
      setMessage(res.message ?? 'Hemos enviado un código de 6 dígitos a tu WhatsApp.');
      setStatus('ready');
      setResendIn(30);
    } catch {
      setError('No pudimos reenviar el NIP. Intenta de nuevo.');
      setStatus('error');
    }
  }

  function validateCommon(): boolean {
    if (!termsAccepted) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return false;
    }
    if (!isValidNip(nip)) {
      setError('El NIP debe tener 6 dígitos');
      return false;
    }
    setError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'enter') {
      if (!validateCommon()) return;
      onPhaseChange('authorize');
      return;
    }
    if (!validateCommon()) return;
    setStatus('verifying');
    try {
      await verifyBuroNip(applicationId, nip);
      await onVerified();
    } catch {
      setError('NIP incorrecto o expirado. Verifica e intenta de nuevo.');
      setStatus('ready');
    }
  }

  const consentBlock = (
    <>
      <BuroTermsConsent checked={termsAccepted} onChange={setTermsAccepted} disabled={busy} />
      <BuroAuthorizationNotice />
    </>
  );

  return (
    <form id="wizard-active-form" className="wizard-form buro-step" onSubmit={handleSubmit}>
      {consentBlock}

      {phase === 'enter' ? (
        <>
          <div className="buro-step__hero">
            <span className="buro-step__shield" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <h4 className="buro-step__title">Ingresa tu código NIP</h4>
            <p className="small muted buro-step__subtitle">
              {status === 'requesting'
                ? 'Solicitando NIP a Buró…'
                : message || 'Hemos enviado un código de 6 dígitos a tu WhatsApp.'}
            </p>
            {phoneLabel ? (
              <p className="buro-step__phone">
                <span className="buro-step__phone-icon" aria-hidden>
                  📱
                </span>
                {phoneLabel}
              </p>
            ) : null}
          </div>

          <BuroNipDigits value={nip} onChange={setNip} disabled={busy} />

          <p className="buro-step__resend small muted">
            {resendIn > 0 ? (
              <>
                Reenviar en <strong>{resendIn}s</strong>
              </>
            ) : (
              <button type="button" className="buro-step__resend-btn" onClick={handleResend} disabled={busy}>
                Reenviar código
              </button>
            )}
          </p>
        </>
      ) : (
        <>
          <div className="buro-step__hero buro-step__hero--compact">
            <h4 className="buro-step__title">
              Confirma tu código para autorizar la consulta de tu Buró de Crédito
            </h4>
          </div>

          <p className="small muted buro-step__nip-label">Autorizar (con el mismo NIP verificado)</p>
          <BuroNipDigits value={nip} onChange={setNip} disabled={busy} masked />
          <button type="button" className="buro-step__change small" onClick={() => onPhaseChange('enter')}>
            Cambiar código
          </button>
        </>
      )}

      {error ? <p className="buro-step__error small">{error}</p> : null}

      <p className="buro-step__secure small muted">
        <span aria-hidden>🔒</span> Tu información está protegida
      </p>
    </form>
  );
}

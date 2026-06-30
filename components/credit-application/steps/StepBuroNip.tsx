'use client';

import { useEffect, useRef, useState } from 'react';
import { requestBuroNip, userFacingErrorMessage, verifyBuroNip } from '@/lib/credit-application/api';
import { formatMxPhoneDisplay } from '@/lib/credit-application/phone';
import { isValidNip } from '@/lib/credit-application/validation';
import type {
  AddressData,
  ContactData,
  CreditApplicationServerState,
  IdentityData,
} from '@/types/credit-application';
import { track } from '@/lib/analytics';
import { BuroAuthorizationNotice } from '../buro/BuroAuthorizationNotice';
import { BuroNipDigits } from '../buro/BuroNipDigits';
import { BuroTermsConsent } from '../buro/BuroTermsConsent';

export type BuroPhase = 'enter' | 'authorize';

const MAX_RETRIES_BEFORE_PHONE_HINT = 2;
const DEFAULT_NIP_MESSAGE = 'Hemos enviado un código de 6 dígitos a tu WhatsApp.';

export function StepBuroNip({
  serverState,
  motorcycleId,
  contact,
  identity,
  address,
  phone,
  phase,
  onPhaseChange,
  onBusyChange,
  onBusyMessageChange,
  onServerStateChange,
  onVerified,
  onChangePhone,
}: {
  serverState: CreditApplicationServerState;
  motorcycleId: string;
  contact: ContactData;
  identity: IdentityData;
  address: AddressData;
  phone?: string;
  phase: BuroPhase;
  onPhaseChange: (phase: BuroPhase) => void;
  onBusyChange?: (busy: boolean) => void;
  onBusyMessageChange?: (message: string) => void;
  onServerStateChange: (next: CreditApplicationServerState) => void;
  onVerified: (verifyResult: { reportId?: number }) => void | Promise<void>;
  onChangePhone: () => void;
}) {
  const [nip, setNip] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'verifying' | 'error'>(
    'idle'
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [emailFallback, setEmailFallback] = useState(false);
  const [nipConfirmed, setNipConfirmed] = useState(false);

  /** Evita doble `send_nip_kiban` (React Strict Mode / re-renders). */
  const sendInflightRef = useRef<Promise<void> | null>(null);

  const phoneLabel = phone ? formatMxPhoneDisplay(phone) : null;
  const busy = status === 'requesting' || status === 'verifying';
  const busyMessage =
    status === 'verifying'
      ? phase === 'authorize'
        ? 'Autorizando consulta de Buró…'
        : 'Verificando tu NIP…'
      : status === 'requesting'
        ? 'Enviando tu NIP…'
        : '';

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    onBusyMessageChange?.(busyMessage);
  }, [busyMessage, onBusyMessageChange]);

  useEffect(() => {
    if (serverState.reportId) {
      setStatus('verifying');
      setMessage('Tu Buró ya fue consultado. Registrando tu solicitud…');
      void onVerified({ reportId: serverState.reportId });
      return;
    }

    // Ya se envió el NIP en esta sesión: no volver a llamar send ni resend al montar.
    if (serverState.workflooId) {
      setStatus('ready');
      setMessage((m) => m || DEFAULT_NIP_MESSAGE);
      return;
    }

    if (sendInflightRef.current) return;

    let cancelled = false;
    sendInflightRef.current = (async () => {
      setStatus('requesting');
      try {
        const res = await requestBuroNip(serverState, {
          contact,
          identity,
          address,
          resend: false,
        });
        if (cancelled) return;
        if (res.serverState) onServerStateChange(res.serverState);
        const recoveredReportId = res.serverState?.reportId;
        if (recoveredReportId) {
          setMessage(res.message ?? 'Tu Buró ya fue consultado. Registrando tu solicitud…');
          setStatus('verifying');
          await onVerified({ reportId: recoveredReportId });
          return;
        }
        setMessage(
          res.message ??
            (res.nipType === 'email'
              ? 'Te enviamos el NIP por correo electrónico.'
              : DEFAULT_NIP_MESSAGE)
        );
        if (res.nipType === 'email') setEmailFallback(true);
        setStatus('ready');
        setResendIn(30);
      } catch (err) {
        if (!cancelled) {
          setError(
            userFacingErrorMessage(err, 'No pudimos solicitar el NIP. Intenta de nuevo.')
          );
          setStatus('error');
        }
      } finally {
        sendInflightRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState.applicationId, serverState.reportId, serverState.workflooId]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function handleResend() {
    if (resendIn > 0 || busy || !serverState.workflooId) return;
    setError('');
    setStatus('requesting');
    try {
      const res = await requestBuroNip(serverState, {
        contact,
        identity,
        address,
        resend: true,
      });
      if (res.serverState) onServerStateChange(res.serverState);
      const recoveredReportId = res.serverState?.reportId;
      if (recoveredReportId) {
        setMessage(res.message ?? 'Tu Buró ya fue consultado. Registrando tu solicitud…');
        setStatus('verifying');
        await onVerified({ reportId: recoveredReportId });
        return;
      }
      if (res.nipType === 'email') setEmailFallback(true);
      setMessage(
        res.message ??
          (res.nipType === 'email'
            ? 'Te enviamos el NIP por correo electrónico.'
            : 'Hemos reenviado un código de 6 dígitos a tu WhatsApp.')
      );
      setStatus('ready');
      setResendIn(30);
    } catch (err) {
      setError(userFacingErrorMessage(err, 'No pudimos reenviar el NIP. Intenta de nuevo.'));
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
    if (!validateCommon()) return;

    if (phase === 'enter') {
      setStatus('verifying');
      try {
        await verifyBuroNip(serverState, nip, 'confirm');
        setNipConfirmed(true);
        setStatus('ready');
        onPhaseChange('authorize');
      } catch {
        setFailedAttempts((n) => n + 1);
        setError('NIP incorrecto o expirado. Verifica e intenta de nuevo.');
        setStatus('ready');
      }
      return;
    }

    if (!nipConfirmed) {
      setError('Primero verifica tu NIP en el paso anterior.');
      onPhaseChange('enter');
      return;
    }

    setStatus('verifying');
    try {
      const res = await verifyBuroNip(serverState, nip, 'authorize');
      if (res.serverState) onServerStateChange(res.serverState);
      track('credit_app_buro_ok', { motorcycleId, reportId: res.reportId });
      await onVerified({ reportId: res.reportId });
    } catch {
      setFailedAttempts((n) => n + 1);
      setError('No pudimos autorizar la consulta. Verifica tu NIP e intenta de nuevo.');
      setStatus('ready');
    }
  }

  function handleChangePhoneClick() {
    track('credit_app_phone_change', { motorcycleId, attempts: failedAttempts });
    onChangePhone();
  }

  const showPhoneHint = failedAttempts >= MAX_RETRIES_BEFORE_PHONE_HINT || emailFallback;

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
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h4 className="buro-step__title">Ingresa tu código NIP</h4>
            <p className="small muted buro-step__subtitle">
              {status === 'requesting'
                ? 'Solicitando NIP a Buró…'
                : message || DEFAULT_NIP_MESSAGE}
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
              <button
                type="button"
                className="buro-step__resend-btn"
                onClick={handleResend}
                disabled={busy || !serverState.workflooId}
              >
                Reenviar código
              </button>
            )}
          </p>

          {showPhoneHint ? (
            <div className="buro-notice">
              <p className="buro-notice__text small">
                {emailFallback
                  ? 'No pudimos enviarte el NIP por WhatsApp. Verifica que el número sea correcto.'
                  : '¿No recibiste el código? Verifica que tu número de WhatsApp esté correcto.'}{' '}
                <button
                  type="button"
                  className="buro-step__resend-btn"
                  onClick={handleChangePhoneClick}
                  disabled={busy}
                >
                  Cambiar correo o teléfono
                </button>
              </p>
            </div>
          ) : null}
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
          <button
            type="button"
            className="buro-step__change small"
            onClick={() => {
              setNipConfirmed(false);
              onPhaseChange('enter');
            }}
          >
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreditApplicationFormData,
  CreditApplicationServerState,
  ContactData,
  AddressData,
  EmploymentData,
  IdentityData,
  QuoteContext,
} from '@/types/credit-application';
import { CREDIT_APP_STEPS } from '@/types/credit-application';
import {
  probeContact,
  saveAddress,
  saveContact,
  saveEmployment,
  saveIdentification,
  startApplication,
  submitSolicitud,
} from '@/lib/credit-application/api';
import {
  clearCreditAppState,
  loadCreditAppState,
  saveCreditAppState,
} from '@/lib/credit-application/storage';
import posthog from 'posthog-js';
import { track, trackApplicationCompleted } from '@/lib/analytics';
import { posthogProjectToken } from '@/lib/posthog-env';
import { WizardProgress } from './WizardProgress';
import { WizardLoadingOverlay } from './WizardLoadingOverlay';
import { StepContact } from './steps/StepContact';
import { StepIdentification } from './steps/StepIdentification';
import { StepAddress } from './steps/StepAddress';
import { StepEmployment } from './steps/StepEmployment';
import { StepBuroNip, type BuroPhase } from './steps/StepBuroNip';
import { StepOffer } from './steps/StepOffer';

function normalizeEmail(v: string | undefined): string {
  return (v ?? '').trim().toLowerCase();
}
function normalizePhone(v: string | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}
function contactChanged(prev: ContactData | undefined, next: ContactData): boolean {
  if (!prev) return false;
  return (
    normalizeEmail(prev.email) !== normalizeEmail(next.email) ||
    normalizePhone(prev.phone) !== normalizePhone(next.phone)
  );
}

function identifyPostHog(phone: string, email: string) {
  if (typeof window === 'undefined' || !posthogProjectToken()) return;
  try {
    posthog.identify(phone, { email, phone });
  } catch {
    /* PostHog no inicializado o red bloqueada */
  }
}

export function CreditApplicationWizard({
  motorcycleId,
  motorcycleSlug,
  motorcycleName,
  motorcycleBrand,
  motorcycleModel,
  motorcycleYear,
  motorcyclePrice,
  finvaMotorcycleId,
  quote,
  onCancel,
}: {
  motorcycleId: string;
  motorcycleSlug: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
  onCancel: () => void;
}) {
  // IMPORTANTE: el wizard se monta sólo en cliente (CreditApplicationShell lo
  // renderiza recién cuando el usuario abre el flujo), así que es seguro
  // leer `localStorage` durante la inicialización de useState. Cargarlo en un
  // useEffect causaba dos bugs:
  //   1) El primer render usaba estado vacío, los pasos (StepContact, etc.)
  //      capturaban `initial = undefined` en su propio useState y los inputs
  //      quedaban en blanco aunque después se hidratara `form.contact`.
  //   2) El effect de save corría en el primer render y SOBRESCRIBÍA el
  //      localStorage con el estado vacío antes de que el load lo restaurara.
  const initialPersisted = useMemo(() => loadCreditAppState(motorcycleId), [motorcycleId]);

  const [step, setStep] = useState<number>(() => initialPersisted?.step ?? 1);
  const [serverState, setServerState] = useState<CreditApplicationServerState | null>(() => {
    if (initialPersisted?.serverState?.applicationId) return initialPersisted.serverState;
    if (initialPersisted?.applicationId) {
      // Compat con sesiones previas (UUID local sin estado Finva).
      return { applicationId: initialPersisted.applicationId };
    }
    return null;
  });
  const [form, setForm] = useState<CreditApplicationFormData>(
    () => initialPersisted?.form ?? {}
  );
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [initError, setInitError] = useState('');
  const [buroPhase, setBuroPhase] = useState<BuroPhase>('enter');
  const [buroBusy, setBuroBusy] = useState(false);
  const [buroBusyMessage, setBuroBusyMessage] = useState<string>('');
  const [zipLookupBusy, setZipLookupBusy] = useState(false);
  const completedTracked = useRef(false);
  /**
   * Evita dar de alta la solicitud dos veces. `StepBuroNip` puede disparar
   * `onVerified` más de una vez en un mismo flujo (la autorización llama a
   * `onVerified`, y al fijar `reportId` en el serverState el efecto de
   * StepBuroNip vuelve a correr y lo dispara otra vez). Sólo debemos registrar
   * la solicitud una vez.
   */
  const solicitudSubmittedRef = useRef(false);

  const applicationId = serverState?.applicationId ?? null;
  const motorcycleModelLabel = `${motorcycleModel} ${motorcycleYear}`;

  function markApplicationCompleted(solicitudId: number | string) {
    if (completedTracked.current) return;
    completedTracked.current = true;
    trackApplicationCompleted({
      leadId: String(solicitudId),
      motorcycleSlug,
      motorcycleBrand,
      motorcycleModel: motorcycleModelLabel,
      city: form.address?.ciudad,
      value: 1,
    });
  }

  useEffect(() => {
    saveCreditAppState({
      applicationId,
      motorcycleId,
      motorcycleName,
      quote,
      step,
      form,
      serverState,
    });
  }, [applicationId, motorcycleId, motorcycleName, quote, step, form, serverState]);

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

  const ensureApplication = useCallback(
    async (
      override?: CreditApplicationServerState | null
    ): Promise<CreditApplicationServerState> => {
      const current = override !== undefined ? override : serverState;
      if (current?.applicationId) return current;
      const res = await startApplication({
        motorcycleId,
        motorcycleName,
        motorcycleBrand,
        motorcyclePrice,
        finvaMotorcycleId,
        quote,
        holdingPageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      const next = res.serverState ?? { applicationId: res.applicationId };
      setServerState(next);
      return next;
    },
    [serverState, motorcycleId, motorcycleName, motorcycleBrand, motorcyclePrice, finvaMotorcycleId, quote]
  );

  /**
   * Borra todo el estado downstream (identificación, domicilio, empleo, IDs de
   * Finva como clienteId/workflooId/reportId/solicitudId) cuando el cliente
   * cambia su email o WhatsApp en el paso 1. Sin esto, terminaríamos asociando
   * el cliente Finva creado con la pareja anterior a la nueva persona.
   */
  function resetForNewContact() {
    clearCreditAppState(motorcycleId);
    setServerState(null);
    setForm({});
    setNeighborhoodOptions([]);
    setBuroPhase('enter');
    solicitudSubmittedRef.current = false;
    completedTracked.current = false;
    track('credit_app_contact_reset', { motorcycleId });
  }

  function goNext() {
    if (step < CREDIT_APP_STEPS.length) setStep((s) => s + 1);
  }

  async function handleContact(data: ContactData) {
    setLoading(true);
    setLoadingMessage('Validando tus datos…');
    setInitError('');
    try {
      const changed = contactChanged(form.contact, data);
      if (changed) resetForNewContact();

      // 1) Probe Finva: decide qué rama tomar.
      const probe = await probeContact({
        serverState: changed ? null : serverState,
        contact: data,
        motorcycleId,
        motorcycleName,
        motorcycleBrand,
        motorcyclePrice,
        finvaMotorcycleId,
        quote,
        holdingPageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });

      // 2) Mismatch: NO avanzamos; mostramos el clue como error en StepContact.
      if (probe.resolution === 'mismatch') {
        const which = probe.mismatch?.wrongField === 'email' ? 'correo' : 'WhatsApp';
        const clue = probe.mismatch?.clue ? ` (registrado: ${probe.mismatch.clue})` : '';
        setInitError(
          `El ${which} no coincide con el cliente registrado${clue}. Verifica o usa otra combinación.`
        );
        if (probe.serverState) setServerState(probe.serverState);
        return;
      }

      // 3) Estado existente + datos hidratados desde Finva.
      if (probe.serverState) setServerState(probe.serverState);

      const nextForm: CreditApplicationFormData = {
        ...(changed ? {} : form),
        contact: data,
      };
      if (probe.hydratedIdentity) {
        nextForm.identity = {
          ...(probe.hydratedIdentity as IdentityData),
          ...(nextForm.identity ?? {}),
        };
      }
      if (probe.hydratedAddress) {
        nextForm.address = {
          ...(probe.hydratedAddress as AddressData),
          ...(nextForm.address ?? {}),
        };
      }
      setForm(nextForm);

      identifyPostHog(data.phone, data.email);
      track('credit_app_resolution', { motorcycleId, resolution: probe.resolution });

      // 4) Routing por resolución:
      //    - unregistered / incomplete → step 2 (identidad)
      //    - no_report                 → step 2 también (confirmar identidad y domicilio)
      //    - with_report               → step 2 (también confirmar), pero saltaremos
      //                                  empleo y buró desde handleAddress.
      goNext();
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'No pudimos validar tus datos. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleIdentification(data: IdentityData) {
    setLoading(true);
    setLoadingMessage('Guardando tu identificación…');
    setInitError('');
    try {
      const state = await ensureApplication();
      const res = await saveIdentification(state, data);
      if (res.serverState) setServerState(res.serverState);
      setForm((f) => ({ ...f, identity: data }));
      goNext();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Error al guardar identificación.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddress(data: AddressData) {
    setLoading(true);
    setLoadingMessage('Guardando tu domicilio…');
    setInitError('');
    try {
      const state = await ensureApplication();
      if (!form.contact || !form.identity) {
        throw new Error('Faltan datos de los pasos previos.');
      }
      const res = await saveAddress({
        serverState: state,
        address: data,
        contact: form.contact,
        identity: form.identity,
        motorcycleBrand,
      });
      let nextServerState = res.serverState ?? state;
      if (res.serverState) setServerState(res.serverState);
      if (res.neighborhoods?.length) setNeighborhoodOptions(res.neighborhoods);
      // Confiamos primero en lo que el usuario confirmó en el form (cuando hubo
      // error de lookup, el usuario tipea ciudad/estado a mano). Sólo si quedó
      // vacío, completamos con lo que devolvió la API.
      const enriched: AddressData = {
        ...data,
        ciudad: data.ciudad || res.ciudad,
        estado: data.estado || res.estado,
      };
      setForm((f) => ({ ...f, address: enriched }));

      // ── Atajo `with_report` ────────────────────────────────────────────────
      // Si el cliente entró con un reporte vigente, brincamos empleo + NIP +
      // pull de buró: creamos la solicitud directamente con el reportId que ya
      // tiene Finva y vamos al paso 6.
      if (nextServerState.resolution === 'with_report' && nextServerState.reportId) {
        if (solicitudSubmittedRef.current) {
          setStep(6);
          return;
        }
        setLoadingMessage('Generando tu solicitud…');
        solicitudSubmittedRef.current = true;
        try {
          const sol = await submitSolicitud({
            serverState: nextServerState,
            motorcycleId,
            motorcycleBrand,
            motorcycleModel,
            motorcycleYear,
            motorcyclePrice,
            finvaMotorcycleId,
            quote,
            // sin employment: el cliente ya tiene reporte vigente.
          });
          if (sol.serverState) {
            nextServerState = sol.serverState;
            setServerState(sol.serverState);
          }
          track('credit_app_solicitud_created', {
            motorcycleId,
            solicitudId: sol.solicitudId,
            value: motorcyclePrice,
            alreadyExisted: sol.alreadyExisted ?? false,
            shortcut: 'with_report',
          });
          markApplicationCompleted(sol.solicitudId);
          setStep(6);
          return;
        } catch (shortcutErr) {
          // Si falla el atajo, dejamos que el usuario siga el flujo normal y
          // liberamos el guard para que el alta pueda reintentarse en el buró.
          solicitudSubmittedRef.current = false;
          console.warn('[wizard] with_report shortcut failed, falling back:', shortcutErr);
        }
      }

      goNext();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Error al guardar domicilio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmployment(data: EmploymentData) {
    setLoading(true);
    setLoadingMessage('Guardando tu información laboral…');
    setInitError('');
    try {
      const state = await ensureApplication();
      const res = await saveEmployment(state, data);
      if (res.serverState) setServerState(res.serverState);
      setForm((f) => ({ ...f, employment: data }));
      goNext();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Error al guardar empleo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuroVerified(verifyResult?: { reportId?: number }) {
    if (!serverState) {
      setInitError('Faltan datos para registrar tu solicitud.');
      return;
    }
    // Idempotencia: si ya estamos registrando (o registramos) la solicitud en
    // este flujo, ignoramos disparos duplicados de `onVerified`.
    if (solicitudSubmittedRef.current) return;

    // Usamos el `reportId` recién devuelto por la verificación. El `serverState`
    // del closure puede ir desfasado (setServerState es asíncrono), y mandar
    // `report_id: null` provoca que Finva rechace la solicitud
    // ("report_id: Field may not be null.").
    const reportId = verifyResult?.reportId ?? serverState.reportId ?? null;
    const stateForSubmit: CreditApplicationServerState = reportId
      ? { ...serverState, reportId }
      : serverState;

    // El empleo sólo es obligatorio si NO traemos un reportId existente.
    // El backend ya impone esta misma regla en /api/application/submit; aquí la
    // replicamos para no llamar en balde cuando obviamente falta info.
    const hasExistingReport = Boolean(stateForSubmit.reportId);
    if (!hasExistingReport && !form.employment) {
      setInitError('Faltan datos de empleo para registrar tu solicitud.');
      return;
    }

    solicitudSubmittedRef.current = true;
    setLoading(true);
    setLoadingMessage('Generando tu solicitud…');
    setInitError('');
    try {
      const res = await submitSolicitud({
        serverState: stateForSubmit,
        motorcycleId,
        motorcycleBrand,
        motorcycleModel,
        motorcycleYear,
        motorcyclePrice,
        finvaMotorcycleId,
        quote,
        employment: form.employment,
      });
      if (res.serverState) setServerState(res.serverState);
      track('credit_app_solicitud_created', {
        motorcycleId,
        solicitudId: res.solicitudId,
        value: motorcyclePrice,
        alreadyExisted: res.alreadyExisted ?? false,
      });
      markApplicationCompleted(res.solicitudId);
      setStep(6);
    } catch (err) {
      // Falló el alta: permitimos reintento (el usuario puede reenviar).
      solicitudSubmittedRef.current = false;
      setInitError(
        err instanceof Error ? err.message : 'No pudimos registrar tu solicitud. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBuroChangePhone() {
    setStep(1);
  }

  // Callbacks estables para persistencia live: cada paso reporta sus campos
  // en cada keystroke y los fusionamos en `form.*`. La useEffect existente
  // escribe `form` completo a sessionStorage en cada cambio.
  const handleIdentityChange = useCallback((partial: Partial<IdentityData>) => {
    setForm((f) => ({
      ...f,
      identity: { ...(f.identity ?? {}), ...partial } as IdentityData,
    }));
  }, []);
  const handleAddressChange = useCallback((partial: Partial<AddressData>) => {
    setForm((f) => ({
      ...f,
      address: { ...(f.address ?? {}), ...partial } as AddressData,
    }));
  }, []);
  const handleEmploymentChange = useCallback((partial: Partial<EmploymentData>) => {
    setForm((f) => ({
      ...f,
      employment: { ...(f.employment ?? {}), ...partial } as EmploymentData,
    }));
  }, []);

  const showNav = step < 6;
  const overlayBusy = loading || buroBusy || zipLookupBusy;
  const overlayMessage = loading
    ? loadingMessage || 'Procesando…'
    : buroBusy
      ? buroBusyMessage || 'Procesando…'
      : zipLookupBusy
        ? 'Validando código postal…'
        : '';

  return (
    <div className="calculator credit-wizard">
      <WizardLoadingOverlay show={overlayBusy} message={overlayMessage} />
      <WizardProgress step={step} />
      {initError ? <p className="small wizard-error">{initError}</p> : null}

      {step === 1 ? <StepContact initial={form.contact} onSubmit={handleContact} /> : null}
      {step === 2 ? (
        <StepIdentification
          initial={form.identity}
          onChange={handleIdentityChange}
          onNeighborhoods={setNeighborhoodOptions}
          onSubmit={handleIdentification}
        />
      ) : null}
      {step === 3 ? (
        <StepAddress
          initial={form.address}
          neighborhoodOptions={neighborhoodOptions}
          onChange={handleAddressChange}
          onLookupChange={setZipLookupBusy}
          onSubmit={handleAddress}
        />
      ) : null}
      {step === 4 ? (
        <StepEmployment
          initial={form.employment}
          onChange={handleEmploymentChange}
          onSubmit={handleEmployment}
        />
      ) : null}
      {step === 5 && serverState && form.contact && form.identity && form.address ? (
        <StepBuroNip
          serverState={serverState}
          motorcycleId={motorcycleId}
          contact={form.contact}
          identity={form.identity}
          address={form.address}
          phone={form.contact.phone}
          phase={buroPhase}
          onPhaseChange={setBuroPhase}
          onBusyChange={setBuroBusy}
          onBusyMessageChange={setBuroBusyMessage}
          onServerStateChange={setServerState}
          onVerified={handleBuroVerified}
          onChangePhone={handleBuroChangePhone}
        />
      ) : null}
      {step === 5 && (!serverState || !form.contact || !form.identity || !form.address) ? (
        <p className="small muted">Completa los pasos anteriores.</p>
      ) : null}
      {step === 6 && serverState?.solicitudId ? (
        <StepOffer
          motorcycleId={motorcycleId}
          motorcycleSlug={motorcycleSlug}
          motorcycleBrand={motorcycleBrand}
          motorcycleModel={motorcycleModelLabel}
          motorcycleName={motorcycleName}
          motorcyclePrice={motorcyclePrice}
          solicitudId={serverState.solicitudId}
          agentName={serverState.agentName ?? undefined}
          agentPhone={serverState.agentPhone ?? undefined}
          city={form.address?.ciudad}
          quote={quote}
        />
      ) : null}
      {step === 6 && !serverState?.solicitudId ? (
        <p className="small muted">No pudimos generar tu solicitud Finva. Intenta de nuevo.</p>
      ) : null}

      {showNav ? (
        <div className="wizard-nav">
          {step === 1 ? (
            <button type="button" className="btn light" onClick={onCancel}>
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              className="btn light"
              onClick={handleWizardBack}
              disabled={overlayBusy}
            >
              Atrás
            </button>
          )}
          <button
            type="submit"
            form="wizard-active-form"
            className="btn green"
            disabled={overlayBusy}
          >
            {loading
              ? 'Guardando…'
              : step === 5 && buroPhase === 'authorize'
                ? buroBusy
                  ? 'Autorizando…'
                  : 'Enviar solicitud'
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

import type {
  AddressData,
  ContactData,
  CreditApplicationServerState,
  EmploymentData,
  EntryResolutionKind,
  IdentityData,
  QuoteContext,
} from '@/types/credit-application';

/**
 * Convención: cada request manda `serverState` con los IDs Finva acumulados
 * (cliente, workfloo, store, advisor, etc.) y la respuesta devuelve el mismo
 * objeto fusionado con los IDs nuevos. El cliente lo persiste en sessionStorage.
 */

type ApiResponse<T> = T & { ok?: boolean; error?: string; details?: unknown };

export class CreditApplicationApiError extends Error {
  status: number;
  details?: unknown;
  path: string;
  constructor(message: string, opts: { status: number; details?: unknown; path: string }) {
    super(message);
    this.name = 'CreditApplicationApiError';
    this.status = opts.status;
    this.details = opts.details;
    this.path = opts.path;
  }
}

function buildError(path: string, res: Response, data: ApiResponse<unknown>): never {
  const base = data.error || `Error ${res.status}`;
  // En dev el servidor incluye `details`. Si trae un string corto, lo añadimos
  // al mensaje. Si es un objeto, lo guardamos en .details y lo logueamos.
  let message = base;
  if (data.details !== undefined) {
    if (typeof data.details === 'string' && data.details.length < 200) {
      message = `${base} — ${data.details}`;
    } else {
      try {
        const summary = JSON.stringify(data.details);
        if (summary && summary.length < 240) message = `${base} — ${summary}`;
      } catch {
        /* ignore */
      }
      console.error(`[credit-application] ${path} ${res.status} details:`, data.details);
    }
  }
  throw new CreditApplicationApiError(message, {
    status: res.status,
    details: data.details,
    path,
  });
}

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || data.ok === false) buildError(path, res, data);
  return data;
}

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(path);
  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || data.ok === false) buildError(path, res, data);
  return data;
}

export type StateBag = { serverState?: CreditApplicationServerState | null };

export type StartApplicationResponse = {
  applicationId: string;
  serverState: CreditApplicationServerState;
};

export function startApplication(payload: {
  motorcycleId: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
  holdingPageUrl?: string;
  utm?: Record<string, string | undefined>;
}) {
  return post<StartApplicationResponse>('/api/application/start', payload);
}

export type ProbeResponse = StateBag & {
  resolution: EntryResolutionKind;
  mismatch?: { wrongField: 'email' | 'phone'; clue: string };
  hydratedIdentity?: Partial<IdentityData>;
  hydratedAddress?: Partial<AddressData>;
  neighborhoodOptions?: string[];
};

/**
 * Probe inicial post-StepContact: corre validate_phone + validate_client en
 * Finva y devuelve a qué rama del wizard saltar.
 */
export function probeContact(payload: {
  serverState?: CreditApplicationServerState | null;
  contact: ContactData;
  motorcycleId: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
  holdingPageUrl?: string;
  utm?: Record<string, string | undefined>;
}) {
  return post<ProbeResponse>('/api/application/probe', payload);
}

export function saveContact(serverState: CreditApplicationServerState, contact: ContactData) {
  return post<StateBag>('/api/application/contact', { serverState, contact });
}

export type CurpLookupResponse = IdentityData & { neighborhoods?: string[] };

export function lookupCurp(curp: string) {
  return get<CurpLookupResponse>(`/api/application/curp?curp=${encodeURIComponent(curp)}`);
}

export type ZipLookupResponse = {
  zip: string;
  ciudad: string;
  estado: string;
  neighborhoods: string[];
};

export function lookupZip(zip: string) {
  return get<ZipLookupResponse>(`/api/application/zip?zip=${encodeURIComponent(zip)}`);
}

export function saveIdentification(
  serverState: CreditApplicationServerState,
  identity: IdentityData
) {
  return post<StateBag>('/api/application/identification', { serverState, identity });
}

export type AddressResponse = StateBag & {
  neighborhoods?: string[];
  ciudad?: string;
  estado?: string;
};

export function saveAddress(payload: {
  serverState: CreditApplicationServerState;
  address: AddressData;
  /** Necesarios para crear/actualizar el cliente Finva con la dirección. */
  contact: ContactData;
  identity: IdentityData;
  motorcycleBrand: string;
}) {
  return post<AddressResponse>('/api/application/address', payload);
}

export function saveEmployment(
  serverState: CreditApplicationServerState,
  employment: EmploymentData
) {
  return post<StateBag>('/api/application/employment', { serverState, employment });
}

export type BuroRequestResponse = StateBag & {
  message?: string;
  /** Si `nipType === 'email'` el cliente debería sugerir corregir el teléfono. */
  nipType?: string;
};

export function requestBuroNip(
  serverState: CreditApplicationServerState,
  payload: {
    contact: ContactData;
    identity: IdentityData;
    address: AddressData;
    changePhoneTo?: string;
    /**
     * Cuando es true y ya existe `serverState.workflooId`, el server llama a
     * `/resend_nip_kiban` (no crea un workfloo nuevo) para respetar la lógica
     * de Kiban: WhatsApp → WhatsApp → email en el 3er intento.
     */
    resend?: boolean;
  }
) {
  return post<BuroRequestResponse>('/api/application/buro/request', {
    serverState,
    contact: payload.contact,
    identity: payload.identity,
    address: payload.address,
    changePhoneTo: payload.changePhoneTo,
    resend: payload.resend,
  });
}

export type BuroVerifyResponse = StateBag & {
  reportId?: number;
  valorScore?: number | null;
  clasificacion?: string | null;
};

export function verifyBuroNip(serverState: CreditApplicationServerState, nip: string) {
  return post<BuroVerifyResponse>('/api/application/buro/verify', { serverState, nip });
}

export type SubmitSolicitudResponse = StateBag & {
  solicitudId: number;
  agentName?: string | null;
  agentPhone?: string | null;
  alreadyExisted?: boolean;
};

export function submitSolicitud(payload: {
  serverState: CreditApplicationServerState;
  motorcycleId: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
  /** Opcional: omitir cuando `serverState.reportId` ya existe (rama with_report). */
  employment?: EmploymentData;
}) {
  return post<SubmitSolicitudResponse>('/api/application/submit', payload);
}

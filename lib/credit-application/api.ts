import type {
  AddressData,
  ContactData,
  EmploymentData,
  IdentityData,
  QuoteContext,
} from '@/types/credit-application';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

export type StartApplicationResponse = { applicationId: string };

export function startApplication(payload: {
  motorcycleId: string;
  motorcycleName: string;
  quote: QuoteContext;
}) {
  return post<StartApplicationResponse>('/api/application/start', payload);
}

export function saveContact(applicationId: string, contact: ContactData) {
  return post<{ ok: true }>('/api/application/contact', { applicationId, contact });
}

export type CurpLookupResponse = IdentityData & { neighborhoods?: string[] };

export function lookupCurp(curp: string) {
  return get<CurpLookupResponse>(`/api/application/curp?curp=${encodeURIComponent(curp)}`);
}

export function saveIdentification(applicationId: string, identity: IdentityData) {
  return post<{ ok: true }>('/api/application/identification', { applicationId, identity });
}

export function saveAddress(applicationId: string, address: AddressData) {
  return post<{ ok: true }>('/api/application/address', { applicationId, address });
}

export function saveEmployment(applicationId: string, employment: EmploymentData) {
  return post<{ ok: true }>('/api/application/employment', { applicationId, employment });
}

export function requestBuroNip(applicationId: string) {
  return post<{ ok: true; message?: string }>('/api/application/buro/request', { applicationId });
}

export function verifyBuroNip(applicationId: string, nip: string) {
  return post<{ ok: true }>('/api/application/buro/verify', { applicationId, nip });
}

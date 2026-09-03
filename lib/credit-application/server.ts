import { NextResponse } from 'next/server';
import type { CreditApplicationServerState } from '@/types/credit-application';

export function stubOk<T extends Record<string, unknown>>(data: T = {} as T) {
  return NextResponse.json({ ok: true, ...data });
}

type StubErrorOpts = {
  /** Cuerpo crudo devuelto por Finva (o similar). Se loguea siempre y, en dev, se devuelve al cliente. */
  details?: unknown;
  /** Etiqueta para correlacionar en logs (e.g. ruta o paso). */
  label?: string;
};

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function stubError(message: string, status = 400, opts: StubErrorOpts = {}) {
  const { details, label } = opts;
  if (status >= 500 || details !== undefined) {
    console.error(
      `[credit-application] ✗ ${label ? label + ' ' : ''}${status} ${message}` +
        (details !== undefined ? ` details=${safeStringify(details)}` : '')
    );
  } else if (status >= 400) {
    console.warn(
      `[credit-application] · ${label ? label + ' ' : ''}${status} ${message}`
    );
  }
  const body: Record<string, unknown> = { ok: false, error: message };
  // En desarrollo enviamos `details` al cliente para que los banners de la wizard
  // muestren info accionable. En producción los detalles sólo quedan en logs.
  if (details !== undefined && process.env.NODE_ENV !== 'production') {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function logApplicationPayload(label: string, payload: unknown) {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[credit-application] ${label}`, JSON.stringify(payload, null, 2));
}

export function mergeServerState(
  prev: Partial<CreditApplicationServerState> | undefined | null,
  patch: Partial<CreditApplicationServerState>
): CreditApplicationServerState {
  return { ...(prev ?? {}), ...patch } as CreditApplicationServerState;
}

export function isFinvaConfigured(): boolean {
  return Boolean(process.env.FINVA_API_URL?.trim() && process.env.FINVA_API_TOKEN?.trim());
}

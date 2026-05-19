import { NextResponse } from 'next/server';

export function stubOk<T extends Record<string, unknown>>(data: T = {} as T) {
  return NextResponse.json({ ok: true, ...data });
}

export function stubError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function logApplicationPayload(label: string, payload: unknown) {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[credit-application] ${label}`, JSON.stringify(payload, null, 2));
}

export function mockCurpLookup(curp: string) {
  const c = curp.toUpperCase();
  return {
    curp: c,
    firstName: 'Juan',
    middleName: 'Carlos',
    lastName: 'García',
    secondLastName: 'López',
    birthDate: '1990-05-15',
    neighborhoods: ['Centro', 'Santa Fe', 'Del Valle'],
  };
}

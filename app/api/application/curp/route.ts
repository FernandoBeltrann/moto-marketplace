/**
 * Consulta CURP en Finva. Devuelve también RFC (si Finva lo entrega) para
 * prefill. Las colonias se piden en el paso de domicilio (cuando ya hay CP).
 */
import { NextRequest } from 'next/server';
import { isValidCurp } from '@/lib/credit-application/validation';
import {
  isFinvaConfigured,
  logApplicationPayload,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { generateRfc, validateCurp } from '@/lib/finva/client';

type CurpFinvaResponse = Record<string, unknown> & {
  // Snake_case (algunos endpoints viejos)
  curp?: string;
  nombres?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  birth_date?: string;
  rfc?: string;
  // CamelCase (respuesta actual de /api/validate-curp con servicio "nobarium")
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: string;
};

/**
 * Respuesta cruda del backend Finva. Puede traer los campos en la raíz, o
 * envueltos en `client_data` (caso del proxy "nobarium").
 */
type CurpFinvaEnvelope = CurpFinvaResponse & {
  client_data?: CurpFinvaResponse;
  data?: CurpFinvaResponse;
};

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * El endpoint Finva `/generate_rfc` puede devolver el RFC en tres shapes
 * distintos según la implementación del proxy Kiban:
 *   - `{ rfc: "ABCD123" }`
 *   - `{ status: "success", rfc: "ABCD123" }`
 *   - `{ rfc: { response: { rfc: "ABCD123" } } }`
 * Este helper los normaliza para no acoplarnos a un shape específico.
 */
function extractRfc(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const obj = raw as Record<string, unknown>;
  if (typeof obj.rfc === 'string') return obj.rfc;
  if (obj.rfc && typeof obj.rfc === 'object') {
    const nested = obj.rfc as Record<string, unknown>;
    if (typeof nested.rfc === 'string') return nested.rfc;
    if (nested.response && typeof nested.response === 'object') {
      const r = (nested.response as Record<string, unknown>).rfc;
      if (typeof r === 'string') return r;
    }
  }
  return '';
}

function unwrap(raw: unknown): CurpFinvaResponse {
  if (!raw || typeof raw !== 'object') return {};
  const env = raw as CurpFinvaEnvelope;
  if (env.client_data && typeof env.client_data === 'object') return env.client_data;
  if (env.data && typeof env.data === 'object') return env.data;
  return env;
}

function pickName(data: CurpFinvaResponse): {
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
} {
  // `nombres` viene como string único (e.g. "FERNANDO" o "JUAN CARLOS"); lo
  // partimos para separar nombre y segundo nombre. Si vienen los campos
  // explícitos (primer_nombre/segundo_nombre), prevalecen.
  const nombres = asString(data.nombres);
  const [primer, ...rest] = nombres.split(/\s+/).filter(Boolean);
  return {
    firstName: asString(data.primer_nombre) || primer || '',
    middleName: asString(data.segundo_nombre) || rest.join(' '),
    lastName: asString(data.apellido_paterno) || asString(data.primerApellido),
    secondLastName: asString(data.apellido_materno) || asString(data.segundoApellido),
  };
}

export async function GET(req: NextRequest) {
  const curp = req.nextUrl.searchParams.get('curp')?.trim().toUpperCase() ?? '';
  if (!isValidCurp(curp)) return stubError('CURP inválido');

  if (!isFinvaConfigured()) {
    logApplicationPayload('curp (stub)', { curp });
    // En dev sin Finva devolvemos placeholder editable.
    return stubOk({
      curp,
      firstName: '',
      middleName: '',
      lastName: '',
      secondLastName: '',
      birthDate: '',
    });
  }

  const res = await validateCurp({ curp });
  if (!res.ok)
    return stubError(res.error || 'No pudimos validar tu CURP', res.status || 502, {
      label: 'curp validate',
      details: res.details,
    });

  const data = unwrap(res.data);
  const { firstName, middleName, lastName, secondLastName } = pickName(data);
  const birthDate =
    asString(data.birth_date) ||
    asString(data.fecha_nacimiento) ||
    asString(data.fechaNacimiento);

  let rfc = asString(data.rfc);
  if (!rfc && firstName && lastName && birthDate) {
    const generated = await generateRfc({
      nombres: [firstName, middleName].filter(Boolean).join(' '),
      apellidoPaterno: lastName,
      apellidoMaterno: secondLastName,
      fechaNacimiento: birthDate.replaceAll('/', '-'),
    });
    if (generated.ok) {
      rfc = extractRfc(generated.data) || rfc;
    }
  }

  return stubOk({
    curp,
    firstName,
    middleName,
    lastName,
    secondLastName,
    birthDate,
    rfc,
  });
}

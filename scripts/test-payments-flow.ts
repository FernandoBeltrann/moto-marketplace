#!/usr/bin/env tsx
/* eslint-disable no-console */
export {};
/**
 * End-to-end runner para el flujo de pago con tarjeta:
 *
 *   1. Genera un card_token contra `https://api.mercadopago.com/v1/card_tokens`
 *      usando la public key TEST-… de Motoclick. El holder name controla qué
 *      respuesta simula MP en sandbox:
 *
 *         APRO → approved
 *         CONT → in_process (pending)
 *         OTHE → rejected (cc_rejected_other_reason)
 *         CALL → cc_rejected_call_for_authorize
 *         FUND → cc_rejected_insufficient_amount
 *         SECU → cc_rejected_bad_filled_security_code
 *
 *      Card de prueba por default: Mastercard 5031 7557 3453 0604, CVV 123,
 *      vencimiento 11/30. Override con MP_TEST_CARD (16 dígitos).
 *
 *   2. POST /api/payments/process con el token + buyer + datos de la moto.
 *      Replica lo que el `Payment Brick` manda en producción.
 *
 *   3. Si status === 'approved', el route ya disparó los 2 correos vía Resend
 *      (`sendPurchaseInternalEmail` + `sendPurchaseClientEmail`).
 *
 *   4. POST /api/payments/webhook con `{ type:'payment', data:{ id } }`. En dev,
 *      cuando `MERCADOPAGO_WEBHOOK_SECRET` no está configurado, se salta la
 *      validación de firma; aquí lo aprovechamos para reproducir el webhook que
 *      MP enviaría desde su servidor. Es idempotente — si el correo ya se
 *      envió en /process, no se duplica.
 *
 * Requisitos:
 *   - Dev server arriba (`npm run dev` en otra terminal).
 *   - `.env` con `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-…` y
 *     `MERCADOPAGO_ACCESS_TOKEN=TEST-…` (ya están).
 *   - Para validar correos reales: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
 *     `RESEND_NOTIFY_EMAIL`. Si no están, el cliente Resend es no-op y
 *     simplemente loguea en server console.
 *
 * Cómo correrlo:
 *
 *     npm run dev                        # terminal 1
 *     npm run test:payments              # terminal 2  (corre los 3 escenarios)
 *     npm run test:payments -- approved  # sólo el escenario approved
 *     npm run test:payments -- pending rejected
 *
 * Overrides opcionales (env vars):
 *     TEST_BASE_URL          default http://localhost:3000
 *     TEST_MOTO_BRAND        default cfmoto
 *     TEST_MOTO_SLUG         default 450nk-2026
 *     TEST_BUYER_NAME        default "Fernando Test"
 *     TEST_BUYER_EMAIL       default `motoclick.buyer+<ts>@example.com`
 *     TEST_BUYER_PHONE       default 5512345678
 *     TEST_PAYMENT_METHOD    default credit_card
 *     TEST_INSTALLMENTS      default 12
 *     MP_PUBLIC_KEY          default NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
 *     MP_TEST_CARD           default 5031755734530604  (Mastercard sandbox)
 *     MP_TEST_PAYMENT_METHOD default master  (visa | master | amex)
 *     SKIP_WEBHOOK=1         no llamar a /api/payments/webhook al final
 */

const BASE = (process.env.TEST_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const MP_PUBLIC_KEY =
  process.env.MP_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? '';

const MOTO = {
  brand: process.env.TEST_MOTO_BRAND ?? 'cfmoto',
  slug: process.env.TEST_MOTO_SLUG ?? '450nk-2026',
};

const RUN_ID = Date.now().toString();
const BUYER = {
  fullName: process.env.TEST_BUYER_NAME ?? 'Fernando Test',
  email: process.env.TEST_BUYER_EMAIL ?? `motoclick.buyer+${RUN_ID}@example.com`,
  phone: process.env.TEST_BUYER_PHONE ?? '5512345678',
};

const PAYMENT_METHOD = (process.env.TEST_PAYMENT_METHOD ?? 'credit_card') as
  | 'credit_card'
  | 'debit_card';
const INSTALLMENTS = Number(process.env.TEST_INSTALLMENTS ?? '12');
const SKIP_WEBHOOK = process.env.SKIP_WEBHOOK === '1';

const CARD_NUMBER = (process.env.MP_TEST_CARD ?? '5031755734530604').replace(/\D/g, '');
const CARD_BRAND = (process.env.MP_TEST_PAYMENT_METHOD ?? 'master').toLowerCase();
const CARD_CVV = process.env.MP_TEST_CVV ?? '123';
const CARD_EXP_MONTH = Number(process.env.MP_TEST_EXP_MONTH ?? '11');
const CARD_EXP_YEAR = Number(process.env.MP_TEST_EXP_YEAR ?? '2030');

// ── escenarios ─────────────────────────────────────────────────────────────
type Scenario = {
  key: string;
  cardholderName: string;
  /** Lo que esperamos de MP. Sólo se usa para imprimir; no fallamos por
   *  mismatch porque sandbox a veces devuelve resultados distintos. */
  expectedStatus: 'approved' | 'in_process' | 'rejected';
  description: string;
};

const SCENARIOS: Record<string, Scenario> = {
  approved: {
    key: 'approved',
    cardholderName: 'APRO',
    expectedStatus: 'approved',
    description: 'pago aprobado en línea → dispara los 2 correos',
  },
  pending: {
    key: 'pending',
    cardholderName: 'CONT',
    expectedStatus: 'in_process',
    description: 'pago pendiente / en revisión → no envía correos',
  },
  rejected: {
    key: 'rejected',
    cardholderName: 'OTHE',
    expectedStatus: 'rejected',
    description: 'pago rechazado (cc_rejected_other_reason)',
  },
};

const REQUESTED = process.argv.slice(2).filter(Boolean);
const SCENARIOS_TO_RUN: Scenario[] = REQUESTED.length
  ? REQUESTED.map((k) => {
      const s = SCENARIOS[k.toLowerCase()];
      if (!s) {
        console.error(
          `Escenario desconocido: "${k}". Opciones: ${Object.keys(SCENARIOS).join(', ')}`
        );
        process.exit(1);
      }
      return s;
    })
  : Object.values(SCENARIOS);

// ── pretty printing ────────────────────────────────────────────────────────
const supportsColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';
const wrap = (code: string, s: string) => (supportsColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = {
  dim: (s: string) => wrap('2', s),
  red: (s: string) => wrap('31', s),
  green: (s: string) => wrap('32', s),
  yellow: (s: string) => wrap('33', s),
  cyan: (s: string) => wrap('36', s),
  bold: (s: string) => wrap('1', s),
  magenta: (s: string) => wrap('35', s),
};

function info(msg: string) {
  console.log(c.dim(`  ${msg}`));
}
function pass(msg: string) {
  console.log(`${c.green('✔')} ${msg}`);
}
function warn(msg: string) {
  console.log(`${c.yellow('⚠')} ${msg}`);
}
function fail(msg: string, detail?: unknown): never {
  console.error(`${c.red('✘')} ${msg}`);
  if (detail !== undefined) {
    try {
      console.error(c.dim(JSON.stringify(detail, null, 2).slice(0, 2400)));
    } catch {
      console.error(c.dim(String(detail)));
    }
  }
  process.exit(1);
}

// ── helpers HTTP ───────────────────────────────────────────────────────────
type Json = Record<string, unknown>;

async function jget<T = Json>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  let data: Json | { _raw: string };
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) fail(`GET ${url} → ${res.status}`, data);
  return data as T;
}

async function jpost<T = Json>(
  url: string,
  body: unknown,
  init?: { headers?: Record<string, string> }
): Promise<{ status: number; data: T }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Json | { _raw: string };
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data: data as T };
}

// ── card token ─────────────────────────────────────────────────────────────
type CardTokenResponse = {
  id: string;
  status?: string;
  first_six_digits?: string;
  last_four_digits?: string;
  cardholder?: { name?: string };
};

async function createCardToken(cardholderName: string): Promise<string> {
  if (!MP_PUBLIC_KEY) {
    fail(
      'Falta NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY (o MP_PUBLIC_KEY). ' +
        'Corre el script con `npx tsx --env-file=.env scripts/test-payments-flow.ts` ' +
        'o usa `npm run test:payments` que ya inyecta el env.'
    );
  }
  const url = `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(
    MP_PUBLIC_KEY
  )}`;
  const body = {
    card_number: CARD_NUMBER,
    expiration_month: CARD_EXP_MONTH,
    expiration_year: CARD_EXP_YEAR,
    security_code: CARD_CVV,
    cardholder: {
      name: cardholderName,
      identification: { type: 'DNI', number: '12345678' },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Json;
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) fail(`Mercado Pago card_tokens → ${res.status}`, data);
  const token = (data as CardTokenResponse).id;
  if (!token) fail('Mercado Pago no devolvió token', data);
  return token;
}

// ── /process ───────────────────────────────────────────────────────────────
type ProcessResponse = {
  ok?: boolean;
  error?: string;
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  expected?: number;
};

async function processPayment(
  scenario: Scenario,
  amount: number
): Promise<ProcessResponse> {
  const token = await createCardToken(scenario.cardholderName);
  info(`token=${token.slice(0, 8)}…  cardholder=${scenario.cardholderName}`);
  const installments = PAYMENT_METHOD === 'debit_card' ? 1 : INSTALLMENTS;
  const body = {
    formData: {
      token,
      payment_method_id: CARD_BRAND,
      transaction_amount: amount,
      installments,
      payer: {
        email: BUYER.email,
        identification: { type: 'DNI', number: '12345678' },
      },
    },
    selectedPaymentMethod: PAYMENT_METHOD,
    motorcycle: { brand: MOTO.brand, slug: MOTO.slug },
    buyer: BUYER,
  };
  const { status, data } = await jpost<ProcessResponse>(
    `${BASE}/api/payments/process`,
    body
  );
  if (status >= 400 && data.error) {
    fail(`/api/payments/process → ${status} ${data.error}`, data);
  }
  return data;
}

// ── /webhook ───────────────────────────────────────────────────────────────
async function simulateWebhook(paymentId: string): Promise<void> {
  const url = `${BASE}/api/payments/webhook?type=payment&data.id=${encodeURIComponent(paymentId)}`;
  const { status, data } = await jpost(
    url,
    { type: 'payment', data: { id: paymentId } },
    {
      headers: {
        'x-request-id': `test-${Date.now()}`,
        // x-signature se omite a propósito: en dev sin MERCADOPAGO_WEBHOOK_SECRET
        // el route bypasa la validación de firma.
      },
    }
  );
  if (status >= 400) {
    warn(
      `webhook → ${status}. Posiblemente tienes MERCADOPAGO_WEBHOOK_SECRET ` +
        `configurado en .env; bórralo o exporta SKIP_WEBHOOK=1 para saltarlo.`
    );
    info(JSON.stringify(data).slice(0, 400));
    return;
  }
  pass(`webhook procesado  status=${(data as Json).status ?? 'n/a'}`);
}

// ── runner ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  console.log(c.bold('Motoclick payment-flow test runner'));
  info(`base=${BASE}`);
  info(`moto=${MOTO.brand}/${MOTO.slug}`);
  info(`buyer=${BUYER.fullName} <${BUYER.email}> ${BUYER.phone}`);
  info(`paymentMethod=${PAYMENT_METHOD}  installments=${INSTALLMENTS}`);
  info(`card=${CARD_NUMBER.slice(0, 6)}…${CARD_NUMBER.slice(-4)} (${CARD_BRAND})`);

  if (!MP_PUBLIC_KEY) {
    fail(
      'No encuentro NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY. Corre con `npm run test:payments` ' +
        'o pasa el env: `MP_PUBLIC_KEY=TEST-… npx tsx scripts/test-payments-flow.ts`.'
    );
  }

  // Pre-fetch monto esperado del backend (fail-fast si la moto no existe).
  // Hacemos un POST con monto inválido (0) y leemos `expected` del error.
  const probe = await jpost<ProcessResponse>(`${BASE}/api/payments/process`, {
    formData: { token: 'probe', payment_method_id: 'master', transaction_amount: 0 },
    selectedPaymentMethod: PAYMENT_METHOD,
    motorcycle: { brand: MOTO.brand, slug: MOTO.slug },
    buyer: BUYER,
  });
  const amount = Number(probe.data.expected ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    fail(
      `No pude resolver el monto de la moto ${MOTO.brand}/${MOTO.slug}. ` +
        `Verifica que existe en la DB (Supabase). Respuesta del probe:`,
      probe.data
    );
  }
  info(`amount esperado por el server = $${amount.toLocaleString('es-MX')}`);

  return { amount };
}

async function runScenario(scenario: Scenario, amount: number) {
  console.log(
    `\n${c.bold(c.cyan(`━━━ Scenario: ${scenario.key.toUpperCase()} (cardholder=${scenario.cardholderName})`))}`
  );
  info(scenario.description);

  const result = await processPayment(scenario, amount);
  const status = (result.status ?? '').toLowerCase();
  const detail = result.status_detail ?? '';
  const id = String(result.id ?? '');
  const expected = scenario.expectedStatus;
  const headline = `id=${id}  status=${status}  status_detail=${detail}`;

  if (status === expected) {
    pass(`${headline}  ← coincide con expected (${expected})`);
  } else {
    warn(`${headline}  ← esperado=${expected}; revisa sandbox de MP`);
  }

  if (status === 'approved') {
    info('Resend debería haber recibido 2 correos (interno + cliente).');
    info(`  ⤷ revisa la terminal del dev server por logs "[email]" o "[payments]".`);
  } else {
    info('Sin emails (sólo se envían en status=approved).');
  }

  if (!SKIP_WEBHOOK && id) {
    console.log(c.magenta('  → simulando webhook /api/payments/webhook'));
    await simulateWebhook(id);
  }

  return { scenario, status, id };
}

async function main() {
  const { amount } = await bootstrap();
  const summary: Array<{ key: string; status: string; id: string }> = [];
  for (const s of SCENARIOS_TO_RUN) {
    const out = await runScenario(s, amount);
    summary.push({ key: s.key, status: out.status, id: out.id });
  }

  console.log(`\n${c.bold(c.green('✅ Scenarios completed'))}`);
  for (const row of summary) {
    console.log(`   ${row.key.padEnd(10)}  status=${row.status.padEnd(10)}  id=${row.id}`);
  }
}

main().catch((err) => {
  console.error(`\n${c.red(c.bold('Runner aborted'))}`);
  console.error(err?.stack ?? err);
  process.exit(1);
});

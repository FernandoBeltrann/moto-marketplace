#!/usr/bin/env tsx
/* eslint-disable no-console */
export {};
/**
 * End-to-end runner for /api/application/* endpoints.
 *
 * Hace todo lo que hace el wizard, pero se adapta a la "resolution" que
 * devuelve `/api/application/probe`:
 *
 *   - `unregistered` / `incomplete`  → flujo completo (CURP → ident → zip →
 *                                       address → employment → buró → submit)
 *   - `no_report`                    → hidratamos cliente, address (update),
 *                                       employment, buró, submit
 *   - `with_report`                  → hidratamos, address (update) y submit
 *                                       directo (sin empleo ni buró)
 *   - `mismatch`                     → aborta con el clue de Finva
 *
 * Defaults de moto: CFMOTO 450NK 2026 (finva_motorcycle_id=55).
 *
 * Cómo correrlo (con el dev server arriba en otra terminal):
 *
 *     npm run dev                    # terminal 1
 *     npm run test:flow              # terminal 2  (alta nueva con datos random)
 *
 *     # Reusa al cliente "Fernando Beltrán" que ya está en Finva:
 *     TEST_EMAIL=juan@ejemplo.com TEST_PHONE=5512345678 npm run test:flow
 *
 * Overrides opcionales (env vars):
 *     TEST_BASE_URL              default http://localhost:3000
 *     TEST_CURP                  default BEPF971128HDFLZR01
 *     TEST_ZIP                   default 01210
 *     TEST_NIP                   default 123456
 *     TEST_CHANGE_PHONE          default 5599887766
 *     TEST_EMAIL                 default `motoclick.test+<ts>@example.com`
 *     TEST_PHONE                 default `55########`   (10 dígitos)
 *     TEST_MOTO_ID               default cfmoto-450nk-2026
 *     TEST_MOTO_BRAND            default CFMOTO
 *     TEST_MOTO_MODEL            default 450NK
 *     TEST_MOTO_YEAR             default 2026
 *     TEST_MOTO_PRICE            default 119900
 *     TEST_MOTO_FINVA_ID         default 55
 *     TEST_QUOTE_DOWN            default 24000
 *     TEST_QUOTE_MONTHS          default 24
 *     TEST_QUOTE_MONTHLY         default 4550
 *     SKIP_CHANGE_PHONE=1        salta el paso 10
 *     SKIP_SUBMIT=1              corre todo hasta verify pero no crea solicitud
 *     FORCE_FULL_FLOW=1          ignora la resolución de probe y corre el flujo
 *                                completo de todas formas (útil para regresión)
 */

const BASE = (process.env.TEST_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CURP_VALUE = process.env.TEST_CURP ?? 'BEPF971128HDFLZR01';
const ZIP = process.env.TEST_ZIP ?? '01210';
const NIP = process.env.TEST_NIP ?? '123456';
const CHANGE_PHONE = process.env.TEST_CHANGE_PHONE ?? '5599887766';
const SKIP_CHANGE_PHONE = process.env.SKIP_CHANGE_PHONE === '1';
const SKIP_SUBMIT = process.env.SKIP_SUBMIT === '1';
const FORCE_FULL_FLOW = process.env.FORCE_FULL_FLOW === '1';

const RUN_ID = Date.now().toString();
const EMAIL = process.env.TEST_EMAIL ?? `motoclick.test+${RUN_ID}@example.com`;
const PHONE = process.env.TEST_PHONE ?? `55${RUN_ID.slice(-8)}`;

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
};

let stepIdx = 0;
function header(title: string) {
  stepIdx += 1;
  console.log(`\n${c.bold(c.cyan(`━━━ Step ${stepIdx}: ${title}`))}`);
}
function pass(msg: string) {
  console.log(`${c.green('✔')} ${msg}`);
}
function warn(msg: string) {
  console.log(`${c.yellow('⚠')} ${msg}`);
}
function info(msg: string) {
  console.log(c.dim(`  ${msg}`));
}
function fail(msg: string, detail?: unknown): never {
  console.error(`${c.red('✘')} ${msg}`);
  if (detail !== undefined) {
    try {
      console.error(c.dim(JSON.stringify(detail, null, 2).slice(0, 2000)));
    } catch {
      console.error(c.dim(String(detail)));
    }
  }
  process.exit(1);
}

// ── http ───────────────────────────────────────────────────────────────────
type Json = Record<string, unknown>;

async function call<T = Json>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    fail(
      `Network error hacia ${url}. ¿El dev server está corriendo (\`npm run dev\`)?`,
      err instanceof Error ? err.message : err
    );
  }
  const text = await res.text();
  let data: Json | { _raw: string };
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { _raw: text };
  }
  if (!res.ok || (data as Json).ok === false) {
    fail(`${method} ${path} → ${res.status} ${(data as Json).error ?? ''}`, data);
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── fixtures (matchear lo que el wizard manda en producción) ───────────────
const num = (v: string | undefined, fb: number) => (v ? Number(v) : fb);

const MOTO_PRICE = num(process.env.TEST_MOTO_PRICE, 119900);
const MOTORCYCLE = {
  motorcycleId: process.env.TEST_MOTO_ID ?? 'cfmoto-450nk-2026',
  motorcycleName: `${process.env.TEST_MOTO_BRAND ?? 'CFMOTO'} ${process.env.TEST_MOTO_MODEL ?? '450NK'}`,
  motorcycleBrand: process.env.TEST_MOTO_BRAND ?? 'CFMOTO',
  motorcycleModel: process.env.TEST_MOTO_MODEL ?? '450NK',
  motorcycleYear: num(process.env.TEST_MOTO_YEAR, 2026),
  motorcyclePrice: MOTO_PRICE,
  finvaMotorcycleId: num(process.env.TEST_MOTO_FINVA_ID, 55) as number | null,
};

const QUOTE = {
  price: MOTO_PRICE,
  downPayment: num(process.env.TEST_QUOTE_DOWN, 24000),
  months: num(process.env.TEST_QUOTE_MONTHS, 24),
  monthly: num(process.env.TEST_QUOTE_MONTHLY, 4550),
};

// ── tipos mínimos para no perder type-safety en el script ──────────────────
type ServerState = {
  applicationId: string;
  finvaUserId?: number | null;
  clienteId?: number | null;
  workflooId?: string | null;
  reportId?: number | null;
  storeId?: number | null;
  userId?: number | null;
  solicitudId?: number | null;
  resolution?: string;
};
type StateBag = { serverState: ServerState };
type HydratedIdentity = {
  curp?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  birthDate?: string;
  rfc?: string;
};
type HydratedAddress = {
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  postalCode?: string;
  neighborhood?: string;
  ciudad?: string;
  estado?: string;
};
type ProbeResp = StateBag & {
  resolution:
    | 'unregistered'
    | 'incomplete'
    | 'no_report'
    | 'with_report'
    | 'mismatch'
    | string;
  mismatch?: { wrongField: string; clue: string };
  hydratedIdentity?: HydratedIdentity;
  hydratedAddress?: HydratedAddress;
};
type CurpResp = {
  curp: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  birthDate: string;
  rfc?: string;
};
type ZipResp = { zip: string; ciudad: string; estado: string; neighborhoods: string[] };
type BuroReq = StateBag & { message?: string; nipType?: string };
type BuroVer = StateBag & {
  reportId?: number;
  valorScore?: number | null;
  clasificacion?: string | null;
};
type Submit = StateBag & {
  solicitudId: number;
  agentName?: string | null;
  agentPhone?: string | null;
  alreadyExisted?: boolean;
};

// ── shared payload types (espejo de los del wizard) ────────────────────────
type Identity = {
  curp: string;
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  birthDate: string;
  rfc?: string;
};
type Address = {
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  postalCode: string;
  neighborhood: string;
  ciudad?: string;
  estado?: string;
};
const employmentFixture = {
  company: 'Acme S.A. de C.V.',
  role: 'Ingeniero',
  tenureMonths: 36,
  incomeSourceType: 'PF' as const,
  incomeProof: 'Recibo de Nómina' as const,
  monthlyIncome: 25000,
  creditHistory: 'Siempre he pagado a tiempo' as const,
  possibleGuarantor: 'NO' as const,
};
const addressFallback: Address = {
  street: 'Benjamín Franklin',
  exteriorNumber: '100',
  interiorNumber: '',
  postalCode: ZIP,
  neighborhood: '',
  ciudad: '',
  estado: '',
};

// ── sub-steps reutilizables ────────────────────────────────────────────────
async function lookupCurp(): Promise<Identity> {
  header('curp lookup');
  const curp = await call<CurpResp>('GET', `/api/application/curp?curp=${CURP_VALUE}`);
  const identity: Identity = {
    curp: curp.curp ?? CURP_VALUE,
    firstName: curp.firstName,
    middleName: curp.middleName ?? '',
    lastName: curp.lastName,
    secondLastName: curp.secondLastName ?? '',
    birthDate: curp.birthDate,
    rfc: curp.rfc,
  };
  pass(
    `${identity.firstName} ${identity.middleName} ${identity.lastName} ${identity.secondLastName}`
      .replace(/\s+/g, ' ')
      .trim()
  );
  info(`rfc=${identity.rfc ?? 'n/a'}  birthDate=${identity.birthDate}`);
  if (!identity.rfc) {
    fail(
      `Finva no devolvió RFC en /validate-curp. El paso de buró fallará con ` +
        `\`rfc_pf REQUIRED_FIELD_ERROR\`.`,
      curp
    );
  }
  return identity;
}

function identityFromHydration(h: HydratedIdentity | undefined): Identity {
  if (!h?.firstName || !h?.lastName || !h?.curp) {
    fail(`hydratedIdentity insuficiente (faltan firstName/lastName/curp)`, h);
  }
  return {
    curp: h.curp ?? '',
    firstName: h.firstName ?? '',
    middleName: h.middleName ?? '',
    lastName: h.lastName ?? '',
    secondLastName: h.secondLastName ?? '',
    birthDate: h.birthDate ?? '',
    rfc: h.rfc,
  };
}

async function buildAddress(hydrated?: HydratedAddress): Promise<Address> {
  header('zip lookup');
  const postalCode = hydrated?.postalCode || ZIP;
  const zip = await call<ZipResp>('GET', `/api/application/zip?zip=${postalCode}`);
  pass(`ciudad=${zip.ciudad}  estado=${zip.estado}`);
  info(`neighborhoods=${(zip.neighborhoods ?? []).join(', ') || '(none)'}`);
  const colonia =
    hydrated?.neighborhood?.trim() || zip.neighborhoods?.[0] || addressFallback.neighborhood || 'Centro';
  return {
    street: hydrated?.street?.trim() || addressFallback.street,
    exteriorNumber: hydrated?.exteriorNumber?.trim() || addressFallback.exteriorNumber,
    interiorNumber: hydrated?.interiorNumber ?? addressFallback.interiorNumber,
    postalCode,
    neighborhood: colonia,
    ciudad: zip.ciudad,
    estado: zip.estado,
  };
}

async function saveIdentification(serverState: ServerState, identity: Identity): Promise<ServerState> {
  header('save identification');
  const ident = await call<StateBag>('POST', '/api/application/identification', {
    serverState,
    identity,
  });
  pass('saved');
  return ident.serverState;
}

async function saveAddress(
  serverState: ServerState,
  identity: Identity,
  address: Address
): Promise<ServerState> {
  header('save address (POST/PUT /cliente)');
  const addr = await call<StateBag & { neighborhoods?: string[] }>(
    'POST',
    '/api/application/address',
    {
      serverState,
      address,
      contact: { email: EMAIL, phone: PHONE },
      identity,
      motorcycleBrand: MOTORCYCLE.motorcycleBrand,
    }
  );
  pass(
    `clienteId=${addr.serverState.clienteId}  storeId=${addr.serverState.storeId}  ` +
      `userId=${addr.serverState.userId}`
  );
  return addr.serverState;
}

async function saveEmployment(serverState: ServerState): Promise<ServerState> {
  header('save employment + key questions (PUT /cliente)');
  const emp = await call<StateBag>('POST', '/api/application/employment', {
    serverState,
    employment: employmentFixture,
  });
  pass('saved');
  return emp.serverState;
}

async function runBuroLoop(
  serverState: ServerState,
  identity: Identity,
  address: Address
): Promise<ServerState> {
  // 1er envío
  header('buro/request — 1st send (NIP por WhatsApp/SMS)');
  let r = await call<BuroReq>('POST', '/api/application/buro/request', {
    serverState,
    contact: { email: EMAIL, phone: PHONE },
    identity,
    address,
  });
  serverState = r.serverState;
  pass(`nipType=${r.nipType ?? 'sms/whatsapp'}  workflooId=${serverState.workflooId}`);
  info(`message="${r.message ?? ''}"`);

  const workflooBeforeResend = serverState.workflooId;

  // 2do envío — RESEND sobre el mismo workfloo. El wizard manda `resend: true`
  // para que el server llame `/resend_nip_kiban` (no `/send_nip_kiban`),
  // preservando el contador de intentos de Kiban.
  header('buro/request — 2nd send (resend sobre mismo workfloo)');
  await sleep(1500);
  r = await call<BuroReq>('POST', '/api/application/buro/request', {
    serverState,
    contact: { email: EMAIL, phone: PHONE },
    identity,
    address,
    resend: true,
  });
  serverState = r.serverState;
  pass(`nipType=${r.nipType ?? 'sms/whatsapp'}`);
  if (serverState.workflooId !== workflooBeforeResend) {
    warn(
      `workflooId cambió tras 'resend' (antes=${workflooBeforeResend} ahora=${serverState.workflooId}). ` +
        `Esperábamos que se reutilizara para que Kiban escale a email en el 3er intento.`
    );
  } else {
    info(`workflooId conservado: ${serverState.workflooId}`);
  }

  // 3er envío (esperamos email fallback)
  header('buro/request — 3rd send (esperando fallback a EMAIL)');
  await sleep(1500);
  r = await call<BuroReq>('POST', '/api/application/buro/request', {
    serverState,
    contact: { email: EMAIL, phone: PHONE },
    identity,
    address,
    resend: true,
  });
  serverState = r.serverState;
  if (r.nipType === 'email') {
    pass(`nipType=email  ← fallback al 3er intento, como se esperaba`);
  } else {
    warn(
      `nipType=${r.nipType ?? '(none)'} — esperábamos 'email' al 3er intento. ` +
        `Si Finva sandbox no implementa el fallback aún, ignora este warning.`
    );
  }
  if (serverState.workflooId !== workflooBeforeResend) {
    warn(
      `workflooId cambió en el 3er intento (antes=${workflooBeforeResend} ahora=${serverState.workflooId}).`
    );
  }

  // Cambiar teléfono
  if (!SKIP_CHANGE_PHONE) {
    header(`buro/request — change phone to ${CHANGE_PHONE}`);
    r = await call<BuroReq>('POST', '/api/application/buro/request', {
      serverState,
      contact: { email: EMAIL, phone: PHONE },
      identity,
      address,
      changePhoneTo: CHANGE_PHONE,
    });
    pass(`nipType=${r.nipType ?? 'sms/whatsapp'}  message="${r.message ?? ''}"`);
  } else {
    info('SKIP_CHANGE_PHONE=1 → salto cambio de teléfono');
  }

  // Verify
  header(`buro/verify NIP=${NIP}`);
  const ver = await call<BuroVer>('POST', '/api/application/buro/verify', {
    serverState,
    nip: NIP,
  });
  serverState = ver.serverState;
  pass(
    `reportId=${ver.reportId}  score=${ver.valorScore ?? 'n/a'}  clas=${ver.clasificacion ?? 'n/a'}`
  );
  return serverState;
}

async function submitSolicitud(
  serverState: ServerState,
  withEmployment: boolean
): Promise<ServerState> {
  if (SKIP_SUBMIT) {
    info('SKIP_SUBMIT=1 → no creo solicitud final');
    return serverState;
  }
  header(
    withEmployment
      ? 'submit solicitud (POST /add_solicitud)'
      : 'submit solicitud — atajo with_report (sin employment)'
  );
  const sub = await call<Submit>('POST', '/api/application/submit', {
    serverState,
    ...MOTORCYCLE,
    quote: QUOTE,
    ...(withEmployment ? { employment: employmentFixture } : {}),
  });
  pass(
    `solicitudId=${sub.solicitudId}  agentName=${sub.agentName ?? 'n/a'}  ` +
      `agentPhone=${sub.agentPhone ?? 'n/a'}  alreadyExisted=${sub.alreadyExisted ?? false}`
  );
  return sub.serverState;
}

// ── runner ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold('Motoclick credit-application test runner'));
  info(`base=${BASE}`);
  info(`email=${EMAIL}`);
  info(`phone=${PHONE}`);
  info(`moto=${MOTORCYCLE.motorcycleName} (finva=${MOTORCYCLE.finvaMotorcycleId})  price=$${MOTORCYCLE.motorcyclePrice}`);
  info(`curp=${CURP_VALUE}  zip=${ZIP}  nip=${NIP}`);

  // ── probe ────────────────────────────────────────────────────────────────
  header('probe contact');
  const probe = await call<ProbeResp>('POST', '/api/application/probe', {
    serverState: null,
    contact: { email: EMAIL, phone: PHONE },
    ...MOTORCYCLE,
    quote: QUOTE,
  });
  let serverState = probe.serverState;
  pass(`resolution=${probe.resolution}`);
  info(`applicationId=${serverState.applicationId}  finvaUserId=${serverState.finvaUserId}`);
  if (probe.serverState.reportId) info(`reportId previo=${probe.serverState.reportId}`);
  if (probe.serverState.clienteId) info(`clienteId previo=${probe.serverState.clienteId}`);

  if (probe.resolution === 'mismatch') {
    fail(
      `mismatch: el campo "${probe.mismatch?.wrongField}" no coincide con el cliente. ` +
        `Clue de Finva: ${probe.mismatch?.clue}`,
      probe.mismatch
    );
  }

  const resolution = FORCE_FULL_FLOW ? 'unregistered' : probe.resolution;
  if (FORCE_FULL_FLOW) info('FORCE_FULL_FLOW=1 → trato la resolución como `unregistered`');

  // ── decisión de rama ─────────────────────────────────────────────────────
  let identity: Identity;
  let address: Address;
  let withEmployment = true;

  if (resolution === 'with_report') {
    info('🟢 rama with_report → hidrato, address (update), submit directo');
    identity = identityFromHydration(probe.hydratedIdentity);
    address = await buildAddress(probe.hydratedAddress);
    serverState = await saveAddress(serverState, identity, address);
    withEmployment = false;
    serverState = await submitSolicitud(serverState, withEmployment);
  } else if (resolution === 'no_report') {
    info('🟡 rama no_report → hidrato, address, employment, buró, submit');
    identity = identityFromHydration(probe.hydratedIdentity);
    address = await buildAddress(probe.hydratedAddress);
    serverState = await saveIdentification(serverState, identity);
    serverState = await saveAddress(serverState, identity, address);
    serverState = await saveEmployment(serverState);
    serverState = await runBuroLoop(serverState, identity, address);
    serverState = await submitSolicitud(serverState, withEmployment);
  } else if (resolution === 'incomplete') {
    info('🟠 rama incomplete → hidrato lo que haya y completo con CURP');
    identity = await lookupCurp();
    address = await buildAddress(probe.hydratedAddress);
    serverState = await saveIdentification(serverState, identity);
    serverState = await saveAddress(serverState, identity, address);
    serverState = await saveEmployment(serverState);
    serverState = await runBuroLoop(serverState, identity, address);
    serverState = await submitSolicitud(serverState, withEmployment);
  } else {
    // unregistered (o cualquier otra) → flujo completo
    info('🔵 rama unregistered → flujo completo');
    identity = await lookupCurp();
    address = await buildAddress();
    serverState = await saveIdentification(serverState, identity);
    serverState = await saveAddress(serverState, identity, address);
    serverState = await saveEmployment(serverState);
    serverState = await runBuroLoop(serverState, identity, address);
    serverState = await submitSolicitud(serverState, withEmployment);
  }

  console.log(`\n${c.bold(c.green('✅ Flow completed'))}`);
  console.log(`   resolution   = ${resolution}`);
  console.log(`   email        = ${EMAIL}`);
  console.log(`   phone        = ${PHONE}`);
  console.log(`   clienteId    = ${serverState.clienteId}`);
  console.log(`   workflooId   = ${serverState.workflooId ?? '(skipped buró)'}`);
  console.log(`   reportId     = ${serverState.reportId}`);
  console.log(`   solicitudId  = ${serverState.solicitudId ?? '(skipped)'}`);
}

main().catch((err) => {
  console.error(`\n${c.red(c.bold('Flow aborted'))}`);
  console.error(err?.stack ?? err);
  process.exit(1);
});

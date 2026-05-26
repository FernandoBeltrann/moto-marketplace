export type QuoteContext = {
  price: number;
  downPayment: number;
  months: number;
  monthly: number;
};

export type ContactData = {
  email: string;
  phone: string;
};

export type IdentityData = {
  curp: string;
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  birthDate: string;
  /** Generado o validado por Finva tras consultar CURP. Opcional en cliente. */
  rfc?: string;
};

export type AddressData = {
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  postalCode: string;
  neighborhood: string;
  /** Devueltos por validate_zip_code; cacheados para evitar reconsultas. */
  ciudad?: string;
  estado?: string;
};

/** Catálogo cerrado de "Forma de percibir ingresos" (Finva). */
export const INCOME_SOURCE_TYPES = [
  { value: 'PF', label: 'Persona Física (Asalariado)' },
  { value: 'PFAE', label: 'Persona Física con Actividad Empresarial' },
  { value: 'Independiente Informal', label: 'Independiente Informal' },
  { value: 'PM', label: 'Persona Moral' },
  { value: 'Jubilado', label: 'Jubilado' },
  { value: 'Accionista', label: 'Accionista' },
] as const;
export type IncomeSourceType = (typeof INCOME_SOURCE_TYPES)[number]['value'];

/** Catálogo cerrado de "Comprobación de ingresos" (Finva). */
export const INCOME_PROOFS = [
  'Recibo de Nómina',
  'Estados de Cuenta',
  'Declaración ante SAT',
  'No compruebo ingresos',
] as const;
export type IncomeProof = (typeof INCOME_PROOFS)[number];

/** Catálogo cerrado de "Historial crediticio" (Finva). */
export const CREDIT_HISTORY_OPTIONS = [
  'Siempre he pagado a tiempo',
  'Me he atrasado de 1 a 60 días',
  'Me he atrasado de 61 días a 12 meses',
  'Me he atrasado más de 12 meses',
  'He renegociado deudas',
  'Nunca he tenido algún crédito',
] as const;
export type CreditHistoryOption = (typeof CREDIT_HISTORY_OPTIONS)[number];

export type GuarantorOption = 'Si' | 'NO';

/**
 * Empleo + 5 preguntas clave (Diego). `role` → `profesion` en PUT `/cliente`;
 * el resto de las preguntas va en `/add_solicitud` al crear la solicitud.
 */
export type EmploymentData = {
  company: string;
  role: string;
  tenureMonths: number;
  incomeSourceType: IncomeSourceType;
  incomeProof: IncomeProof;
  monthlyIncome: number;
  creditHistory: CreditHistoryOption;
  possibleGuarantor: GuarantorOption;
};

export type CreditApplicationFormData = {
  contact?: ContactData;
  identity?: IdentityData;
  address?: AddressData;
  employment?: EmploymentData;
};

/** Resultado del probe `/validate_phone` + `/validate_client`. */
export type EntryResolutionKind =
  | 'unregistered'
  | 'incomplete'
  | 'no_report'
  | 'with_report'
  | 'mismatch';

/**
 * Snapshot mínimo del cliente Finva tal como lo devolvió `/validate_client`.
 * Lo guardamos para hacer diff y decidir si hay que `PUT /cliente/{id}` antes
 * de seguir adelante (auto-sync).
 */
export type ClientSnapshot = {
  curp?: string;
  rfc?: string;
  name?: string;
  second_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  zip_code?: string;
  ciudad?: string;
  estado?: string;
  suburb_colonia?: string;
  street_address?: string;
  interior_number?: string;
};

/**
 * IDs y estado devueltos por Finva durante el flujo. Se acumulan en cliente
 * (sessionStorage) y se reenvían al servidor en cada llamada para que el
 * server actúe como proxy stateless.
 */
export type CreditApplicationServerState = {
  applicationId: string;
  finvaUserId?: number | null;
  clienteId?: number | null;
  workflooId?: string | null;
  reportId?: number | null;
  storeId?: number | null;
  userId?: number | null;
  solicitudId?: number | null;
  agentName?: string | null;
  agentPhone?: string | null;
  /** Resolución de la entrada (probe). */
  resolution?: EntryResolutionKind;
  /** Última copia del cliente devuelta por Finva. Sirve de baseline para diffs. */
  clientSnapshot?: ClientSnapshot | null;
};

export type CreditApplicationState = {
  applicationId: string | null;
  motorcycleId: string;
  motorcycleName: string;
  quote: QuoteContext;
  step: number;
  form: CreditApplicationFormData;
  serverState?: CreditApplicationServerState | null;
};

export const CREDIT_APP_STEPS = [
  { id: 1, title: 'Datos de contacto', subtitle: 'Solo email y WhatsApp para avanzar.' },
  { id: 2, title: 'Identificación', subtitle: 'Consultamos tu CURP y confirmas tus datos.' },
  { id: 3, title: 'Domicilio', subtitle: 'Usa el domicilio de tus comprobantes.' },
  { id: 4, title: 'Empleo y perfil', subtitle: 'Empleo actual y 5 preguntas para evaluar tu perfil.' },
  { id: 5, title: 'Buró de crédito', subtitle: 'Acepta términos, autoriza la consulta e ingresa tu NIP.' },
  { id: 6, title: 'Conoce tu oferta', subtitle: 'Continúa con tu agente Finva por WhatsApp.' },
] as const;

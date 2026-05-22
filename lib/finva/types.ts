/**
 * Tipos serializables de la API Finva. Mantienen los nombres de campo exactos
 * que el backend espera/devuelve (snake_case y casing tal cual). No usar para
 * UI directamente — la wizard tiene sus propios tipos en `types/credit-application`.
 */

export type FinvaResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; details?: unknown };

export type FinvaCoordinates = { lat: number; lng: number };

export type FinvaStore = {
  id: number;
  /** Nuevo: response actual de `/get_stores` (campo `nombre`). */
  nombre?: string;
  /** Legacy: algunos endpoints devuelven `name`. */
  name?: string;
  /** Nuevo: dirección legible (`ubicacion`). */
  ubicacion?: string;
  /** Legacy: equivalente a `ubicacion`. */
  address?: string;
  coordinates?: FinvaCoordinates | null;
  razon_social?: string;
  /** Nuevo: catálogo de marcas (id + nombre). */
  brand_id?: number;
  brand_name?: string;
  /** Legacy: algunos endpoints exponen sólo `marca` en string. */
  marca?: string;
  estado?: string;
  ciudad?: string;
  zip_code?: string | null;
  active?: boolean;
  credit_card_payment_method?: boolean;
  crm_sync?: string;
};

/**
 * Respuesta de `/get_stores`. El backend actual la envuelve en `stores_data`;
 * el helper `unwrapStores` normaliza ambas formas.
 */
export type FinvaStoresResponse = {
  stores_data?: FinvaStore[];
  status?: string;
  count?: number;
  filters_applied?: Record<string, unknown>;
  holding_filter?: string;
};

export type FinvaAdvisor = {
  id: number;
  name?: string;
  second_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  email?: string;
  phone_number?: string;
};

export type FinvaCliente = {
  id?: number;
  name: string;
  second_name?: string;
  first_last_name: string;
  second_last_name?: string;
  phone: string;
  email: string;
  curp?: string;
  rfc?: string;
  birth_date?: string;
  sex?: string;
  born_state?: string;
  zip_code?: string;
  ciudad?: string;
  estado?: string;
  suburb_colonia?: string;
  street_address?: string;
  interior_number?: string;
  id_type?: string;
  id_number?: string;
  id_expiration_date?: string;
  marital_status?: string;
  level_studies?: string;
  profesion?: string;
  housing_status?: string;
  time_living_there?: string;
  economic_dependants?: number;
  user_id?: number | null;
  finva_user_id?: number | null;
  flow_process?: string;
};

/** 5 preguntas clave del perfil — se envían en `/add_solicitud`, no en PUT `/cliente`. */
export type FinvaSolicitudKeyQuestions = {
  income_source_type?: string[];
  income_proof?: string[];
  monthly_income?: number | null;
  client_credit_history_description?: string;
  possible_guarantor?: string;
};

export type FinvaUnknownClientPayload = {
  phone: string;
  email: string;
  flow_process: 'onCreditWeb';
  user_id: number | null;
  motorcycle_id: number | null;
  motorcycle_data?: Record<string, unknown>;
  holding_page_url: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  other_url_params?: string;
  finva_user_id?: number | null;
};

export type FinvaKibanResponse = {
  workflooId?: string;
  status?: string;
  phase?: 'VALIDATE_2' | 'VALIDATED' | string;
  nipType?: 'sms' | 'whatsapp' | 'email' | string;
  /** Algunos endpoints envuelven la respuesta en `response`. */
  response?: FinvaKibanResponse;
};

export type FinvaBcReport = {
  report_id: number;
  cliente_id: number;
  valor_score?: number | null;
  clasificacion?: string | null;
};

export type FinvaSolicitud = {
  id: number;
  cliente_id: number;
  report_id?: number | null;
  user_id?: number | null;
  finva_user_id?: number | null;
  id_motorcycle?: number | null;
  brand_motorcycle?: string;
  model_motorcycle?: string;
  year_motorcycle?: string;
  invoice_motorcycle_value?: number;
  percentage_down_payment?: number;
  payment_method?: 'credit' | 'cash' | string;
  preferred_store_id?: number | null;
  credit_preference?: 'price' | 'speed' | null;
  holding_page_url?: string;
  parent_solicitud_id?: number | null;
  created_at?: string;
};

/**
 * Payload de `/add_solicitud`. `id_motorcycle` quedó deprecado en el backend
 * (responde `Unknown field.`), por eso lo excluimos del request. Si llega a
 * volver, hay que reactivarlo en `FinvaSolicitud` y removerlo del Omit aquí.
 */
export type FinvaAddSolicitudPayload = Omit<
  FinvaSolicitud,
  'id' | 'created_at' | 'id_motorcycle'
> &
  FinvaSolicitudKeyQuestions;

export type FinvaZipResponse = {
  ciudad?: string;
  estado?: string;
  zip_code?: string;
};

/**
 * Respuesta de `GET /validate_phone`. Es el "probe" inicial que decide qué flujo
 * tomar después de que el usuario captura email + WhatsApp.
 *
 * - HTTP 404 → no hay cliente con esa combinación. Lo modelamos a nivel de
 *   `FinvaResult.status === 404` en el route handler.
 * - HTTP 200 `{ status: "validated" }` → ambos campos pertenecen al mismo cliente.
 * - HTTP 200 `{ status: "invalid", type, clue }` → uno de los campos no coincide
 *   (mismatch). `type` indica cuál es el campo erróneo; `clue` es un hint
 *   enmascarado del valor registrado.
 */
export type FinvaValidatePhoneResponse =
  | { status: 'validated' }
  | { status: 'invalid'; type: 'email' | 'phone'; clue: string };

/**
 * Respuesta de `GET /validate_client`. Sólo se llama cuando `/validate_phone`
 * devolvió `validated`. Hidrata el formulario con los datos almacenados.
 */
export type FinvaValidateClientResponse = {
  client: FinvaCliente & { id: number };
  /** `report_id` cuando el cliente ya tiene un BC vigente. */
  report?: number | null;
  files?: Record<string, string>;
  /** True cuando ya subieron INE. */
  id?: boolean;
  id_details?: Record<string, unknown>;
  has_purchases?: boolean;
};

/**
 * Respuesta de `/get_neighborhoods/{cp}`. El backend actual devuelve
 * `{ city, state, neighborhoods[] }` en una sola llamada. Algunos endpoints
 * legacy devuelven sólo el array de colonias — el cliente lo normaliza.
 */
export type FinvaNeighborhoodsResponse = {
  city?: string;
  state?: string;
  neighborhoods?: string[];
};

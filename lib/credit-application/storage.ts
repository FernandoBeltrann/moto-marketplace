/**
 * Persistencia del wizard de crédito.
 *
 * Usamos `localStorage` (no `sessionStorage`) para que el progreso sobreviva
 * a cierres de pestaña y refreshes — es lo que pidió el usuario para no tener
 * que volver a tipear todo durante testing. La ÚNICA condición para borrar el
 * estado es que cambien el email o el WhatsApp en el paso 1 (se hace en el
 * wizard via `resetForNewContact` → `clearCreditAppState`).
 *
 * Para no perder sesiones viejas guardadas en `sessionStorage`, el `load`
 * también hace una migración perezosa la primera vez que se llama.
 */
import type { CreditApplicationState } from '@/types/credit-application';

function key(motorcycleId: string) {
  return `credit-app:${motorcycleId}`;
}

function readFromStore(
  store: Storage | undefined,
  motorcycleId: string
): Partial<CreditApplicationState> | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key(motorcycleId));
    return raw ? (JSON.parse(raw) as Partial<CreditApplicationState>) : null;
  } catch {
    return null;
  }
}

export function loadCreditAppState(motorcycleId: string): Partial<CreditApplicationState> | null {
  if (typeof window === 'undefined') return null;
  // 1) Source of truth: localStorage.
  const fromLocal = readFromStore(window.localStorage, motorcycleId);
  if (fromLocal) return fromLocal;

  // 2) Migración perezosa de sessionStorage → localStorage (sólo aplica a
  //    usuarios que ya tenían progreso guardado con la versión anterior).
  const fromSession = readFromStore(window.sessionStorage, motorcycleId);
  if (fromSession) {
    try {
      window.localStorage.setItem(key(motorcycleId), JSON.stringify(fromSession));
      window.sessionStorage.removeItem(key(motorcycleId));
    } catch {
      /* quota / acceso denegado: devolvemos el snapshot igualmente */
    }
    return fromSession;
  }
  return null;
}

export function saveCreditAppState(state: CreditApplicationState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(state.motorcycleId), JSON.stringify(state));
  } catch {
    /* quota — el wizard sigue funcionando en memoria */
  }
}

export function clearCreditAppState(motorcycleId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(motorcycleId));
  } catch {
    /* noop */
  }
  // Por si la migración no corrió aún, limpiamos también la copia vieja.
  try {
    window.sessionStorage.removeItem(key(motorcycleId));
  } catch {
    /* noop */
  }
}

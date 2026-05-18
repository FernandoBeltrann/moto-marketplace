import type { CreditApplicationState } from '@/types/credit-application';

function key(motorcycleId: string) {
  return `credit-app:${motorcycleId}`;
}

export function loadCreditAppState(motorcycleId: string): Partial<CreditApplicationState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(motorcycleId));
    return raw ? (JSON.parse(raw) as Partial<CreditApplicationState>) : null;
  } catch {
    return null;
  }
}

export function saveCreditAppState(state: CreditApplicationState) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key(state.motorcycleId), JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function clearCreditAppState(motorcycleId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key(motorcycleId));
}

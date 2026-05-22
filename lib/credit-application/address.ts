import type { AddressData } from '@/types/credit-application';

/** Último token típico de número exterior (MX): 500, 123-A, #12, S/N. */
const EXTERIOR_TOKEN = /^(?:#?\d+[A-Za-z0-9\-]*|S\/?N|SN)$/i;

/**
 * Finva guarda calle + exterior en un solo `street_address`. Separamos el último
 * segmento cuando parece número exterior para prellenar el wizard.
 */
export function splitStreetAndExterior(fullStreet: string): {
  street: string;
  exteriorNumber: string;
} {
  const trimmed = fullStreet.trim();
  if (!trimmed) return { street: '', exteriorNumber: '' };

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return { street: trimmed, exteriorNumber: '' };

  const last = parts[parts.length - 1]!;
  if (!EXTERIOR_TOKEN.test(last)) return { street: trimmed, exteriorNumber: '' };

  const exteriorNumber = last.startsWith('#') ? last.slice(1) : last;
  const street = parts.slice(0, -1).join(' ').trim();
  return { street, exteriorNumber };
}

export function normalizeHydratedAddress(
  address?: Partial<AddressData>
): Partial<AddressData> | undefined {
  if (!address) return address;
  const street = address.street?.trim() ?? '';
  const exterior = address.exteriorNumber?.trim() ?? '';
  if (!street || exterior) return address;

  const split = splitStreetAndExterior(street);
  if (!split.exteriorNumber) return address;

  return {
    ...address,
    street: split.street,
    exteriorNumber: split.exteriorNumber,
  };
}

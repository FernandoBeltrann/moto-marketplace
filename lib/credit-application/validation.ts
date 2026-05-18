export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** 10 dígitos MX (sin código país). */
export function normalizeMxPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(-10);
}

export function isValidMxPhone(value: string): boolean {
  return /^\d{10}$/.test(normalizeMxPhone(value));
}

export function isValidCurp(value: string): boolean {
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i.test(value.trim());
}

export function isValidPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function isValidNip(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

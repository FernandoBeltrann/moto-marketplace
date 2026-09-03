import { normalizeMxPhone } from './validation';

export function formatMxPhoneDisplay(value: string): string {
  const d = normalizeMxPhone(value);
  if (d.length !== 10) return value;
  return `+52 ${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

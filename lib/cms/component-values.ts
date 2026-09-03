/**
 * Serializa/parsea los tipos de campo "tags" y "keyvalue" del registry
 * (`lib/cms/component-registry.ts`) — compartido entre el Studio (que
 * escribe el string que teclea marketing) y las páginas reales (que lo
 * convierten de vuelta al shape que ya usa el componente de código,
 * ej. `string[]` para tags o `Record<string,string>` para specs).
 */

/** "Delivery, Trabajo diario, Bajo presupuesto" -> ['Delivery', 'Trabajo diario', 'Bajo presupuesto'] */
export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeTags(tags: string[]): string {
  return tags.join(', ');
}

/** "Uso: Trabajo\nMotor: 144.8 cc" -> { Uso: 'Trabajo', Motor: '144.8 cc' } */
export function parseKeyValue(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of value.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function serializeKeyValue(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** Nivel de heading -> tag de HTML real, con fallback seguro. */
export function headingTag(level: number | undefined, fallback: 1 | 2 | 3 = 2): 'h1' | 'h2' | 'h3' {
  if (level === 1 || level === 2 || level === 3) return (`h${level}` as 'h1' | 'h2' | 'h3');
  return (`h${fallback}` as 'h1' | 'h2' | 'h3');
}

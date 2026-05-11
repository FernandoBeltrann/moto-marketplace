import { motorcycles, Motorcycle } from '@/data/motorcycles';

export function getMotorcycles() {
  return motorcycles.sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getMotorcycleByPath(brand: string, slug: string): Motorcycle | undefined {
  return motorcycles.find(
    (m) => m.brand.toLowerCase() === decodeURIComponent(brand).toLowerCase() && m.slug === slug
  );
}

export function getBrands() {
  return Array.from(new Set(motorcycles.map((m) => m.brand))).sort();
}

export function getCategories() {
  return Array.from(new Set(motorcycles.map((m) => m.category))).sort();
}

export function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export function brandPath(brand: string) {
  return brand.toLowerCase().replaceAll(' ', '-');
}

export function productPath(m: Motorcycle) {
  return `/motos/${brandPath(m.brand)}/${m.slug}`;
}

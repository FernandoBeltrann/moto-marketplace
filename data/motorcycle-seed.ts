import type { Motorcycle } from '@/types/motorcycle';

/** Solo para scripts de seed / generación SQL. El sitio lee el catálogo desde Supabase. */
export const motorcycleSeed: Motorcycle[] = [
  {
    id: 'yamaha-fz-s-2025', brand: 'Yamaha', model: 'FZ-S', year: 2025, slug: 'fz-s-2025', price: 67999,
    category: 'Ciudad', engineCc: 149, monthlyFrom: 2350, suggestedDownPayment: 14000,
    availableCities: ['CDMX', 'Estado de México', 'Toluca', 'Puebla', 'Querétaro', 'Cuernavaca'], tags: ['Bajo consumo', 'Primera moto', 'Ciudad'],
    shortDescription: 'Una naked urbana equilibrada para moverte diario con buen rendimiento y estilo.',
    bestFor: ['Traslados diarios', 'Primera moto', 'Uso urbano'],
    specs: { Motor: '149 cc', Transmisión: '5 velocidades', Frenos: 'Disco delantero', Uso: 'Ciudad' }, priorityScore: 98
  },
  {
    id: 'yamaha-xtz-150-2025', brand: 'Yamaha', model: 'XTZ 150', year: 2025, slug: 'xtz-150-2025', price: 82999,
    category: 'Doble propósito', engineCc: 149, monthlyFrom: 2850, suggestedDownPayment: 17000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Doble propósito', 'Trabajo', 'Terracería'],
    shortDescription: 'Moto versátil para ciudad, trabajo y caminos irregulares.',
    bestFor: ['Reparto', 'Caminos mixtos', 'Uso rudo'],
    specs: { Motor: '149 cc', Transmisión: '5 velocidades', Suspensión: 'Largo recorrido', Uso: 'Mixto' }, priorityScore: 96
  },
  {
    id: 'bajaj-boxer-150-2025', brand: 'Bajaj', model: 'Boxer 150', year: 2025, slug: 'boxer-150-2025', price: 40999,
    category: 'Trabajo', engineCc: 150, monthlyFrom: 1550, suggestedDownPayment: 8500,
    availableCities: ['CDMX', 'Estado de México', 'Toluca', 'Puebla', 'Querétaro'], tags: ['Trabajo', 'Reparto', 'Económica'],
    shortDescription: 'Moto enfocada en trabajo diario, resistencia y bajo costo de uso.',
    bestFor: ['Delivery', 'Trabajo diario', 'Bajo presupuesto'],
    specs: { Motor: '150 cc', Transmisión: '5 velocidades', Uso: 'Trabajo', Enfoque: 'Costo operativo' }, priorityScore: 95
  },
  {
    id: 'tvs-raider-125-2025', brand: 'TVS', model: 'Raider 125', year: 2025, slug: 'raider-125-2025', price: 48999,
    category: 'Ciudad', engineCc: 125, monthlyFrom: 1800, suggestedDownPayment: 10000,
    availableCities: ['CDMX', 'Estado de México', 'Toluca', 'Puebla', 'Cuernavaca'], tags: ['Ciudad', 'Económica', 'Primera moto'],
    shortDescription: 'Opción urbana ágil para quien busca moverse barato sin perder diseño.',
    bestFor: ['Primera moto', 'Traslados diarios', 'Ahorro'],
    specs: { Motor: '125 cc', Transmisión: '5 velocidades', Uso: 'Ciudad', Enfoque: 'Eficiencia' }, priorityScore: 94
  },
  {
    id: 'bajaj-pulsar-ns200-2025', brand: 'Bajaj', model: 'Pulsar NS200', year: 2025, slug: 'pulsar-ns200-2025', price: 68999,
    category: 'Deportiva', engineCc: 200, monthlyFrom: 2380, suggestedDownPayment: 14000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro', 'Cuernavaca'], tags: ['Deportiva', 'Precio valor', 'Ciudad'],
    shortDescription: 'Naked deportiva con buena relación entre precio, desempeño y presencia.',
    bestFor: ['Jóvenes', 'Ciudad', 'Manejo dinámico'],
    specs: { Motor: '200 cc', Transmisión: '6 velocidades', Uso: 'Ciudad', Enfoque: 'Desempeño' }, priorityScore: 93
  },
  {
    id: 'suzuki-gixxer-150-2025', brand: 'Suzuki', model: 'GIXXER 150', year: 2025, slug: 'gixxer-150-2025', price: 63999,
    category: 'Ciudad', engineCc: 155, monthlyFrom: 2250, suggestedDownPayment: 13000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Ciudad', 'Naked', 'Bajo consumo'],
    shortDescription: 'Naked urbana para uso diario con estilo deportivo y manejo ligero.',
    bestFor: ['Uso diario', 'Primera moto', 'Ciudad'],
    specs: { Motor: '155 cc', Transmisión: '5 velocidades', Uso: 'Ciudad', Enfoque: 'Balance' }, priorityScore: 92
  },
  {
    id: 'tvs-apache-rtr-200-2025', brand: 'TVS', model: 'Apache RTR 200', year: 2025, slug: 'apache-rtr-200-2025', price: 72999,
    category: 'Deportiva', engineCc: 200, monthlyFrom: 2550, suggestedDownPayment: 15000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Deportiva', 'Naked', 'Tecnología'],
    shortDescription: 'Moto de estilo deportivo para quien quiere más respuesta sin subir demasiado de presupuesto.',
    bestFor: ['Ciudad rápida', 'Manejo divertido', 'Upgrade'],
    specs: { Motor: '200 cc', Transmisión: '5 velocidades', Uso: 'Ciudad', Enfoque: 'Desempeño' }, priorityScore: 91
  },
  {
    id: 'yamaha-nmax-2025', brand: 'Yamaha', model: 'NMAX', year: 2025, slug: 'nmax-2025', price: 94999,
    category: 'Scooter', engineCc: 155, monthlyFrom: 3200, suggestedDownPayment: 19000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Scooter', 'Automática', 'Ciudad'],
    shortDescription: 'Scooter cómoda, automática y práctica para moverte en ciudad.',
    bestFor: ['Ciudad', 'Comodidad', 'Manejo automático'],
    specs: { Motor: '155 cc', Transmisión: 'Automática', Frenos: 'ABS', Uso: 'Ciudad' }, priorityScore: 90
  },
  {
    id: 'suzuki-v-strom-250sx-2025', brand: 'Suzuki', model: 'V-STROM 250SX', year: 2025, slug: 'v-strom-250sx-2025', price: 114999,
    category: 'Doble propósito', engineCc: 250, monthlyFrom: 3900, suggestedDownPayment: 23000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Aventura', 'Doble propósito', 'Touring'],
    shortDescription: 'Moto aventurera ligera para ciudad, carretera y escapadas de fin de semana.',
    bestFor: ['Carretera ligera', 'Aventura', 'Uso mixto'],
    specs: { Motor: '250 cc', Transmisión: '6 velocidades', Uso: 'Mixto', Enfoque: 'Aventura' }, priorityScore: 88
  },
  {
    id: 'tvs-ntorq-125-2025', brand: 'TVS', model: 'Ntorq 125', year: 2025, slug: 'ntorq-125-2025', price: 52999,
    category: 'Scooter', engineCc: 125, monthlyFrom: 1950, suggestedDownPayment: 11000,
    availableCities: ['CDMX', 'Estado de México', 'Toluca', 'Puebla'], tags: ['Scooter', 'Automática', 'Ciudad'],
    shortDescription: 'Scooter práctica y juvenil para trayectos urbanos con manejo sencillo.',
    bestFor: ['Ciudad', 'Primera scooter', 'Movilidad diaria'],
    specs: { Motor: '125 cc', Transmisión: 'Automática', Uso: 'Ciudad', Enfoque: 'Practicidad' }, priorityScore: 87
  },
  {
    id: 'yamaha-mt-03-2025', brand: 'Yamaha', model: 'MT-03', year: 2025, slug: 'mt-03-2025', price: 158999,
    category: 'Deportiva', engineCc: 321, monthlyFrom: 5200, suggestedDownPayment: 32000,
    availableCities: ['CDMX', 'Estado de México', 'Querétaro', 'Puebla'], tags: ['Deportiva', 'Premium', 'Naked'],
    shortDescription: 'Naked deportiva para quien quiere más potencia, presencia y manejo divertido.',
    bestFor: ['Manejo deportivo', 'Ciudad y carretera', 'Upgrade de cilindrada'],
    specs: { Motor: '321 cc', Transmisión: '6 velocidades', Frenos: 'ABS', Uso: 'Ciudad/carretera' }, priorityScore: 86
  },
  {
    id: 'bajaj-dominar-400-2025', brand: 'Bajaj', model: 'Dominar 400', year: 2025, slug: 'dominar-400-2025', price: 96999,
    category: 'Touring', engineCc: 400, monthlyFrom: 3400, suggestedDownPayment: 20000,
    availableCities: ['CDMX', 'Estado de México', 'Puebla', 'Querétaro'], tags: ['Touring', 'Carretera', 'Potencia'],
    shortDescription: 'Moto de mayor cilindrada para trayectos largos y manejo con más potencia.',
    bestFor: ['Carretera', 'Viajes cortos', 'Upgrade de cilindrada'],
    specs: { Motor: '400 cc', Transmisión: '6 velocidades', Uso: 'Carretera/ciudad', Enfoque: 'Potencia' }, priorityScore: 84
  }
];

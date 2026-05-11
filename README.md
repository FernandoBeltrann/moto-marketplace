# MotoClick MVP — Marketplace de motocicletas powered by Finva

MVP listo para subir a GitHub y desplegar en Railway/Vercel. Está diseñado para lanzar rápido un marketplace de motos nuevas con páginas SEO, catálogo editable, simulador de mensualidad y captura de leads.


## Decisiones de alcance para este MVP

- Solo motos nuevas.
- Marcas iniciales: Suzuki, Yamaha, TVS y Bajaj.
- Zona prioritaria: CDMX; también Estado de México, Toluca, Puebla, Querétaro y Cuernavaca.
- Sin pago en línea por ahora: el cierre lo hace un agente humano.
- El lead se manda al CRM de Finva usando `FINVA_CRM_WEBHOOK_URL`. Supabase puede usarse como respaldo/registro.

## Stack

- Next.js App Router
- TypeScript
- CSS simple sin dependencia pesada de UI
- Catálogo en **Supabase** (`public.motorcycles`); semilla para scripts en `data/motorcycle-seed.ts`
- API Route `/api/leads` para guardar leads
- Supabase opcional para persistencia
- Sitemap, robots y metadata dinámica

Next.js usa metadata en App Router para SEO y shareability. Railway soporta despliegue de Next.js desde GitHub y recomienda `output: "standalone"` para builds de producción. Supabase tiene guía oficial para usarlo con Next.js.

## Cómo correr local

```
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

## Cómo subir a GitHub

```bash
git init
git add .
git commit -m "Initial motorcycle marketplace MVP"
git branch -M main
git remote add origin <TU_REPO>
git push -u origin main
```

## Despliegue en Railway

1. Crea un repo en GitHub con este proyecto.
2. En Railway: New Project → Deploy from GitHub Repo.
3. Agrega variables de entorno:

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_BRAND_NAME=MotoClick
NEXT_PUBLIC_FINVA_WHATSAPP=52155XXXXXXXX
FINVA_CRM_WEBHOOK_URL=https://tu-webhook-del-crm-finva.com/leads
```

Si vas a guardar leads en Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
SUPABASE_LEADS_TABLE=marketplace_leads
SUPABASE_MOTORCYCLES_TABLE=motorcycles
```

El build y las páginas del catálogo necesitan esas variables para leer motos desde Postgres. Imágenes: sube archivos a **Supabase Storage** (bucket público) y guarda la URL en `motorcycles.image_url` (opcional: `gallery_urls` JSON).

En CI sin credenciales, puedes compilar con `SKIP_DB_CATALOG=1` (usa `data/motorcycle-seed.ts` solo para el build; no sustituye producción).

En `npm run dev`, si faltan esas variables, el catálogo usa la misma semilla local para no romper la UI (en `next start` / producción siguen siendo obligatorias).

4. Ejecuta el SQL en `sql/supabase_schema.sql` dentro de Supabase.

## Estructura importante

```txt
app/
  page.tsx                       Home
  motos/page.tsx                 Catálogo
  motos-a-credito/page.tsx       Landing SEO/ads
  motos/[brand]/[slug]/page.tsx  Detalle SEO por moto
  api/leads/route.ts             Captura de leads
components/
  MotorcycleCard.tsx
  CatalogClient.tsx
  PaymentCalculator.tsx
  LeadForm.tsx
  SearchBox.tsx
  WhatsAppButton.tsx
data/
  motorcycle-seed.ts             Semilla para `npm run seed:motorcycles` / SQL
lib/
  catalog.ts                     Lectura async desde Supabase
  catalog-format.ts              URLs y formato MXN (sin Supabase; usable en cliente)
  supabase/server.ts             Cliente service role (servidor)
types/
  motorcycle.ts
  finance.ts
  analytics.ts
  site.ts
sql/
  supabase_schema.sql
```

## Qué motos poner en el MVP

Para lanzar, conviene un catálogo corto de 10 a 30 modelos, no cientos. Prioriza motos con intención alta y fácil explicación financiera:

1. Motos económicas/de trabajo: capturan volumen y leads sensibles a mensualidad.
2. Motos urbanas 125–200 cc: buen balance de precio y aspiración.
3. Doble propósito: alto interés para trabajo/caminos mixtos.
4. Modelos aspiracionales 250–400 cc: generan tráfico y retargeting aunque conviertan menos.
5. Scooters automáticas: buena conversión en ciudad.

El MVP trae 10 modelos semilla:

- Yamaha FZ-S 2025
- Yamaha MT-03 2025
- Yamaha XTZ 150 2025
- Yamaha Crypton 2025
- Yamaha NMAX 2025
- Bajaj Boxer 150 2025
- TVS Raider 125 2025
- Bajaj Pulsar NS200 2025
- Suzuki GIXXER 150 2025
- TVS Apache RTR 200 2025
- Suzuki V-STROM 250SX 2025
- TVS Ntorq 125 2025
- Bajaj Dominar 400 2025

Importante: los precios son datos semilla para desarrollo. Antes de usar campañas reales, reemplaza precio, disponibilidad, enganche y mensualidad con datos reales de agencias/Odoo/Supabase.

## Cómo manejar el catálogo

1. Ejecuta `sql/supabase_schema.sql` (y `sql/motorcycles_add_images.sql` si la tabla ya existía sin columnas de foto).
2. Puebla datos: `npm run seed:motorcycles` o pega `sql/seed_motorcycles.sql` en el SQL editor.
3. Configura `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno de build y runtime.

Columnas relevantes: `id`, `brand`, `model`, `year`, `slug`, `price`, `promo_price`, `category`, `engine_cc`, `monthly_from`, `suggested_down_payment`, `available_cities`, `tags`, `short_description`, `best_for`, `specs`, `priority_score`, `published`, `image_url`, `gallery_urls`.

Las páginas usan **ISR** (`revalidate` 120s) para refrescar catálogo sin redeploy constante.

### Integración con Odoo/dealers

Cuando haya operación real, sincroniza:

- precio público
- promociones
- disponibilidad
- ciudad/agencia
- estatus activo/inactivo
- fotos

## Reglas de conversión incluidas

- CTA principal: calcular pago / iniciar compra
- Mensualidad visible desde tarjeta
- Página única por moto para SEO y campañas
- Captura de UTM en leads
- WhatsApp con texto prellenado
- Simulador antes del formulario
- Landing `/motos-a-credito` para campañas y SEO

## Próximos módulos sugeridos

- Quiz “Encuentra tu moto ideal”
- Admin interno para catálogo
- Conexión completa a Supabase
- Feed para Meta Catalog Ads
- Eventos server-side para Meta/TikTok
- Comparador de motos
- Páginas por ciudad: `/motos-a-credito-en-cdmx`
- Páginas por marca: `/yamaha-a-credito`

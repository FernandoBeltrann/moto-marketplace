# CMS agéntico para Marketing — skeleton

Puerto del patrón "Studio" del hackathon (Hack-a-ton-front/end) a MotoClick.
Marketing crea/edita páginas y schema.org por chatbot + editor HTML; el JSON de
bloques es la fuente de verdad; se versiona, se hace rollback y se publica con
revisión (ISR, sin deploy por página).

## Puesta en marcha

1. **DB**: corre `sql/cms_pages.sql` en el SQL Editor de Supabase (crea
   `cms_pages`, `cms_page_versions`, `cms_agent_feedback`; RLS + trigger, mismo
   patrón que `blog_posts`).
1b. **DB (auth)**: corre también `sql/cms_users.sql` (tabla `cms_users`,
    define quién entra al Studio). No crea usuarios — solo guarda el rol de
    usuarios que ya existan en el Supabase Auth de ESTE proyecto.
2. **Env**: ya usa `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
   Para el LLM real: `OPENAI_API_KEY` (+ `OPENAI_MODEL`, default `gpt-5.4-mini`)
   — usa la misma OpenAI Responses API que el hackathon. Sin key, el orquestador
   cae a modo determinista y todo el flujo sigue funcionando.
3. **Correr**: `npm run dev` → abre `/studio`.
4. **Smoke test E2E** (genera con OpenAI real, publica y relee): 
   `npx tsx --env-file=.env scripts/cms-fase1.ts`
5. **Alta del primer admin** (tú): en el dashboard de Supabase de
   moto-marketplace, en Authentication → Users, crea (o invita) tu usuario
   con tu email. Copia su UUID y corre:
   `node --env-file=.env scripts/cms-invite.mjs diego@finva-app.com admin`
   (o inserta directo la fila en `cms_users` — ver el bootstrap comentado
   en `sql/cms_users.sql`). Desde ahí, tú puedes invitar al equipo de
   marketing como `editor` con el mismo script, o desde el Studio si
   agregamos una pantalla de administración de usuarios.

## Flujo (extremo a extremo)

Chatbot/HTML → `POST /api/cms/generate` → `lib/cms/orchestrator.ts` (LLM o
determinista) → **CmsPageDoc** (JSON de bloques) → `saveDraft` (versión `agent`)
→ Studio muestra preview/JSON/HTML → editar → `POST /api/cms/pages` (versión
`manual`) → **Revisar y publicar** (`/publish` copia draft→published + revalida)
→ público en `/p/[slug]` con schema.org por página.

## Mapa de archivos

| Capa | Archivo | Análogo en el hackathon |
|---|---|---|
| Contrato congelado | `types/cms.ts` | `src/runtime/contracts.ts` |
| Registry + validación | `lib/cms/blocks.ts` | `registry.ts` + `validation.ts` |
| Transform JSON→HTML | `lib/cms/render.ts` | `Renderer.tsx` |
| Schema.org por página | `lib/cms/schema-jsonld.ts` | (nuevo) |
| Datos + versiones/rollback | `lib/cms/pages.ts` | `app/studio/store.py` |
| Orquestador + aprendizaje | `lib/cms/orchestrator.ts` | `app/studio/llm.py` |
| API | `app/api/cms/**` | endpoints `/studio/*` |
| Renderer público | `app/p/[slug]/page.tsx` | `StudioRenderer.tsx` |
| Studio (UI marketing) | `app/studio/page.tsx` | `pages/Studio.tsx` |

## Estado del skeleton

Funcional como walking skeleton. **Pendiente antes de producción** (ver
documento de arquitectura): sanitización HTML de nivel producción
(sanitize-html/DOMPurify), auth/roles en `/studio` y `/api/cms`, subida de
imágenes a Supabase Storage, diff visual entre versiones, y promover
`/p/[slug]` a catch-all raíz si marketing quiere URLs de primer nivel.

## Autenticación

`/studio` y `/api/cms/*` estaban abiertos (sin login) — pendiente marcado desde
el inicio del proyecto. Ahora están protegidos.

**Decisión**: replicar el mismo patrón de auth que usa el backend original
(LoanCalculator2 — `app/auth/decorators.py::token_required` y
`app/auth/routes.py`: Supabase Auth con email/password + tabla propia de
roles), pero contra el proyecto de Supabase **de moto-marketplace**, no el de
LoanCalculator2. Son dos proyectos de Supabase distintos y no relacionados —
no hay backend propio de MotoClick que pueda mediar contra la base de
LoanCalculator2, así que "reusar" tendría que ser una llamada de red cruzada
a otro servicio (CORS + cookies entre dominios distintos + acoplar dos
productos que hoy son independientes). Replicar el patrón evita todo eso: es
autocontenido, mismo modelo mental, cero dependencia de que LoanCalculator2
esté arriba.

Igual que en LoanCalculator2, el cliente de Supabase que hace
`signInWithPassword`/`refreshSession` vive separado del cliente de
lectura/escritura de datos (`createServiceSupabase()`), porque esas llamadas
mutan el header de `Authorization` del cliente al JWT del usuario — si se
comparte con el cliente de datos, las queries siguientes dejan de usar
`service_role` silenciosamente. Ver el comentario en `lib/cms/auth.ts`.

Roles: `admin` (gestiona usuarios + todo lo de editor) y `editor` (equipo de
marketing — crear/editar/guardar/publicar/rollback, todo el flujo de
contenido). Solo `/api/cms/auth/invite` exige `admin`.

| Pieza | Archivo |
|---|---|
| Sign-in, roles, refresh, invite | `lib/cms/auth.ts` |
| Rutas de auth | `app/api/cms/auth/{login,logout,refresh,me,invite}/route.ts` |
| Gate de acceso | `middleware.ts` (protege `/studio/*` y `/api/cms/*`) |
| Login | `app/studio/login/page.tsx` |
| Alta de usuarios (CLI) | `scripts/cms-invite.mjs` |
| Tabla de roles | `sql/cms_users.sql` |

Pendiente (fase 2, no bloqueante): pantalla dentro del Studio para que un
admin invite/gestione usuarios sin usar el script; hoy es CLI o SQL directo.

## Edición de componentes (no solo contenido)

Los bloques (`CmsBlock`) cubren texto/imágenes/botones/FAQ — contenido
libre. Pero varias páginas usan COMPONENTES de React reales con copy propio
que no es un bloque (ej. el título "Opiniones de clientes" de
`MotorcycleReviews`, el mensaje de "sin resultados" del catálogo). Antes no
había forma de tocar eso desde el Studio sin editar código. Ahora sí, con un
sistema chico y explícito separado de los bloques:

1. **`lib/cms/component-registry.ts`** — el catálogo de qué props de qué
   componentes son editables, por `bindingKind` (aplica a TODAS las páginas
   de ese tipo, ej. cualquier moto) o por `bindingKey` exacta (una página
   puntual, ej. solo `/motos`). Cada entrada define `id`, `label`, `where`
   (dónde vive en la página, en palabras simples) y sus `fields`.
2. El **componente real** (ej. `components/MotorcycleReviews.tsx`) acepta la
   prop nueva con default = el copy actual hardcodeado, y envuelve la región
   con `data-cms-region="<id>"` — el mismo id que la llave del registry.
3. La **página real** (ej. `app/motos/[brand]/[slug]/page.tsx`) lee
   `override?.componentConfig?.<id>?.<field>` (parte de `CmsPageDoc`, junto a
   `blocks`) y lo pasa como prop.
4. **`components/cms/CmsRegionHighlighter.tsx`** — montado una vez en
   `app/layout.tsx`, solo activo con `?cmsPreview=1` (la misma bandera que ya
   gatea ver el borrador). Escucha `postMessage({type:'cms-highlight',
   regionId})` y resalta con un outline naranja + scroll el elemento
   `[data-cms-region="<regionId>"]` correspondiente.
5. **Studio** (`app/studio/page.tsx`) — pestaña "Componentes": a la izquierda
   los campos editables de esta página (según su binding), a la derecha un
   `<iframe>` con la vista previa EN VIVO del sitio real
   (`{urlPath}?cmsPreview=1`). Al enfocar un campo, se manda el
   `postMessage` al iframe y se resalta en naranja la parte exacta de la
   página que ese campo controla — así es intuitivo a qué corresponde cada
   edición, sin adivinar.

Regla dura: solo entran al registry props de COPY/presentación. Todo lo
funcional/transaccional (el checkout de Finva, cálculos de mensualidad,
envío de formularios, tracking) se queda 100% en código y nunca aparece
aquí — ni siquiera como campo de solo lectura.

**Cómo agregar un componente nuevo:** los 3 pasos de arriba, en ese orden.
El registry ya cubre `reviews` (moto) y `catalogEmptyState` (`/motos`) como
ejemplo funcionando de punta a punta; el resto de componentes marketing-
relevantes (ej. el copy fijo dentro de `FinvaCheckout` que NO sea el
checkout en sí, textos de `HeroMotoRotator`, etc.) se agregan igual, uno a
la vez, según lo que marketing pida — no hace falta migrarlos todos de
golpe.

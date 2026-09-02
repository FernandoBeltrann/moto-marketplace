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

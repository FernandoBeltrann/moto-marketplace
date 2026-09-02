# CMS agéntico para Marketing — skeleton

Puerto del patrón "Studio" del hackathon (Hack-a-ton-front/end) a MotoClick.
Marketing crea/edita páginas y schema.org por chatbot + editor HTML; el JSON de
bloques es la fuente de verdad; se versiona, se hace rollback y se publica con
revisión (ISR, sin deploy por página).

## Puesta en marcha

1. **DB**: corre `sql/cms_pages.sql` en el SQL Editor de Supabase (crea
   `cms_pages`, `cms_page_versions`, `cms_agent_feedback`; RLS + trigger, mismo
   patrón que `blog_posts`).
2. **Env**: ya usa `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
   Para el LLM real: `OPENAI_API_KEY` (+ `OPENAI_MODEL`, default `gpt-5.4-mini`)
   — usa la misma OpenAI Responses API que el hackathon. Sin key, el orquestador
   cae a modo determinista y todo el flujo sigue funcionando.
3. **Correr**: `npm run dev` → abre `/studio`.
4. **Smoke test E2E** (genera con OpenAI real, publica y relee): 
   `npx tsx --env-file=.env scripts/cms-fase1.ts`

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

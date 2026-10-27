# Actualización de seguridad — octubre 2026 · moto-marketplace

**Rama:** `security/critical-vulns-2026-10` (creada desde `origin/main`). `origin/development` existe pero está 22 commits detrás de `main` y sin cambios desde el 26-jun-2026, así que basar el fix ahí habría perdido trabajo de producción.

> Auditoría y fixes del 2026-10-27. Fuente de verdad del estado de esta actualización en este repo: marca las casillas conforme avances.
> Guía completa (todos los repos): https://claude.ai/artifact/RJRB8riiqouRG5egvLpnYG

## Cómo se verificó

- `npm audit` / `pip-audit` sobre el lockfile antes y después del cambio.
- Cada versión nueva se consultó en la base de avisos OSV (GitHub Advisory + PyPA + OpenSSF Malicious Packages): ningún paquete del árbol nuevo tiene avisos **críticos o altos** salvo lo indicado en *Pendientes*, y **ningún paquete aparece como malicioso/comprometido** (axios 1.14.1/0.30.4, oleada ChainDrop de agosto, tensorlake, LiteLLM 1.107.0, etc.).
- Política de *cooldown*: las dependencias se resolvieron con fecha de corte **2026-10-24** (`npm --before`, `uv --exclude-newer`), para no instalar versiones publicadas hace menos de 3 días. Las versiones elegidas son la primera corregida o una posterior, nunca una recién salida.

## Resultado

| | Críticas | Altas | Moderadas | Bajas |
| --- | --- | --- | --- | --- |
| Antes (`main`) | 1 | 10 | 13 | 1 |
| Después (esta rama) | 0 | 0 | 2 | 0 |

## Cambios

| Archivo | Cambio |
| --- | --- |
| `package.json` | `next` `latest` → `^16.4.3`; `eslint-config-next` `latest` → `^16.4.3` |
| `package-lock.json` | next 16.2.6 → 16.4.3, sharp 0.34.5 → 0.35.5 (fix de libvips/libheif para Image Optimization), dompurify 3.4.2 → 3.4.17, posthog-js 1.372.10 → 1.438.21 y transitivos de `npm audit fix` |

Este es el proyecto más expuesto: `next.config.js` optimiza imágenes remotas de Supabase (`images.remotePatterns`), que es la superficie de los RCE por SVG (CVE-2026-96889) y AVIF (libheif).

## Verificación de versiones (avisos críticos)

| Paquete | Aviso crítico | Primera versión corregida | Versión nueva | Estado |
| --- | --- | --- | --- | --- |
| next | GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, GHSA-2xp9-vwfh-vxw4 (+2) | 16.4.1 | 16.4.3 | OK |
| sharp | (workaround oficial de Next: sharp ≥ 0.35.5) | 0.35.5 | 0.35.5 | OK |

## To-do

- [x] Rama nueva desde `origin/main`
- [x] next 16.4.3 + `npm audit fix`
- [x] Auditoría OSV de malware y avisos: limpia
- [ ] `git pull --rebase origin main` antes de commitear
- [ ] `npm install` local
- [ ] `npm run build && npm run test:flow`; `npm run test:payments` contra sandbox
- [ ] Deploy a staging: ficha de moto con imagen de Supabase, flujo de crédito, pago
- [ ] PR a `main` y deploy a producción (prioridad 1 de toda la actualización)
- [ ] Decidir si `development` se elimina o se resincroniza con `main`
- [ ] Fase 2: `mercadopago` 2.13 → 3.x

## Runtime Node.js — avisos de octubre 2026

moto-marketplace no tiene Dockerfile en el repo (el runtime lo define la plataforma de deploy). Next 16.4.3 usa la versión de Node del entorno.

- [ ] Confirmar que la plataforma de deploy corre Node 24.22.1+ (o 22.23.4+). En Railway: variable `NIXPACKS_NODE_VERSION` / engines; en Vercel: Project Settings → Node.js Version
- [x] En tu Mac: Node actualizado a v24.22.1 (2026-10-27)

## Seguimiento 2026-10-27 (después del deploy)

- [x] PR #6 mergeado a `main`; Railway desplegó producción y staging con Next 16.4.3 (deploy `e2ca6a29`, SUCCESS)
- [x] Hallazgo: Railpack seguía construyendo con **Node 22.23.3** ("previous installed version (22)"), anterior al parche del 21-oct (22.23.4 / 24.22.1)
- [x] Fix en rama `security/node-24-runtime`: `"engines": {"node": "24.22.1"}` en `package.json` (Railpack lo respeta antes que su versión en caché)
- [ ] Merge y verificar en el build log de Railway: `node │ 24.22.1 │ package.json > engines > node`

# Directus catalog roles + price approval — integration plan

Ports the role-based approval workflow and Data Studio UI polish already
running on LoanCalculator2's Directus (`cms_motorcycles`) over to
moto-marketplace's own collection, `directus_system.cms_marketplace`. Same
mechanism, different table and field names — see the "Field mapping"
section at the bottom for exactly what changed.

Four files do the work, all already in this repo:

| File | What it does |
|---|---|
| `sql/marketplace_price_approval_workflow.sql` | Adds `price_proposed` / `price_status` columns + the trigger that runs the approval logic |
| `sql/marketplace_audit_table.sql` | Creates `cms_marketplace_audit`, the change-log table |
| `scripts/setup_marketplace_catalog_roles.py` | Creates the Catalog Editor / Catalog Manager roles + permissions in Directus |
| `scripts/configure_marketplace_ui.py` | Labels, badges, field groups, default table layouts, the manager's approval-queue bookmark |

Run them in that order — each one depends on the state the previous one
left behind. Do a staging/local pass before touching production if you
have that option; if not, at minimum take the DB backup in Step 0.

---

## 0. Before you start

- **Backup.** In Supabase: Database → Backups, or `pg_dump` the
  `directus_system.cms_marketplace` table specifically. This changes a
  production trigger and adds columns — cheap to undo if you have a
  snapshot, annoying if you don't.
- **Credentials you'll need:**
  - Supabase SQL Editor access (or a direct `psql` connection string) for
    the moto-marketplace project.
  - Your Directus admin login for the moto-marketplace instance (URL +
    email + password) — the same account referenced in
    `directus-images-setup.md`.
- **Quiet window.** Editing `cms_marketplace` while the price-approval
  trigger is mid-deploy is fine (it's additive and idempotent), but avoid
  running Step 1 while someone else is actively editing prices in the
  Data Studio, just to keep the before/after state easy to reason about.
- **Off by default:** none of these four files touch `public.motorcycles`
  or the existing `trg_sync_cms_marketplace` trigger. They only add new
  columns/tables and Directus-side config. The blast radius if something
  goes wrong is `cms_marketplace` and Directus's own permission tables —
  not the live storefront data path.

---

## 1. Run the SQL migrations

In the Supabase SQL Editor for moto-marketplace, run, in order:

1. `sql/marketplace_price_approval_workflow.sql`
2. `sql/marketplace_audit_table.sql`

Both are idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF
EXISTS`) — safe to re-run if you're not sure whether they already applied.

**Verify:** in the SQL Editor,
```sql
select price_proposed, price_status from directus_system.cms_marketplace limit 1;
select * from directus_system.cms_marketplace_audit limit 1; -- should return 0 rows, not an error
```

---

## 2. Track the new fields/collection in Directus Studio

Directus needs to notice the schema changed:

1. **Settings → Data Model → cms_marketplace.** Confirm `price_proposed`
   and `price_status` now appear in the field list. If not, use the
   "Refresh" / schema-sync action Directus offers on that screen.
2. **Settings → Data Model → Create Collection → Use Existing Table** →
   pick `cms_marketplace_audit` to start tracking it. Leave every field as
   Directus auto-detects it for now — `configure_marketplace_ui.py` in
   Step 4 will style them.

---

## 3. Create the roles and permissions

PowerShell (this is a Windows machine, so use this instead of the `bash`
version with `\` continuations — PowerShell needs a backtick `` ` `` for
line continuation, or just keep it on one line):

```powershell
cd moto-marketplace
pip install requests --break-system-packages   # if not already installed
python scripts/setup_marketplace_catalog_roles.py `
  --url "https://<your-directus-host>" `
  --admin-email "diego@finva-app.com" `
  --admin-password '<your admin password>'
```

Use `python` or `python3`, whichever `python --version` / `python3
--version` actually resolves on this machine. Keep the `--admin-password`
value in single quotes — PowerShell won't try to expand `$`, `` ` ``, or
`"` characters inside single quotes, but it would inside double quotes.

What this does, in order: creates the `Catalog Editor` and `Catalog
Manager` policies and their field-level permissions on `cms_marketplace`,
grants both roles comment/notification access (so an editor can @-mention
a manager to ask for approval), creates the two roles, links policies to
roles, creates two **test** users
(`catalog.editor.test@finva-app.com` / `catalog.manager.test@finva-app.com`),
and finishes with a live smoke test: editor blocked from `price` and
`card_price`, allowed to edit content and propose a price, blocked from
self-approving; manager approves and the price applies; then it reverts
the test edit.

**Read the output carefully** — two things can require a manual step:

- If you see `Could not set roles for policy '...' via API` — this is a
  known Directus 11.x bug linking policies↔roles through the API. Do the
  one manual step it prints: open the policy in the Data Studio → Roles
  tab → confirm it's linked to the role(s) listed.
- If the smoke test says `no rows in cms_marketplace yet` — you're
  pointed at an empty/wrong database. Stop and check the `--url` before
  continuing.

Idempotent — safe to re-run any time (e.g. after changing
`EDITOR_CONTENT_FIELDS` in the script).

---

## 4. Configure the Data Studio UI

```powershell
python scripts/configure_marketplace_ui.py `
  --url "https://<your-directus-host>" `
  --admin-email "diego@finva-app.com" `
  --admin-password '<your admin password>'
```

Adds Spanish field labels/notes, the "Precio y aprobación" group with the
color-coded status badge, a curated (but still free-typed) category
dropdown, the global default table columns, the Catalog Manager's own
default view, and the "Precios pendientes" bookmark — their approval
queue, filtered to `price_status = pending`. Also styles the audit
collection if Step 2 already tracked it.

Hard-refresh the Data Studio afterward to see the changes.

---

## 5. Build the audit-log Flow (manual — not scripted)

Same reason it wasn't scripted on LoanCalculator2: only Directus knows
*which user* made an edit, so this has to be a Directus Flow, not a plain
Postgres trigger. `sql/marketplace_audit_table.sql` has the detailed
field-by-field steps in its trailing comment block; short version:

1. **Settings → Flows → Create Flow** — trigger: Event Hook, `Action
   (Non-Blocking)`, scope `items.update`, collection `cms_marketplace`.
2. Start with the fields worth auditing: `price`, `price_status`,
   `published`, `short_description`, `category`, `promo_price`,
   `card_price`.
3. For each one: a Condition operation checking `$trigger.payload.<field>`
   changed, then a Create Data operation on `cms_marketplace_audit`
   writing `motorcycle_id`, `field`, `old_value`, `new_value`,
   `changed_by` (`$accountability.user`).
4. **Test it** in Directus's Flow logs before trusting it — confirm what
   `$trigger.payload` actually contains for your instance, same caution
   called out in `directus-images-setup.md` §5.2 for the image-sync Flow.

You can ship Steps 1–4 without this — the approval workflow and roles work
independently of the audit log. Treat this as a fast-follow, not a
blocker.

---

## 6. End-to-end verification checklist

- [ ] Log in to Directus as `catalog.editor.test@finva-app.com` (password
      printed by Step 3). Confirm: can edit `short_description`, `brand`,
      `category`, images; **cannot** edit `price` or `card_price`
      directly; can fill `price_proposed` and see `price_status` flip to
      *Pendiente de aprobación*.
- [ ] Log in as `catalog.manager.test@finva-app.com`. Confirm the
      "Precios pendientes" bookmark shows that row; approving it
      (`price_status → Aprobado`) applies the proposed price and resets
      the status.
- [ ] Confirm the approved price shows up in `public.motorcycles` (the
      existing `trg_sync_cms_marketplace` trigger should have propagated
      it — check the Supabase table editor).
- [ ] If Step 5 is done: confirm a row lands in `cms_marketplace_audit`
      after an edit.
- [ ] **Delete or repurpose the two test users** once you're satisfied —
      they have real (generated) passwords sitting in your terminal
      scrollback from Step 3's output.

---

## 7. Roll out to real users

The scripts only create test accounts. To actually use this day to day:

1. In Directus, create real user accounts for your editors/managers (or
   edit their existing accounts).
2. Assign them the `Catalog Editor` or `Catalog Manager` role from
   Step 3 — same as any other Directus role assignment.
3. Remove `catalog.editor.test@finva-app.com` /
   `catalog.manager.test@finva-app.com` once you don't need them for
   re-testing after future changes to these scripts.

---

## Rollback

Everything here is additive, so rollback is narrow:

- **Roles/permissions/UI (Steps 3–4):** delete the `Catalog Editor` /
  `Catalog Manager` roles and policies in the Data Studio. This does not
  touch any data.
- **SQL (Step 1):**
  ```sql
  drop trigger if exists trg_cms_marketplace_price_approval on directus_system.cms_marketplace;
  drop function if exists cms_marketplace_price_approval();
  alter table directus_system.cms_marketplace
    drop column if exists price_proposed,
    drop column if exists price_status;
  ```
  Only do this if nothing has a pending proposal you care about — dropping
  the columns loses any `price_proposed` values outright.
- **Audit table:** `drop table if exists directus_system.cms_marketplace_audit;`
  (and untrack it in Data Model first, or Directus will show a broken
  collection reference).

---

## Field mapping reference (LoanCalculator2 → moto-marketplace)

For anyone comparing this against the original `cms_motorcycles` scripts
in `LoanCalculator2/directus/scripts/`:

| cms_motorcycles (LoanCalculator2) | cms_marketplace (moto-marketplace) | Note |
|---|---|---|
| `id` (uuid) | `id` (text, slug) | Audit table's `motorcycle_id` is `text` here, not `uuid` |
| `active` (boolean) | `published` (boolean) | Same concept, different name |
| `description` | `short_description` | Same concept, different name |
| `brand_id` → `motorcycle_brands` (FK) | `brand` (plain text) | No brands lookup table in this project — no M2O relation to register |
| `color`, `inner_brand_model`, `review_video_url` | *(none)* | Don't exist on `cms_marketplace` — skipped |
| *(none)* | `category`, `promo_price`, `card_price`, `finva_motorcycle_id`, `slug`, `cover_image_file`, `gallery` | Exist here but not on `cms_motorcycles` — `card_price` and `finva_motorcycle_id` are treated as manager-only, like `price` |
| Editor editable: `model`, `active` only | Editor editable: all content fields (see `EDITOR_CONTENT_FIELDS` in `setup_marketplace_catalog_roles.py`) except `id`, `slug`, `price`, `price_status`, `card_price`, `finva_motorcycle_id` | Deliberately broader — this project's editors manage full listing content, not just name/status |

If your actual editorial process disagrees with that last row, it's a
one-line change: edit `EDITOR_CONTENT_FIELDS` at the top of
`setup_marketplace_catalog_roles.py` and re-run it.

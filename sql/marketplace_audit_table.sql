-- Field-level change log for directus_system.cms_marketplace.
-- One row per changed field per edit: what changed, from what, to what,
-- by whom, and when. Populated by a Directus Flow (only Directus knows the
-- app user - a raw Postgres trigger cannot), NOT by this migration.
--
-- Ported from LoanCalculator2/directus/scripts/audit_table.sql
-- (cms_motorcycles_audit) to moto-marketplace's cms_marketplace.
--
-- Difference from the original: cms_marketplace.id is TEXT (a slug, e.g.
-- 'bajaj-boxer-bm-150-2026'), not uuid, so `motorcycle_id` here is text.
-- No FK on purpose (same reasoning as the original): a deleted row or user
-- should never block or cascade-delete the log.
--
-- Lives in directus_system alongside cms_marketplace itself, since this is
-- Directus/CMS tooling data - the public-facing app (lib/catalog.ts) never
-- reads it.

CREATE TABLE IF NOT EXISTS directus_system.cms_marketplace_audit (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorcycle_id    text,                        -- cms_marketplace.id (slug)
  field            text NOT NULL,               -- e.g. 'price', 'published', 'short_description'
  old_value        text,
  new_value        text,
  changed_by       uuid,                        -- directus_users.id
  changed_by_email text,                        -- convenience copy of the email
  changed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_cms_marketplace_audit_motorcycle ON directus_system.cms_marketplace_audit (motorcycle_id);
CREATE INDEX IF NOT EXISTS ix_cms_marketplace_audit_changed_at ON directus_system.cms_marketplace_audit (changed_at DESC);

-- ============================================================================
-- After running this:
--   1. In Directus Studio -> Settings -> Data Model, click "Create Collection"
--      -> "Use Existing Table" -> track `cms_marketplace_audit`.
--   2. Run scripts/configure_marketplace_ui.py (it configures this collection
--      too: read-only fields, relations to cms_marketplace/directus_users so
--      it shows the bike + the real user instead of raw ids, newest-first
--      default layout).
--   3. Build a Flow that actually writes rows here, mirroring the pattern
--      already used for the image-sync Flow in directus-images-setup.md:
--        - Trigger: Event Hook, Action (Non-Blocking), scope items.update,
--          collection cms_marketplace.
--        - For each field you want audited (start with: price, price_status,
--          published, short_description, category, promo_price, card_price),
--          add a Condition operation checking
--          `$trigger.payload.<field>` is not null and differs from the
--          previous value, then a Create Data operation on
--          cms_marketplace_audit writing
--          { motorcycle_id: $trigger.key, field: "<field>", old_value: ...,
--            new_value: $trigger.payload.<field>, changed_by: $accountability.user }.
--        - $trigger doesn't carry the *old* value by itself - add a Read Data
--          operation before the Condition (collection cms_marketplace,
--          ids {{$trigger.key}}) so you have something to diff against; note
--          it'll already reflect the new value once fields update in-place,
--          so compare against $trigger.payload instead of assuming Read Data
--          gives you the pre-update row - confirm actual behavior with a test
--          run in Directus's Flow logs before trusting it, same caution as
--          section 5.2 of directus-images-setup.md.
-- ============================================================================

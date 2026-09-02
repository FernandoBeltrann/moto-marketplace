-- Price approval workflow for directus_system.cms_marketplace
-- ------------------------------------------------------------------
-- Ported from LoanCalculator2/directus/scripts/price_approval_workflow.sql
-- (originally written for cms_motorcycles) to moto-marketplace's own CMS
-- table. Same mechanism, different table:
--
--   Editor proposes a price by writing `price_proposed`. A BEFORE trigger
--   auto-marks the row 'pending' (editor never gets update access to
--   price_status, so they can't self-approve - see
--   setup_marketplace_catalog_roles.py). Manager reviews and sets
--   price_status = 'approved'; the same trigger then copies the proposed
--   price into the real `price` and resets the workflow. The EXISTING
--   trg_sync_cms_marketplace AFTER trigger (already in production - see
--   directus-images-setup.md) then pushes the new price out to
--   public.motorcycles, same as any other edit.
--
-- Note on ordering: this is a BEFORE UPDATE trigger, trg_sync_cms_marketplace
-- is an AFTER UPDATE trigger. Postgres runs BEFORE triggers first, so by the
-- time trg_sync_cms_marketplace reads the row, `price` already reflects the
-- approval logic below. Nothing about the existing sync trigger needs to
-- change.
--
-- Difference from the cms_motorcycles version: cms_marketplace.id is TEXT
-- (a slug, e.g. 'bajaj-boxer-bm-150-2026'), not uuid - doesn't affect this
-- file (no id-typed columns added here), but matters for
-- marketplace_audit_table.sql below.
--
-- Safe to run more than once (IF NOT EXISTS / CREATE OR REPLACE / DROP..IF).

ALTER TABLE directus_system.cms_marketplace
  ADD COLUMN IF NOT EXISTS price_proposed numeric,
  ADD COLUMN IF NOT EXISTS price_status   text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN directus_system.cms_marketplace.price_proposed IS
  'Precio propuesto por un Catalog Editor, pendiente de aprobación. NULL = sin propuesta activa.';
COMMENT ON COLUMN directus_system.cms_marketplace.price_status IS
  'none | pending | approved. Lo gestiona el trigger cms_marketplace_price_approval; nunca lo escribas directamente salvo para aprobar.';

CREATE OR REPLACE FUNCTION cms_marketplace_price_approval()
RETURNS trigger AS $$
BEGIN
  -- Manager approved: apply the proposed price, then clear the workflow.
  IF NEW.price_status = 'approved' AND NEW.price_proposed IS NOT NULL THEN
    NEW.price          := NEW.price_proposed;
    NEW.price_proposed := NULL;
    NEW.price_status   := 'none';

  -- Editor proposed a new price (different from current live price):
  -- mark it pending for a manager to review.
  ELSIF NEW.price_proposed IS NOT NULL
        AND NEW.price_proposed IS DISTINCT FROM OLD.price_proposed
        AND NEW.price_proposed IS DISTINCT FROM NEW.price THEN
    NEW.price_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cms_marketplace_price_approval ON directus_system.cms_marketplace;
CREATE TRIGGER trg_cms_marketplace_price_approval
BEFORE UPDATE ON directus_system.cms_marketplace
FOR EACH ROW EXECUTE FUNCTION cms_marketplace_price_approval();

-- ============================================================================
-- After running this against Supabase (SQL Editor or psql):
--   1. In Directus Studio -> Settings -> Data Model -> cms_marketplace,
--      confirm `price_proposed` and `price_status` showed up (Directus
--      auto-detects new DB columns; refresh if not).
--   2. Run scripts/setup_marketplace_catalog_roles.py against this Directus
--      instance to create the Catalog Editor / Catalog Manager roles+policies
--      that actually enforce who can touch `price` vs `price_proposed`.
--   3. Run scripts/configure_marketplace_ui.py to get the dropdown, colored
--      badge, field notes, and default table layout for these two fields.
-- ============================================================================

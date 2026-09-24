#!/usr/bin/env python3
"""
Makes the cms_marketplace Data Studio UI self-explanatory for non-technical
editors and managers. Idempotent - safe to re-run.

Ported from LoanCalculator2/directus/scripts/configure_ui.py (written for
cms_motorcycles) to moto-marketplace's cms_marketplace. Main differences:
  - cms_marketplace has no separate brands collection - `brand` is a plain
    text column, so there's no M2O relation to register (unlike brand_id in
    the original). It just gets a nicer text-input treatment.
  - `active` -> `published` (that's the real column name here).
  - `description` -> `short_description` (the real column name here).
  - `color` / `inner_brand_model` / `review_video_url` don't exist on
    cms_marketplace - skipped.
  - Adds a bit more polish to fields that DO exist here but weren't in the
    original: `category`, `promo_price`, `card_price`.

Configures:
  - price_status  -> dropdown + color-coded badge (grey/amber/green) with
                     Spanish labels
  - price_proposed / price / published / brand / model / category -> Spanish
                     help notes + sane interfaces and widths
  - a "Precio y aprobación" field group clustering the pricing fields
  - the collection itself -> icon, color, display template, note
  - a global default table layout (columns everyone sees)
  - a "Precios pendientes" bookmark scoped to the Catalog Manager role
    (their approval queue: filter price_status = pending)
  - the cms_marketplace_audit collection (if tracked): read-only, relations
    to cms_marketplace/directus_users, newest-first default layout

Run AFTER setup_marketplace_catalog_roles.py and
sql/marketplace_price_approval_workflow.sql.

Usage:
    python3 configure_marketplace_ui.py --url https://<your-directus-host> \
        --admin-email diego@finva-app.com --admin-password '...'
"""
import argparse
import sys

import requests

COLLECTION = "cms_marketplace"
MANAGER_ROLE_NAME = "Catalog Manager"
GROUP_FIELD = "grupo_precio"

AUDIT_COLLECTION = "cms_marketplace_audit"
USERS_COLLECTION = "directus_users"

# Badge colors: grey = no change, amber = pending, green = approved
GREY = "#A2B5CD"
AMBER = "#FBC02D"
GREEN = "#2ECDA7"

STATUS_CHOICES = [
    {"text": "Sin cambios", "value": "none", "color": GREY},
    {"text": "Pendiente de aprobación", "value": "pending", "color": AMBER},
    {"text": "Aprobado", "value": "approved", "color": GREEN},
]

# Categories seen in the current catalog (data/motorcycle-seed + cms rows).
# It's a free-text column in the DB, so this is just a curated pick-list for
# the UI - editors can still type a new one if the "Categoría" dropdown is
# left as a free-entry select (see options.allowOther below).
CATEGORY_CHOICES = [
    "Ciudad", "Deportiva", "Touring", "Adventure", "Trabajo",
    "Doble propósito", "Scooter", "Scrambler", "Naked",
]


class Directus:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")
        self.s = requests.Session()

    def login(self, email, password):
        r = self.s.post(f"{self.base_url}/auth/login", json={"email": email, "password": password})
        r.raise_for_status()
        self.s.headers.update({"Authorization": f"Bearer {r.json()['data']['access_token']}"})

    def get(self, path, **params):
        r = self.s.get(f"{self.base_url}{path}", params=params or None)
        r.raise_for_status()
        return r.json().get("data")

    def patch(self, path, payload):
        r = self.s.patch(f"{self.base_url}{path}", json=payload)
        if not r.ok:
            print(f"  ERROR PATCH {path}: {r.status_code} {r.text}", file=sys.stderr)
            r.raise_for_status()
        return r.json().get("data")

    def post(self, path, payload):
        r = self.s.post(f"{self.base_url}{path}", json=payload)
        return r


def field_exists(d, field, collection=COLLECTION):
    r = d.s.get(f"{d.base_url}/fields/{collection}/{field}")
    return r.ok


def patch_field_meta(d, field, meta, collection=COLLECTION):
    """Read-merge-write the field's meta so we don't clobber existing keys."""
    current = d.get(f"/fields/{collection}/{field}") or {}
    merged = {**(current.get("meta") or {}), **meta}
    d.patch(f"/fields/{collection}/{field}", {"meta": merged})
    print(f"  configured field '{collection}.{field}'")


def ensure_group_field(d):
    if field_exists(d, GROUP_FIELD):
        print(f"  group field '{GROUP_FIELD}' already exists")
        return
    body = {
        "field": GROUP_FIELD,
        "type": "alias",
        "meta": {
            "interface": "group-detail",
            "special": ["alias", "no-data", "group"],
            "options": {"start": "open"},
            "translations": [
                {"language": "es-ES", "translation": "Precio y aprobación"},
                {"language": "en-US", "translation": "Price & approval"},
            ],
            "sort": 50,
        },
    }
    r = d.post(f"/fields/{COLLECTION}", body)
    if r.ok:
        print(f"  created group field '{GROUP_FIELD}'")
    else:
        print(f"  WARN could not create group field: {r.status_code} {r.text}", file=sys.stderr)


def ensure_m2o(d, collection, field, related_collection):
    """Register a Many-to-One relation with NO database foreign key (the audit
    table intentionally has no FK so a deleted motorcycle/user never blocks or
    cascades the log). Idempotent."""
    r = d.s.get(f"{d.base_url}/relations/{collection}/{field}")
    if r.ok and r.json().get("data"):
        print(f"  relation {collection}.{field} -> {related_collection} already tracked")
        return
    body = {
        "collection": collection,
        "field": field,
        "related_collection": related_collection,
        "meta": {"sort_field": None},
        # no "schema" key -> Directus creates the relation without a DB FK
    }
    resp = d.post("/relations", body)
    if resp.ok:
        print(f"  registered relation {collection}.{field} -> {related_collection}")
    else:
        print(f"  WARN could not register {collection}.{field} relation: {resp.status_code} {resp.text}", file=sys.stderr)


def configure_audit(d):
    """Make cms_marketplace_audit a clean, read-only, admin-only change log."""
    # Relations so it shows the bike + real user instead of raw ids/uuids.
    ensure_m2o(d, AUDIT_COLLECTION, "motorcycle_id", COLLECTION)
    ensure_m2o(d, AUDIT_COLLECTION, "changed_by", USERS_COLLECTION)

    patch_field_meta(d, "motorcycle_id", {
        "interface": "select-dropdown-m2o", "display": "related-values",
        "options": {"template": "{{ brand }} {{ model }}"},
        "display_options": {"template": "{{ brand }} {{ model }}"},
        "readonly": True, "width": "half", "sort": 2,
        "translations": [{"language": "es-ES", "translation": "Moto"},
                         {"language": "en-US", "translation": "Motorcycle"}],
    }, collection=AUDIT_COLLECTION)
    patch_field_meta(d, "changed_by", {
        "interface": "select-dropdown-m2o", "display": "related-values",
        "options": {"template": "{{ email }}"},
        "display_options": {"template": "{{ email }}"},
        "readonly": True, "width": "half", "sort": 6,
        "translations": [{"language": "es-ES", "translation": "Modificado por"},
                         {"language": "en-US", "translation": "Changed by"}],
    }, collection=AUDIT_COLLECTION)
    patch_field_meta(d, "field", {
        "readonly": True, "width": "half", "sort": 3,
        "translations": [{"language": "es-ES", "translation": "Campo"},
                         {"language": "en-US", "translation": "Field"}],
    }, collection=AUDIT_COLLECTION)
    patch_field_meta(d, "old_value", {
        "readonly": True, "width": "half", "sort": 4,
        "translations": [{"language": "es-ES", "translation": "Valor anterior"},
                         {"language": "en-US", "translation": "Old value"}],
    }, collection=AUDIT_COLLECTION)
    patch_field_meta(d, "new_value", {
        "readonly": True, "width": "half", "sort": 5,
        "translations": [{"language": "es-ES", "translation": "Valor nuevo"},
                         {"language": "en-US", "translation": "New value"}],
    }, collection=AUDIT_COLLECTION)
    patch_field_meta(d, "changed_at", {
        "interface": "datetime", "display": "datetime",
        "display_options": {"relative": True},
        "readonly": True, "width": "half", "sort": 1,
        "translations": [{"language": "es-ES", "translation": "Fecha del cambio"},
                         {"language": "en-US", "translation": "Changed at"}],
    }, collection=AUDIT_COLLECTION)
    # Hide internal columns
    for hidden in ("id", "changed_by_email"):
        if field_exists(d, hidden, collection=AUDIT_COLLECTION):
            patch_field_meta(d, hidden, {"hidden": True}, collection=AUDIT_COLLECTION)

    # Collection chrome + newest-first default table.
    current = d.get(f"/collections/{AUDIT_COLLECTION}") or {}
    meta = current.get("meta") or {}
    meta.update({
        "icon": "history",
        "color": "#6644FF",
        "display_template": "{{ field }}: {{ old_value }} → {{ new_value }}",
        "note": "Registro de cambios del catálogo (solo lectura). Quién cambió "
                "qué campo, de qué valor a cuál, y cuándo.",
        "singleton": False,
    })
    d.patch(f"/collections/{AUDIT_COLLECTION}", {"meta": meta})
    print("  set audit collection icon / color / display template / note")

    audit_columns = ["changed_at", "motorcycle_id", "field", "old_value", "new_value", "changed_by"]
    existing = d.get("/presets", **{"filter[collection][_eq]": AUDIT_COLLECTION,
                                    "filter[role][_null]": "true",
                                    "filter[user][_null]": "true",
                                    "filter[bookmark][_null]": "true"}) or []
    payload = {
        "collection": AUDIT_COLLECTION,
        "layout": "tabular",
        "layout_query": {"tabular": {"fields": audit_columns, "sort": ["-changed_at"], "page": 1}},
        "layout_options": {"tabular": {"widths": {"changed_at": 200, "motorcycle_id": 200,
                                                  "field": 140, "old_value": 200,
                                                  "new_value": 200, "changed_by": 220}}},
    }
    if existing:
        d.patch(f"/presets/{existing[0]['id']}", payload)
        print("  updated audit default table layout")
    else:
        r = d.post("/presets", payload)
        print(f"  created audit default table layout ({r.status_code})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8055")
    ap.add_argument("--admin-email", required=True)
    ap.add_argument("--admin-password", required=True)
    args = ap.parse_args()

    d = Directus(args.url)
    print(f"Logging in to {args.url} as {args.admin_email}...")
    d.login(args.admin_email, args.admin_password)

    print("\n== Fields ==")
    ensure_group_field(d)

    # brand: plain text (no separate brands collection in this project)
    patch_field_meta(d, "brand", {
        "interface": "input",
        "width": "half",
        "sort": 1,
        "translations": [
            {"language": "es-ES", "translation": "Marca"},
            {"language": "en-US", "translation": "Brand"},
        ],
    })

    patch_field_meta(d, "model", {
        "interface": "input",
        "width": "half",
        "sort": 2,
        "translations": [
            {"language": "es-ES", "translation": "Modelo"},
            {"language": "en-US", "translation": "Model"},
        ],
    })

    # category: curated dropdown, but still allows a free-typed new value
    patch_field_meta(d, "category", {
        "interface": "select-dropdown",
        "options": {"choices": [{"text": c, "value": c} for c in CATEGORY_CHOICES], "allowOther": True},
        "width": "half",
        "sort": 3,
        "note": "Elige una categoría existente o escribe una nueva.",
        "translations": [
            {"language": "es-ES", "translation": "Categoría"},
            {"language": "en-US", "translation": "Category"},
        ],
    })

    # published: boolean toggle (this project's name for "active")
    patch_field_meta(d, "published", {
        "interface": "boolean",
        "display": "boolean",
        "width": "half",
        "sort": 4,
        "note": "Si está activada, la moto se muestra en el sitio.",
        "translations": [
            {"language": "es-ES", "translation": "Publicada"},
            {"language": "en-US", "translation": "Published"},
        ],
    })

    # price_status: dropdown to edit + colored badge to display
    patch_field_meta(d, "price_status", {
        "interface": "select-dropdown",
        "options": {"choices": STATUS_CHOICES},
        "display": "labels",
        "display_options": {"choices": STATUS_CHOICES, "showAsDot": False},
        "width": "half",
        "group": GROUP_FIELD,
        "sort": 3,
        "readonly": False,
        "hidden": False,
        "note": "Estado de la solicitud de precio. El manager lo cambia a "
                "**Aprobado** para autorizar el precio propuesto.",
        "translations": [
            {"language": "es-ES", "translation": "Estado del precio"},
            {"language": "en-US", "translation": "Price status"},
        ],
    })

    # price_proposed: what the editor fills in to request a change (first in group)
    patch_field_meta(d, "price_proposed", {
        "interface": "input",
        "options": {"min": 0, "iconLeft": "attach_money"},
        "width": "half",
        "group": GROUP_FIELD,
        "sort": 1,
        "readonly": False,
        "hidden": False,
        "note": "Escribe aquí el **nuevo precio propuesto**. Se enviará a "
                "revisión automáticamente; el precio actual no cambia hasta "
                "que un manager lo apruebe.",
        "translations": [
            {"language": "es-ES", "translation": "Precio propuesto"},
            {"language": "en-US", "translation": "Proposed price"},
        ],
    })

    # price: the live published value
    patch_field_meta(d, "price", {
        "interface": "input",
        "options": {"min": 0, "iconLeft": "attach_money"},
        "width": "half",
        "group": GROUP_FIELD,
        "sort": 2,
        "note": "Precio **actual publicado** (lo que ve el sitio). Solo un "
                "manager puede cambiarlo directamente, o se actualiza solo "
                "al aprobar un precio propuesto.",
        "translations": [
            {"language": "es-ES", "translation": "Precio actual"},
            {"language": "en-US", "translation": "Current price"},
        ],
    })

    # promo_price / card_price: exist on cms_marketplace but not on
    # cms_motorcycles - manager-only fields (see setup_marketplace_catalog_roles.py),
    # so just make them legible rather than adding them to the approval group.
    if field_exists(d, "promo_price"):
        patch_field_meta(d, "promo_price", {
            "interface": "input",
            "options": {"min": 0, "iconLeft": "attach_money"},
            "width": "half",
            "note": "Precio de promoción (opcional). Si se llena, se muestra tachado el precio normal.",
            "translations": [
                {"language": "es-ES", "translation": "Precio de promoción"},
                {"language": "en-US", "translation": "Promo price"},
            ],
        })
    if field_exists(d, "card_price"):
        patch_field_meta(d, "card_price", {
            "interface": "input",
            "options": {"min": 0, "iconLeft": "credit_card"},
            "width": "half",
            "note": "Precio al pagar con tarjeta (incluye comisión). Vacío = usar el precio actual. Solo Catalog Manager.",
            "translations": [
                {"language": "es-ES", "translation": "Precio con tarjeta"},
                {"language": "en-US", "translation": "Card price"},
            ],
        })

    print("\n== Field order & housekeeping ==")
    patch_field_meta(d, GROUP_FIELD, {"sort": 5})  # Precio y aprobación group, after brand/model/category/published

    patch_field_meta(d, "year", {
        "interface": "input", "options": {"min": 1900}, "width": "half", "sort": 6,
        "translations": [{"language": "es-ES", "translation": "Año"},
                         {"language": "en-US", "translation": "Year"}],
    })
    patch_field_meta(d, "short_description", {
        "interface": "input-multiline", "width": "full", "sort": 7,
        "translations": [{"language": "es-ES", "translation": "Descripción corta"},
                         {"language": "en-US", "translation": "Short description"}],
    })

    # Hide internal/system columns - not relevant to catalog users.
    for hidden_field in ("id", "slug", "updated_at", "finva_motorcycle_id"):
        if field_exists(d, hidden_field):
            patch_field_meta(d, hidden_field, {"hidden": True})

    print("\n== Collection ==")
    current = d.get(f"/collections/{COLLECTION}") or {}
    meta = current.get("meta") or {}
    meta.update({
        "icon": "two_wheeler",
        "color": "#2ECDA7",
        "display_template": "{{ brand }} {{ model }}",
        "note": "Catálogo de motos (moto-marketplace). Los editores proponen "
                "precios; los managers los aprueban.",
        "sort_field": "priority_score",
    })
    d.patch(f"/collections/{COLLECTION}", {"meta": meta})
    print("  set icon / color / display template / note")

    print("\n== Layouts ==")
    default_columns = ["brand", "model", "category", "price", "price_proposed", "price_status", "published"]

    # Global default table layout (role null + user null = applies to everyone
    # who hasn't set their own). Upsert by (collection, role=null, bookmark=null).
    existing_defaults = d.get(
        "/presets",
        **{"filter[collection][_eq]": COLLECTION,
           "filter[role][_null]": "true",
           "filter[user][_null]": "true",
           "filter[bookmark][_null]": "true"}) or []
    default_payload = {
        "collection": COLLECTION,
        "layout": "tabular",
        "layout_query": {"tabular": {"fields": default_columns, "sort": ["brand", "model"], "page": 1}},
        "layout_options": {"tabular": {"widths": {"brand": 140, "model": 220, "category": 140, "price": 140,
                                                  "price_proposed": 160, "price_status": 200, "published": 110}}},
    }
    if existing_defaults:
        d.patch(f"/presets/{existing_defaults[0]['id']}", default_payload)
        print("  updated global default table layout")
    else:
        r = d.post("/presets", default_payload)
        print(f"  created global default table layout ({r.status_code})")

    manager_role = d.get("/roles", **{"filter[name][_eq]": MANAGER_ROLE_NAME, "limit": 1})
    if not manager_role:
        print(f"  WARN role '{MANAGER_ROLE_NAME}' not found, skipping manager presets "
              "(run setup_marketplace_catalog_roles.py first)")
    else:
        role_id = manager_role[0]["id"]
        manager_columns = ["brand", "model", "year", "price", "published"]
        manager_widths = {"brand": 160, "model": 240, "year": 100, "price": 160, "published": 110}

        def upsert_preset(match, payload, label):
            existing = d.get("/presets", **match) or []
            if existing:
                d.patch(f"/presets/{existing[0]['id']}", payload)
                print(f"  updated {label}")
            else:
                r = d.post("/presets", payload)
                print(f"  created {label} ({r.status_code})")

        # Manager DEFAULT view. Role-scoped presets win over the global
        # default, so managers land on this table.
        upsert_preset(
            {"filter[collection][_eq]": COLLECTION,
             "filter[role][_eq]": role_id,
             "filter[bookmark][_null]": "true"},
            {"collection": COLLECTION, "role": role_id, "layout": "tabular",
             "layout_query": {"tabular": {"fields": manager_columns,
                                          "sort": ["brand", "model"], "page": 1}},
             "layout_options": {"tabular": {"widths": manager_widths}}},
            "manager default view (Marca/Modelo/Año/Precio/Publicada)")

        # Manager bookmark: pending price approvals queue.
        upsert_preset(
            {"filter[collection][_eq]": COLLECTION,
             "filter[bookmark][_eq]": "Precios pendientes",
             "filter[role][_eq]": role_id},
            {"collection": COLLECTION, "bookmark": "Precios pendientes", "role": role_id,
             "icon": "pending_actions", "color": AMBER, "layout": "tabular",
             "filter": {"price_status": {"_eq": "pending"}},
             "layout_query": {"tabular": {"fields": ["brand", "model", "price", "price_proposed", "price_status"],
                                          "sort": ["brand", "model"], "page": 1}},
             "layout_options": {"tabular": {"widths": {"brand": 140, "model": 220, "price": 140,
                                                       "price_proposed": 160, "price_status": 200}}}},
            "manager bookmark 'Precios pendientes'")

    print("\n== Audit collection ==")
    audit_check = d.s.get(f"{d.base_url}/collections/{AUDIT_COLLECTION}")
    if audit_check.ok:
        configure_audit(d)
    else:
        print(f"  {AUDIT_COLLECTION} not tracked yet - run sql/marketplace_audit_table.sql and add it as a "
              "collection in Settings > Data Model, then re-run this script")

    print("\n== Done ==")
    print("Reload the Data Studio (hard refresh) to see the new labels, badge, and layout.")


if __name__ == "__main__":
    main()

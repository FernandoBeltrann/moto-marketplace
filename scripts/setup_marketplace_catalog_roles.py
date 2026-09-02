#!/usr/bin/env python3
"""
Sets up the same "test authorization" scenario used in LoanCalculator2's
Directus (see LoanCalculator2/directus/scripts/setup_catalog_roles.py), but
for moto-marketplace's own CMS collection, cms_marketplace:

  - Catalog Editor role: can add/read every listing and edit the day-to-day
    content fields (brand, model, year, category, description, images,
    availability, etc.) plus PROPOSE a new price via `price_proposed`.
    Cannot touch the live `price`, `price_status`, `slug`, `card_price`, or
    `finva_motorcycle_id` - those are either the manager's call (price) or
    linked to routing/Finva backend integration and risky to edit casually.
  - Catalog Manager role: everything the Editor can do, PLUS can edit every
    field (including price directly, and price_status to approve a proposed
    price).

Run this AFTER sql/marketplace_price_approval_workflow.sql (price_proposed /
price_status need to exist on cms_marketplace before permissions referencing
them make sense).

Idempotent: safe to re-run against the same instance (looks up existing
policies/roles/users by name/email before creating).

Usage:
    pip install requests --break-system-packages
    python3 setup_marketplace_catalog_roles.py --url http://localhost:8055 \
        --admin-email diego@finva-app.com --admin-password '...'

    # or point at your deployed Directus once ready:
    python3 setup_marketplace_catalog_roles.py --url https://<your-directus-host> \
        --admin-email diego@finva-app.com --admin-password '...'

Prints the two test-user logins at the end, and runs a quick smoke test
(as the Editor user) confirming price edits are rejected, content edits
succeed, and the propose -> approve flow works end to end - then reverts the
test edit so no real data is left changed.
"""
import argparse
import secrets
import string
import sys

import requests

COLLECTION = "cms_marketplace"  # directus_system.cms_marketplace; trigger syncs into public.motorcycles
COMMENTS_COLLECTION = "directus_comments"
NOTIFICATIONS_COLLECTION = "directus_notifications"
USERS_COLLECTION = "directus_users"
# Safe subset of user fields for the @-mention picker to search/display -
# excludes password, tfa_secret, token, auth_data, etc.
MENTIONABLE_USER_FIELDS = ["id", "first_name", "last_name", "email", "avatar"]

EDITOR_POLICY_NAME = "Catalog Editor"
MANAGER_POLICY_NAME = "Catalog Price Approval"
EDITOR_ROLE_NAME = "Catalog Editor"
MANAGER_ROLE_NAME = "Catalog Manager"

EDITOR_USER_EMAIL = "catalog.editor.test@finva-app.com"
MANAGER_USER_EMAIL = "catalog.manager.test@finva-app.com"

# Content fields the Editor may create/update freely. Deliberately excludes:
#   id, slug            - identity / URL, changing these breaks routes
#   price, price_status - the manager's approval gate
#   card_price           - payment-processing price, treat like price
#   finva_motorcycle_id  - links this row to the Finva backend, manager-only
#   updated_at            - managed by the existing tr_motorcycles_set_updated_at-style trigger
# Adjust this list if your business rules differ - it's the one thing in this
# script most likely to need tweaking for your actual editorial workflow.
EDITOR_CONTENT_FIELDS = [
    "brand", "model", "year", "category", "engine_cc", "monthly_from",
    "suggested_down_payment", "short_description", "priority_score",
    "available_cities", "tags", "best_for", "specs", "published",
    "image_url", "gallery_urls", "gallery", "purchase_url", "cover_image_file",
]


def gen_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(20))


class Directus:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def login(self, email: str, password: str) -> None:
        r = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password},
        )
        r.raise_for_status()
        token = r.json()["data"]["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get_one(self, collection: str, filter_field: str, value: str):
        r = self.session.get(
            f"{self.base_url}/{collection}",
            params={f"filter[{filter_field}][_eq]": value, "limit": 1},
        )
        r.raise_for_status()
        data = r.json()["data"]
        return data[0] if data else None

    def create(self, collection: str, payload: dict):
        r = self.session.post(f"{self.base_url}/{collection}", json=payload)
        if not r.ok:
            print(f"ERROR creating {collection}: {r.status_code} {r.text}", file=sys.stderr)
            r.raise_for_status()
        return r.json()["data"]

    def patch(self, collection: str, item_id, payload: dict):
        # /items/{collection} is the generic endpoint and always live, unlike
        # the /{collection} shorthand alias which Directus only registers at
        # process boot - a collection tracked while the server is already
        # running (like cms_marketplace) won't have that alias yet.
        r = self.session.patch(f"{self.base_url}/items/{collection}/{item_id}", json=payload)
        return r


def ensure_policy(d: Directus, name: str) -> str:
    existing = d.get_one("policies", "name", name)
    if existing:
        print(f"  policy '{name}' already exists ({existing['id']})")
        return existing["id"]
    created = d.create(
        "policies",
        {
            "name": name,
            "icon": "supervised_user_circle",
            "admin_access": False,
            "app_access": True,
        },
    )
    print(f"  created policy '{name}' ({created['id']})")
    return created["id"]


def ensure_permission(d: Directus, policy_id: str, collection: str, action: str, fields, permissions_filter=None):
    r = d.session.get(
        f"{d.base_url}/permissions",
        params={
            "filter[policy][_eq]": policy_id,
            "filter[collection][_eq]": collection,
            "filter[action][_eq]": action,
            "limit": 1,
        },
    )
    r.raise_for_status()
    existing = r.json()["data"]
    payload = {
        "policy": policy_id,
        "collection": collection,
        "action": action,
        "fields": fields,
        "permissions": permissions_filter or {},
        "validation": {},
        "presets": {},
    }
    if existing:
        pid = existing[0]["id"]
        r2 = d.session.patch(f"{d.base_url}/permissions/{pid}", json=payload)
        r2.raise_for_status()
        print(f"  updated permission {collection}.{action} -> fields={fields}")
    else:
        d.create("permissions", payload)
        print(f"  created permission {collection}.{action} -> fields={fields}")


def set_policy_roles(d: Directus, policy_id: str, role_ids: list, label: str) -> None:
    """
    Directus 11.x has multiple confirmed bugs around the roles<->policies
    m2m (directus_access) when written via the API (github.com/directus/directus/issues/24224
    and related). The Data Studio UI does NOT hit the same code path and
    works fine (confirmed manually against the LoanCalculator2 instance).
    So: try the API write as a convenience, but if it 403s, don't crash the
    rest of the script (permissions/users below are unaffected and still
    worth applying) - just tell the operator to do this one link by hand.
    """
    r = d.session.patch(f"{d.base_url}/policies/{policy_id}", json={"roles": role_ids})
    if r.ok:
        print(f"  policy '{label}' -> exactly {len(role_ids)} role(s) (via API)")
        return
    print(f"  Could not set roles for policy '{label}' via API ({r.status_code}) - known Directus bug.")
    print(f"  MANUAL STEP: in the Data Studio, open policy '{label}' -> Roles tab, "
          f"and make sure it's linked to exactly these {len(role_ids)} role(s): {role_ids}")


def ensure_role(d: Directus, name: str) -> str:
    existing = d.get_one("roles", "name", name)
    if existing:
        role_id = existing["id"]
        print(f"  role '{name}' already exists ({role_id})")
        return role_id
    created = d.create("roles", {"name": name, "icon": "badge"})
    role_id = created["id"]
    print(f"  created role '{name}' ({role_id})")
    return role_id


def ensure_user(d: Directus, email: str, role_id: str) -> str:
    existing = d.get_one("users", "email", email)
    password = gen_password()
    if existing:
        d.session.patch(
            f"{d.base_url}/users/{existing['id']}",
            json={"role": role_id, "password": password, "status": "active"},
        ).raise_for_status()
        print(f"  user '{email}' already existed, role synced + password reset")
        return existing["id"], password
    created = d.create(
        "users",
        {
            "email": email,
            "password": password,
            "role": role_id,
            "status": "active",
            "first_name": "Catalog",
            "last_name": "Test",
        },
    )
    print(f"  created user '{email}'")
    return created["id"], password


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8055")
    ap.add_argument("--admin-email", required=True)
    ap.add_argument("--admin-password", required=True)
    args = ap.parse_args()

    admin = Directus(args.url)
    print(f"Logging in to {args.url} as {args.admin_email}...")
    admin.login(args.admin_email, args.admin_password)

    print("\n== Policies ==")
    editor_policy_id = ensure_policy(admin, EDITOR_POLICY_NAME)
    ensure_permission(admin, editor_policy_id, COLLECTION, "create", ["*"])
    ensure_permission(admin, editor_policy_id, COLLECTION, "read", ["*"])
    # Editor can edit the content fields plus PROPOSE a price via
    # price_proposed. They cannot touch the live `price`, `price_status`,
    # `slug`, `card_price`, or `finva_motorcycle_id` - so they cannot
    # self-approve or quietly change routing/backend linkage. The DB trigger
    # (marketplace_price_approval_workflow.sql) flips price_status to
    # 'pending' for them automatically.
    # NOTE: `grupo_precio` (the alias group field created by
    # configure_marketplace_ui.py) must be in this list too - Directus
    # renders a grouped field read-only unless its containing group field is
    # also permitted. It holds no data, so granting it is harmless.
    editor_update_fields = EDITOR_CONTENT_FIELDS + ["price_proposed", "grupo_precio"]
    ensure_permission(admin, editor_policy_id, COLLECTION, "update", editor_update_fields)

    manager_policy_id = ensure_policy(admin, MANAGER_POLICY_NAME)
    # Manager is the full authority on the catalog: can edit EVERY field on
    # cms_marketplace (including price directly and price_status to approve
    # a proposed price). "*" unions with the editor policy the manager role
    # also carries, so they end up with complete edit access.
    ensure_permission(admin, manager_policy_id, COLLECTION, "update", ["*"])

    print("\n== Comments/notifications (so Editor can ask Manager to approve a price) ==")
    for policy_id, label in [(editor_policy_id, EDITOR_POLICY_NAME), (manager_policy_id, MANAGER_POLICY_NAME)]:
        # Comments only on cms_marketplace items, not any collection
        ensure_permission(admin, policy_id, COMMENTS_COLLECTION, "create", ["*"], {"collection": {"_eq": COLLECTION}})
        ensure_permission(admin, policy_id, COMMENTS_COLLECTION, "read", ["*"], {"collection": {"_eq": COLLECTION}})
        # See/mark-read their own @mention notifications
        ensure_permission(admin, policy_id, NOTIFICATIONS_COLLECTION, "read", ["*"], {"recipient": {"_eq": "$CURRENT_USER"}})
        ensure_permission(admin, policy_id, NOTIFICATIONS_COLLECTION, "update", ["status"], {"recipient": {"_eq": "$CURRENT_USER"}})
        # Minimal, safe user fields so the @-mention picker can find people
        ensure_permission(admin, policy_id, USERS_COLLECTION, "read", MENTIONABLE_USER_FIELDS)
        print(f"  granted comments/mentions/notifications to '{label}'")

    print("\n== Roles ==")
    editor_role_id = ensure_role(admin, EDITOR_ROLE_NAME)
    manager_role_id = ensure_role(admin, MANAGER_ROLE_NAME)

    # Best-effort: declare the full desired role list per policy in one shot.
    # Falls back to printing manual instructions instead of crashing if the
    # API 403s (see set_policy_roles docstring) - the user/permission setup
    # below still needs to run either way.
    set_policy_roles(admin, editor_policy_id, [editor_role_id, manager_role_id], EDITOR_POLICY_NAME)
    set_policy_roles(admin, manager_policy_id, [manager_role_id], MANAGER_POLICY_NAME)

    print("\n== Test users ==")
    editor_user_id, editor_password = ensure_user(admin, EDITOR_USER_EMAIL, editor_role_id)
    manager_user_id, manager_password = ensure_user(admin, MANAGER_USER_EMAIL, manager_role_id)

    print("\n== Smoke test (as Catalog Editor) ==")
    list_resp = admin.session.get(f"{admin.base_url}/items/{COLLECTION}", params={"limit": 1})
    if not list_resp.ok:
        print(f"  ERROR listing {COLLECTION} as admin: HTTP {list_resp.status_code} {list_resp.text}")
        print("  Skipping smoke test - fix this (e.g. Directus schema cache, collection not tracked) before retrying.")
        sample = None
    else:
        listing = list_resp.json().get("data", [])
        sample = listing[0] if listing else None
    if not sample:
        print(f"  no rows in {COLLECTION} yet, skipping smoke test (there should be existing motorcycles - "
              "if this is empty, check you're pointed at the right Directus/database)")
    else:
        item_id = sample["id"]
        original_price = sample["price"]
        original_card_price = sample.get("card_price")
        has_workflow = "price_status" in sample  # marketplace_price_approval_workflow.sql applied yet?
        editor = Directus(args.url)
        editor.login(EDITOR_USER_EMAIL, editor_password)
        manager = Directus(args.url)
        manager.login(MANAGER_USER_EMAIL, manager_password)

        def ok(status_ok):
            return "as expected" if status_ok else "UNEXPECTED - check permissions!"

        r = editor.patch(COLLECTION, item_id, {"price": (original_price or 0) + 1})
        print(f"  editor edits live price directly: HTTP {r.status_code} (blocked {ok(r.status_code == 403)})")

        r2 = editor.patch(COLLECTION, item_id, {"published": sample.get("published")})
        print(f"  editor edits published/model/brand/etc: HTTP {r2.status_code} (allowed {ok(r2.ok)})")

        r3 = editor.patch(COLLECTION, item_id, {"card_price": original_card_price})
        print(f"  editor edits card_price (manager-only): HTTP {r3.status_code} (blocked {ok(r3.status_code == 403)})")

        if not has_workflow:
            print("  price_status field not found - run sql/marketplace_price_approval_workflow.sql, then re-run to test the approval flow")
        else:
            proposed = (original_price or 0) + 1000
            r4 = editor.patch(COLLECTION, item_id, {"price_proposed": proposed})
            print(f"  editor proposes a new price: HTTP {r4.status_code} (allowed {ok(r4.ok)})")

            r5 = editor.patch(COLLECTION, item_id, {"price_status": "approved"})
            print(f"  editor tries to self-approve: HTTP {r5.status_code} (blocked {ok(r5.status_code == 403)})")

            check = admin.session.get(f"{admin.base_url}/items/{COLLECTION}/{item_id}",
                                      params={"fields[]": ["price_status", "price", "price_proposed"]}).json()["data"]
            print(f"  status after proposal: {check.get('price_status')!r} "
                  f"(pending {ok(check.get('price_status') == 'pending')}); live price still {check.get('price')}")

            r6 = manager.patch(COLLECTION, item_id, {"price_status": "approved"})
            print(f"  manager approves: HTTP {r6.status_code} (allowed {ok(r6.ok)})")

            after = admin.session.get(f"{admin.base_url}/items/{COLLECTION}/{item_id}",
                                      params={"fields[]": ["price_status", "price", "price_proposed"]}).json()["data"]
            print(f"  after approval: live price = {after.get('price')} "
                  f"(applied {ok(after.get('price') == proposed)}); status reset to {after.get('price_status')!r}")

            # restore original price so re-runs stay clean
            manager.patch(COLLECTION, item_id, {"price": original_price})

    print("\n== Done ==")
    print(f"Catalog Editor login:  {EDITOR_USER_EMAIL} / {editor_password}")
    print(f"Catalog Manager login: {MANAGER_USER_EMAIL} / {manager_password}")
    print(f"Data Studio: {args.url}/admin")


if __name__ == "__main__":
    main()

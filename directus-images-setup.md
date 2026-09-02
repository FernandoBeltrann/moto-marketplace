# Directus + Supabase Storage — image upload/replace setup

Goal: manage motorcycle photos (upload new, replace existing) from Directus's admin UI, writing directly into the same Supabase Storage bucket the site already reads from — no changes needed in the Next.js app itself.

**Updated for your actual setup:** Directus is already connected and edits `directus_system.cms_marketplace`, a mirror of `public.motorcycles`. A trigger (`trg_sync_cms_marketplace` → `sync_cms_to_marketplace()`) already upserts every `cms_marketplace` row into `motorcycles` on INSERT/UPDATE — including `image_url` and `gallery_urls` — and sets `published = false` on DELETE. That means the sync work is already done: everything below only needs to write into `cms_marketplace`; the existing trigger takes care of getting it into `motorcycles`, which is what `lib/catalog.ts` and the storefront actually read.

Current state (for reference): `cms_marketplace.image_url` and `.gallery_urls` are plain text/JSON columns, mirrored verbatim into `motorcycles.image_url`/`.gallery_urls`, which `lib/catalog.ts` reads as-is. `next.config.js` already whitelists `*.supabase.co/storage/v1/**` for `next/image`. That whole path stays untouched — Directus just needs to keep writing valid URLs into `cms_marketplace`'s two columns.

## 1. Directus ↔ database — already done

Skipping this; you said Directus is already connected. One thing worth confirming since it affects step 4: which schema shows `cms_marketplace` in Directus's Data Model list, and does that schema (or `public`) also hold Directus's own `directus_files` table? If you're not sure, check Settings → Data Model in Directus Studio — whatever collection name you see there for this table is what you'll use in step 4.

## 2. Add the new column

Run `sql/motorcycles_add_directus_files.sql` (same way you already run the other files in `sql/`, via the Supabase SQL editor) — it only adds `directus_system.cms_marketplace.cover_image_file uuid`, nullable, no FK. **It does not touch `public.motorcycles`** — the sync trigger only forwards the columns it explicitly lists (`id`, `brand`, … `image_url`, `gallery_urls`, …), so a raw file-relation column on `motorcycles` would just be dead weight; only `cms_marketplace` needs it, since that's the table Directus's "Image" field actually binds to. The gallery relation is created later by Directus itself (step 4).

## 3. Point Directus's file storage at your existing bucket

In Supabase: **Project Settings → Storage → S3 Connection**, generate an **Access Key ID / Secret Access Key**, and note the **endpoint** and **region** shown there (endpoint follows the pattern `https://<project_ref>.storage.supabase.co/storage/v1/s3`).

Directus env vars:

```env
STORAGE_LOCATIONS="supabase"
STORAGE_SUPABASE_DRIVER="s3"
STORAGE_SUPABASE_KEY="<access key id>"
STORAGE_SUPABASE_SECRET="<secret access key>"
STORAGE_SUPABASE_BUCKET="<your bucket name>"
STORAGE_SUPABASE_REGION="<region from the S3 Connection page>"
STORAGE_SUPABASE_ENDPOINT="https://<project_ref>.storage.supabase.co/storage/v1/s3"
STORAGE_SUPABASE_FORCE_PATH_STYLE="true"
```

`FORCE_PATH_STYLE=true` matters — Supabase's S3 endpoint isn't AWS's virtual-hosted-style domain, so Directus needs path-style requests to reach it. Restart Directus after setting these, then in **Settings → Files** set the default storage adapter to `supabase` so every upload through the UI lands in this bucket without you having to pick it each time.

## 4. Add the fields in Directus Studio

Go to **Settings → Data Model → cms_marketplace** (the collection Directus already shows for `directus_system.cms_marketplace` — not `motorcycles`, which Directus never touches directly):

- **Cover image**: Create Field → type **Image**, bind it to the existing `cover_image_file` column. Editors will see a single-image drag-and-drop widget on each row.
- **Gallery**: Create Field → type **Files (M2M)**, name it `gallery`. Let Directus create the junction table for you when it offers to (it'll be something like `cms_marketplace_files`) — cleaner than forcing the gallery into a plain array column.

At this point, non-technical staff can open any `cms_marketplace` row and drag a new photo into either field, or replace an existing one by uploading over it. Each upload becomes a *new* file object in Directus (a new UUID and storage key) rather than overwriting bytes in place — a nice side effect is you never hit a stale-CDN-cache problem on replace, since the URL genuinely changes. The old file stays in `directus_files`/the bucket as an orphan unless someone deletes it, so it's worth a periodic cleanup pass in Directus's Files browser.

## 5. Sync the URLs into `image_url` / `gallery_urls` on `cms_marketplace`

This is the one piece Directus doesn't do automatically: the fields you just added store file *relations* (UUIDs), but `cms_marketplace.image_url`/`.gallery_urls` — the plain strings `sync_cms_to_marketplace()` forwards to `motorcycles` — need to be recomputed from them. Build this as one Flow with five pieces: a trigger, then four operations wired in a chain (each operation's output becomes available to everything after it, keyed by the name you give that operation). **Everything below writes only to `cms_marketplace`; your existing trigger takes it from there into `motorcycles` — do not add a step that touches `motorcycles`.**

Go to **Settings → Flows → Create Flow**. Name it something like `sync-cms-marketplace-images`.

### 5.1 Trigger

Pick **Event Hook** as the trigger type, then configure:

- **Type**: `Action (Non-Blocking)`. (There's also `Filter (Blocking)`, which fires *before* the write and can be more elegant, but Directus has open bugs where payload changes returned from a blocking filter don't reliably persist — Action is the boring, reliable choice.)
- **Scope**: check `items.create` and `items.update`.
- **Collections**: select `cms_marketplace` only.

Save the trigger. It carries the event's data into a `$trigger` object every later operation can read (`$trigger.payload` = the fields that were actually part of this write; `$trigger.key` = the row's id it fired for — for a bulk edit this may come through as `$trigger.keys`, an array, instead. You'll confirm which one your instance uses in 5.2's test run).

### 5.2 Operation 1 — Condition (skip unrelated edits)

Without this, editing the price on a motorcycle would also fire this flow, recompute the same URLs, write them back, and that write would re-trigger the flow again — an unnecessary loop. Add a **Condition** operation, name it `only_if_files_changed`, and give it a rule that only passes when the incoming write actually touched the image fields:

```json
{
  "_or": [
    { "$trigger": { "payload": { "cover_image_file": { "_nnull": true } } } },
    { "$trigger": { "payload": { "gallery": { "_nnull": true } } } }
  ]
}
```

Wire the operation's **resolve** path (rule passed) to the next operation (5.3). Leave **reject** (rule failed) unconnected — the flow just ends quietly on unrelated edits, no error logged.

Before trusting this rule, run one real test: open the flow, use Directus's **Logs**/test-run panel, edit a motorcycle's cover image in Directus, and inspect the actual `$trigger` payload it recorded. Confirm `payload.cover_image_file` is really where the new file's id shows up (for the M2M `gallery` field it may arrive nested differently, e.g. as an array of `{ directus_files_id: "<uuid>" }` objects, or Directus may omit `gallery` from `$trigger.payload` entirely for M2M relations since those are written via the junction table, not a column on `cms_marketplace` itself — if that's the case here, drop the `gallery` half of the condition and rely on `cover_image_file` alone, or trigger a second, near-identical flow scoped to the junction collection `cms_marketplace_files` instead).

### 5.3 Operation 2 — Read Data (fetch the resolved file info)

Add a **Read Data** operation named `read_row`:

- **Collection**: `cms_marketplace`
- **IDs**: `{{$trigger.key}}` (or `{{$trigger.keys[0]}}` if your test run in 5.2 showed `keys` instead of `key`)
- **Query** → Fields: `cover_image_file.filename_disk, gallery.directus_files_id.filename_disk`

Read Data always returns an **array** of the items it read (even for one id), so its output is `data.read_row[0]`, not `data.read_row` directly — that matters in the next step.

### 5.4 Operation 3 — Run Script (compute the URLs)

Add a **Run Script** operation named `build_urls`, language Node.js, and replace the template with:

```js
module.exports = async function (data) {
  const projectUrl = 'https://<project_ref>.supabase.co'; // replace with your Supabase project URL
  const bucket = '<your bucket name>'; // replace with your bucket name

  const toPublicUrl = (filenameDisk) =>
    `${projectUrl}/storage/v1/object/public/${bucket}/${filenameDisk}`;

  const row = data.read_row?.[0]; // Read Data returns an array — take the first item
  if (!row) return { image_url: null, gallery_urls: [] };

  const image_url = row.cover_image_file?.filename_disk
    ? toPublicUrl(row.cover_image_file.filename_disk)
    : null;

  const gallery_urls = (row.gallery ?? [])
    .map((g) => g?.directus_files_id?.filename_disk)
    .filter(Boolean)
    .map(toPublicUrl);

  return { image_url, gallery_urls };
};
```

`data` here is the whole chain so far — `data.read_row` is operation 5.3's output because that's the key you gave it. If you named that operation something other than `read_row`, use that name instead.

### 5.5 Operation 4 — Update Data (write it back)

Add an **Update Data** operation named `write_urls`:

- **Collection**: `cms_marketplace`
- **IDs**: `{{$trigger.key}}` (same value you used in 5.3)
- **Payload**:
  ```json
  {
    "image_url": "{{build_urls.image_url}}",
    "gallery_urls": "{{build_urls.gallery_urls}}"
  }
  ```

This is a normal SQL `UPDATE` under the hood, so `trg_sync_cms_marketplace` fires on it exactly like a human edit and upserts the result into `motorcycles` — nothing else to build for that part. It does also re-trigger `items.update` on `cms_marketplace`, but by then `$trigger.payload` only contains `image_url`/`gallery_urls`, not `cover_image_file`/`gallery`, so the Condition from 5.2 rejects that second pass and the loop stops itself.

Save the flow, then do the end-to-end test in step 6.

## 6. Verify

- Upload a cover photo on one row in Directus → confirm `cms_marketplace.image_url` updates (Supabase table editor) → confirm `motorcycles.image_url` picked it up via the trigger → confirm the storefront shows it after the next ISR revalidation (up to 120s, per `revalidate` in the catalog pages).
- No changes needed in the Next.js app: `lib/catalog.ts`, `next.config.js`, and `types/motorcycle.ts` already expect exactly this shape, and they only ever read from `motorcycles`.

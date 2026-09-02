# Directus — blog_posts setup

Wires the new `public.blog_posts` table (added by `sql/blog_posts.sql`) up to
Directus Studio so editors can write posts, and confirms what the Next.js
side (`lib/blog.ts`, `app/blog/**`) already expects.

Unlike `cms_marketplace`, this is a brand-new table — Directus can point at
it directly. No mirror table, no sync trigger, no `sync_cms_to_marketplace()`
involved.

## 1. Run the SQL migration

In the Supabase SQL Editor, run `sql/blog_posts.sql`. It creates
`public.blog_posts` (idempotent — safe to re-run), a unique index on `slug`,
an index for the published/listing query, RLS enabled with no public policy
(same as `motorcycles` — the site reads with `SUPABASE_SERVICE_ROLE_KEY`,
which bypasses RLS), and a trigger that keeps `updated_at` current and sets
`published_at` automatically the first time a post is published.

**Verify:**
```sql
select * from public.blog_posts limit 1; -- should return 0 rows, not an error
```

## 2. Add the collection in Directus Studio

**Settings → Data Model → Create Collection → Use Existing Table** → select
`blog_posts`. Directus will auto-detect the columns; go through each one and
set the interface:

| Field | Interface | Notes |
|---|---|---|
| `id` | (default, hidden) | Primary key, auto-generated |
| `title` | Input | Required |
| `slug` | Input | Required. Consider Directus's "Auto-generate" slug action off `title` if editors won't hand-write slugs |
| `author` | Input | Free text, optional — no separate author collection/login for v1 |
| `excerpt` | Textarea | Optional. Shows on the blog listing card and as a meta-description fallback |
| `body` | WYSIWYG (Rich Text HTML) | Required. Rendered as-is on the post page — only editors with Directus access can write it |
| `cover_image_file` | Image | Optional. See Step 3 for how this becomes a public URL |
| `cover_image_url` | Input | **Hide this field from the edit form** (or make it read-only) — it's written by the Flow in Step 3, not typed by hand |
| `published` | Toggle | Default off. Same pattern as `motorcycles.published` |
| `published_at` | Datetime | Read-only in the UI — set automatically by the SQL trigger the first time `published` flips to true |
| `created_at`, `updated_at` | Datetime | Read-only, both auto-managed |

## 3. Cover image → public URL (optional, can skip for v1)

Same problem as `cms_marketplace.image_url`: the `cover_image_file` field
stores a Directus file *relation* (a UUID), but `lib/blog.ts` reads
`cover_image_url` as a plain string. If you want editors to drag-and-drop a
cover photo instead of pasting a URL by hand, build the same kind of Flow
already documented in `directus-images-setup.md` §5, adapted for this table:

- Trigger: Event Hook, `items.create` + `items.update`, collection
  `blog_posts`.
- Condition: only continue if `$trigger.payload.cover_image_file` is set.
- Read Data: read the row, fields `cover_image_file.filename_disk`.
- Run Script: build the public URL the same way (`https://<project_ref>.supabase.co/storage/v1/object/public/<bucket>/<filename_disk>`).
- Update Data: write `cover_image_url` back onto the same row.

Directus already has Supabase Storage configured as its storage adapter
(done for the motorcycle images) — this Flow reuses that, just pointed at a
different collection.

**Until this Flow exists:** editors can paste a public image URL directly
into `cover_image_url` (unhide the field in that case) — the front end reads
whatever string is there either way, it doesn't care whether a human typed
it or a Flow computed it.

## 4. Permissions

For a first pass, the simplest option is giving your existing content-editor
role (or a new "Blog Editor" role, same idea as `Catalog Editor` in
`directus-catalog-roles-setup.md`) full CRUD on `blog_posts`. There's no
price-approval-style workflow needed here — posts don't have a field that
needs manager-only protection the way `price`/`card_price` do on
motorcycles. Add role/permission scripting later only if that changes (e.g.
multiple authors who shouldn't edit each other's drafts).

## 5. Verify end-to-end

- [ ] Create a test post in Directus with `published` off — confirm it does
      **not** appear on `/blog` (draft, correctly hidden).
- [ ] Flip `published` on — confirm `published_at` gets set automatically
      (check the Supabase table editor), and the post appears on `/blog`
      within the 120s ISR window (`revalidate` in `app/blog/page.tsx`).
- [ ] Open the post page (`/blog/<slug>`) — confirm title, author, date,
      cover image (if set), and body render correctly.
- [ ] View page source — confirm the `BlogPosting` JSON-LD script tag is
      present with the right title/dates (Section on AEO in the CMS
      feasibility report).
- [ ] Check `/sitemap.xml` — confirm `/blog` and the new post URL are both
      listed, with the post's real `updated_at`/`published_at` as `lastmod`.

<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the MotoClick marketplace. Here is a summary of all changes made:

- **`instrumentation-client.ts`** (new) — Initializes `posthog-js` on the client using Next.js 15.3+ instrumentation conventions. Configured with a reverse proxy (`/ingest`), exception capture enabled, and debug mode in development.
- **`lib/posthog-server.ts`** (new) — Singleton `posthog-node` client for server-side event capture. Includes a `shutdownPostHog()` helper that flushes and resets the cached instance to prevent stale client issues on long-running standalone deployments.
- **`next.config.js`** (updated) — Added reverse proxy rewrites routing `/ingest/*` to PostHog's ingestion endpoint, plus `/ingest/static/*` and `/ingest/array/*` for asset delivery. Also added `skipTrailingSlashRedirect: true`.
- **`lib/analytics.ts`** (updated) — Extended the existing multi-pixel `track()` wrapper to also call `posthog.capture()` for every event. Added two new event types: `search_catalog` and `filter_catalog`.
- **`components/LeadForm.tsx`** (updated) — On submit: calls `posthog.identify()` using the user's phone number as the distinct ID, passes `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID` headers to the API route for server-side correlation, and enriches the `submit_lead` event with `city` and `purchaseTiming` properties.
- **`components/SearchBox.tsx`** (updated) — Fires `search_catalog` with `query`, `budget`, and `useCase` properties when the hero search form is submitted.
- **`components/CatalogClient.tsx`** (updated) — Fires `filter_catalog` with `filter` type and `value` when brand, category, or price filters are applied in the catalog listing.
- **`app/api/leads/route.ts`** (updated) — After saving the lead to CRM/Supabase, captures a server-side `lead_submitted_server` event with full lead context. Reads `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID` headers to correlate the server event with the client-side user session.
- **`.env.local`** (new) — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` set for local development.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `submit_lead` | User submits the lead form to start purchase with a Finva agent | `components/LeadForm.tsx` |
| `click_whatsapp` | User clicks the WhatsApp CTA button on a product page | `components/WhatsAppButton.tsx` |
| `use_calculator` | User adjusts the payment calculator on a product page | `components/PaymentCalculator.tsx` |
| `search_catalog` | User submits a search from the hero search box | `components/SearchBox.tsx` |
| `filter_catalog` | User applies a brand, category, or price filter in the catalog | `components/CatalogClient.tsx` |
| `lead_submitted_server` | Server confirms lead saved to CRM and/or Supabase | `app/api/leads/route.ts` |

## Next steps

We've built a dashboard and five insights for you to monitor user behavior and conversion performance:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/418289/dashboard/1567473
- **Lead conversion funnel** (calculator → lead form → server confirmation): https://us.posthog.com/project/418289/insights/Qc2AOfi6
- **Daily leads submitted** (trend over 30 days): https://us.posthog.com/project/418289/insights/mvFKhfYh
- **WhatsApp vs Lead Form conversions** (side-by-side trend): https://us.posthog.com/project/418289/insights/lbsqB05T
- **Top catalog filters used** (table by filter type + value): https://us.posthog.com/project/418289/insights/nH7khf85
- **Calculator engagement by motorcycle** (top listings driving financing intent): https://us.posthog.com/project/418289/insights/FvCSIjmL

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

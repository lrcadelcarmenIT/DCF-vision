# DCF Vision

Food-production inspection demonstration by Christian Del Carmen and Steven Flogio.

## What works

- Product website with a scroll-led, four-step sample walkthrough.
- Protected control room using Sites-provided ChatGPT identity.
- Per-owner facilities and production-line configurations in D1.
- Eight fixed demonstration scenarios across pack, label, count and stop workflows.
- Durable demo records with expected and observed scenario values.
- Human confirmation/dismissal, notes, timestamp and reviewer identity.
- Search/filter of the latest 100 records, all-time aggregate totals, CSV export.
- Idempotent retries for facility creation, line creation, sample runs and reviews.
- Missing-identity rejection, server-side ownership checks, same-origin mutation checks, bounded request bodies and private/no-store API responses.

## Important limitations

This is a working demonstration workspace, **not a production machine-vision system**.

No camera/video ingestion, vision model inference, OCR, barcode decoding, edge processing, PLC/reject control, measured accuracy, validated latency, billing, shared company memberships, lead inbox or customer notifications is implemented.

All existing and new inspection outcomes are simulated. Earlier simulator messages are preserved but explicitly labelled. The previous confidence and live-output values are no longer exposed by the dashboard API. Production lines are configurations, never described as connected equipment.

The walkthrough uses a static concept rendering and a generated sample image. It is not true 3D, recorded footage or evidence from an installed machine. The missing-compartment overlay is predefined, not model-generated.

The site remains private according to its existing Sites access policy. Co-founder attribution does not grant Steven account access or access to another owner's facilities.

## Runtime and source

Vinext / React, Cloudflare Worker ESM, D1 prepared statements, Drizzle schema migrations. Preserve Sites configuration, package manager, lockfile and the existing project identity.

- `app/landing.tsx`: product narrative and walkthrough.
- `app/dashboard.tsx`: control room, setup, review and export.
- `app/inspection-evidence.tsx`: explicit synthetic sample evidence.
- `lib/dcf-demo.ts`: canonical fixed scenarios and shared types.
- `lib/dcf-db.ts`: identity, authorization, request guards and D1 queries.
- `app/api/`: scoped route handlers.
- `db/schema.ts`, `drizzle/`: schema and append-only migrations.
- `scripts/verify-dcf.mjs`: offline regression checks.

The original applied migration is unchanged. The additive second migration labels prior records as demo and adds review/evidence fields. Deploying through Sites applies pending migrations; saving a version alone does not update the live schema or website.

Use the Sites skills for build, source saving and publication. Do not start a local preview unless browser testing was requested.

## Verification

```sh
npx tsc --noEmit --incremental false
node --experimental-vm-modules scripts/verify-dcf.mjs
```

The regression script uses real route-handler code and in-memory SQLite. It does not test the deployed Cloudflare environment, actual Sites authentication dispatch, browser layout or camera performance.

## Asset provenance

- `public/dcf-vision-hero.png`: generated machinery concept rendering from the earlier design.
- `public/inspection-sample.png`: built-in image generation, 1536 × 1024. Prompt: perpendicular overhead product photo, black tray with exact 2 × 3 moulded compartments, five pale dumplings and an empty bottom-right compartment, clear film, blank right-edge label, brushed stainless background, neutral inspection lighting, no text or UI. Used only as labelled synthetic sample imagery.

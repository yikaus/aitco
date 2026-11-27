# Intelligence Economics

A browser-local enterprise agentic AI economics simulator. Workloads, not token guesses, are the starting point. All financial calculations are deterministic TypeScript in the client; there is no account, API, database or enterprise-input telemetry.

## Run locally

```bash
npm install
npm run dev            # Vite at http://localhost:5173
npm test               # 15 calculation tests
npm run test:e2e       # Playwright Chromium desktop + 390px mobile (install browser: npx playwright install chromium)
npm run build          # TypeScript + production static bundle
npm run preview        # Preview production bundle
```

## Cloudflare Workers with Static Assets

`wrangler.jsonc` serves `dist/` as static assets and falls back to the SPA entry point for direct navigation. No Worker code or persistent services are required.

```bash
npm run build
npx wrangler dev        # Local Workers asset preview
npm run deploy          # Deploy only after authorising a Cloudflare account/project
```

**Do not deploy without authorisation.** The deployed site is public by default. No deployment has been performed by this project.

## Architecture and calculations

- `src/engine/types.ts` declares scenario and result contracts; `src/engine/calculate.ts` contains pure validation, workload → execution → tiered inference, capacity, distillation, TCO, forecast and sensitivity functions. No browser APIs are used by the engine.
- `src/data/presets.ts` defines synthetic enterprise/workload/price/forecast defaults. Enterprise size or industry selection regenerates *suggestions* for workloads, while users can override each volume.
- `src/App.tsx` and `src/components/Fields.tsx` render the React calculator and exports. localStorage stores current and named scenarios. JSON exports carry `schemaVersion: 1`; CSV exports cover cost and forecast ledgers. Imported scenarios are schema-checked and validated.
- There are no verified vendor quotes or external benchmark spend claims. Generic price tiers and GPU throughput are explicitly illustrative. The model-price catalogue includes provider, region, date, source and verification fields for future evidence-backed prices.

Core chain per domain and complexity: eligible = volume × eligibility; adopted = eligible × adoption; tasks = adopted + proactive. Skills = tasks × class share × skills/task × domain skills multiplier × (1 − reuse). Calls = skills × (1 − deterministic) × calls/skill × (1 + retry) × (1 + fan-out) × (1 + escalation). Input tokens add context overhead, context optimisation and annual efficiency; output adds reasoning only when not already included. Cached and uncached input portions are disjoint; write charges apply only to a configured subset. Tier allocations sum to 100% per domain/class. Deterministic skills incur runtime but no inference. Private inference is GPU-capacity-priced separately. Monthly TCO sums each cost category once; first year adds migration once. Forecast cumulative cost sums years 1–5 plus migration.

The interface explains each step and the Methodology page labels assumptions, derived values and limitations. Forecast price floors are user-controlled assumptions, not market facts. Potential labour productivity is not automatically a cash saving, and proactive tasks earn no labour savings.

## Verification

Unit tests independently check a 100-task example: 100 frontier calls × (2,000 input / 300 output) = 200,000 input + 30,000 output tokens; inference = 0.2 × $8 + 0.03 × $40 = **$2.80/month**. Tests also cover zero work, deterministic execution, caching, validation, cost reconciliation, capacity, forecasts and rebound behaviour. Playwright exercises navigation, inputs, persistence and desktop/mobile layouts and checks for page errors and horizontal overflow.

## Known limitations and next steps

The model uses point estimates, not uncertainty bands. GPU costs use assumed measured application throughput; capacity economics are indicative and must be validated with load/latency/quality experiments. Distillation payback is an upper-bound screen, not a guarantee of equivalent service quality. Generic prices are not vendor quotations. Browser localStorage is device-specific; export JSON for backup. No taxes, financing, procurement discounts, or unentered change-management costs are included. For production research, add dated official model pricing sources, validate domain distributions against enterprise evidence, add uncertainty ranges and quality gates, and consider lazy-loading charts to reduce bundle size. Future optional Cloudflare services: KV for public price snapshots, D1 for price history, R2 for anonymised benchmark traces and scheduled Workers for pricing updates. None are needed for V1.

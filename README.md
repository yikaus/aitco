# Intelligence Economics

A browser-local enterprise agentic AI economics simulator. Workloads, not token guesses, are the starting point. All financial calculations are deterministic TypeScript in the client; there is no account, API, database or enterprise-input telemetry.

**Live deployments:**
- **GitHub Pages:** https://yikaus.github.io/aitco/
- **Cloudflare Workers (with dynamic API):** https://aitco.yikaus.workers.dev/

## AI Agent Integration

This calculator is designed to be operated directly by AI agents—either by fetching static JSON snapshots on GitHub Pages, invoking browser-native WebMCP tools, or calling the dynamic Cloudflare Worker API.

### 1. Read-only JSON & discovery endpoints (GitHub Pages)

Ideal for web-browsing assistants (e.g., Gemini, ChatGPT Browse) and scripts that read static JSON without CORS or `/api/*` restrictions:

- `https://yikaus.github.io/aitco/llms.txt` — machine-readable agent guide and endpoint index
- `https://yikaus.github.io/aitco/openapi.json` — OpenAPI 3.1 schema
- `https://yikaus.github.io/aitco/presets.json` — enterprise profiles (`Medium`, `Large`, `Global`), industries, maturity levels (`0–4`), supply strategies, and provider pricing catalogues (`Generic baseline`, `AWS Bedrock (Claude 5.5)`, `OpenRouter (Claude 5.5)`, `OpenRouter (Value mix)`, `OpenAI (GPT-6.2 stack)`)
- `https://yikaus.github.io/aitco/scenarios.json` — 15 pre-computed real-world and demand-rebound scenarios across Medium, Large, and Global enterprises
- `https://yikaus.github.io/aitco/compare.json` — default 6-provider comparison matrix

```bash
curl -s https://yikaus.github.io/aitco/presets.json
curl -s https://yikaus.github.io/aitco/scenarios.json
```

### 2. Browser WebMCP & `window.__aitco` (live on https://yikaus.github.io/aitco/)

When opened in a WebMCP-enabled browser, the app registers 6 tools on `document.modelContext` / `navigator.modelContext` while keeping the human UI unchanged:

- `get_calculator_state` *(read-only)* — read the active scenario, summary metrics, TCO breakdown, and 5-year forecast
- `list_presets` *(read-only)* — list valid enterprise sizes, industries, maturity levels, strategies, and pricing catalogues
- `configure_scenario` — update the live calculator state in the browser UI
- `calculate_what_if` *(read-only)* — evaluate a what-if scenario without mutating UI state
- `compare_scenarios` *(read-only)* — compare multiple scenarios side-by-side
- `navigate_view` — switch workspace tabs or toggle Advanced modelling

Browser automation agents can also call the same bridge directly via `window.__aitco`:

```js
window.__aitco.configureScenario({ preset: 'Large', maturity: 3, pricePreset: 'AWS Bedrock (Claude 5.5)' });
window.__aitco.calculateWhatIf({ forecastPreset: 'Rapid commoditisation' });
```

### 3. Dynamic on-demand API (Cloudflare Workers)

Because GitHub Pages serves static files, dynamic query-parameter and JSON `POST` calculations (`GET /estimate.json?...`, `GET /compare.json?...`, `POST /api/calculate`, `POST /api/compare`, `GET /api/presets`) are served by the Cloudflare Worker at `https://aitco.yikaus.workers.dev` (referenced automatically by `https://yikaus.github.io/aitco/openapi.json`).

### 4. Example agent prompt

```text
Read https://yikaus.github.io/aitco/presets.json and https://yikaus.github.io/aitco/scenarios.json.
Using ONLY the exact numbers returned in scenarios.json (do not invent figures), write a short
executive comparison contrasting Frontier-only vs Tiered routing across AWS Bedrock (Claude 5.5),
OpenRouter (Value mix), and OpenAI (GPT-6.2 stack), plus the Rapid commoditisation rebound stress
test. Include a Markdown table and link to https://yikaus.github.io/aitco/.
```

## Run locally

```bash
npm install
npm run dev            # Vite at http://localhost:5173
npm test               # 30 calculation & agent API tests
npm run test:e2e       # Playwright Chromium desktop + 390px mobile (install browser: npx playwright install chromium)
npm run build          # TypeScript + production static bundle (Cloudflare Workers)
npm run build:pages    # Build static bundle + agent JSON files for GitHub Pages
npm run preview        # Preview production bundle
```

## Deployment

- **GitHub Pages:** Automated via `.github/workflows/pages.yml` on push to `main` (runs `npm test` and `npm run build:pages`), publishing to https://yikaus.github.io/aitco/.
- **Cloudflare Workers with Static Assets:** `wrangler.jsonc` + `worker/index.ts` serve `./dist` as static assets and route `/api/*`, `/openapi.json`, `/llms.txt`, `/robots.txt`, and `*.json` endpoints through the Worker:

```bash
npm run build
npx wrangler dev        # Local Workers asset + API preview
npm run deploy          # Deploy to Cloudflare Workers (https://aitco.yikaus.workers.dev/)
```

## Architecture and calculations

- `src/engine/types.ts` declares scenario and result contracts; `src/engine/calculate.ts` contains pure validation, workload → execution → tiered inference, capacity, distillation, TCO, forecast and sensitivity functions. No browser APIs are used by the engine.
- `src/engine/agentApi.ts` and `src/agent/webmcp.ts` expose the pure scenario builder/evaluator, OpenAPI/`llms.txt` generators, and browser WebMCP / `window.__aitco` bridge.
- `src/data/presets.ts` defines synthetic enterprise/workload/price/forecast defaults and reference provider pricing catalogues. Enterprise size or industry selection regenerates *suggestions* for workloads, while users can override each volume.
- `src/App.tsx` and `src/components/Fields.tsx` render the React calculator and exports. localStorage stores current and named scenarios. JSON exports carry `schemaVersion: 1`; CSV exports cover cost and forecast ledgers. Imported scenarios are schema-checked and validated.
- Generic price tiers and GPU throughput are explicitly illustrative; reference provider catalogues are point-in-time snapshots for scenario modeling, not vendor quotations.

Core chain per domain and complexity: eligible = volume × eligibility; adopted = eligible × adoption; tasks = adopted + proactive. Skills = tasks × class share × skills/task × domain skills multiplier × (1 − reuse). Calls = skills × (1 − deterministic) × calls/skill × (1 + retry) × (1 + fan-out) × (1 + escalation). Input tokens add context overhead, context optimisation and annual efficiency; output adds reasoning only when not already included. Cached and uncached input portions are disjoint; write charges apply only to a configured subset. Tier allocations sum to 100% per domain/class. Deterministic skills incur runtime but no inference. Private inference is GPU-capacity-priced separately. Monthly TCO sums each cost category once; first year adds migration once. Forecast cumulative cost sums years 1–5 plus migration.

The interface explains each step and the Methodology page labels assumptions, derived values and limitations. Forecast price floors are user-controlled assumptions, not market facts. Potential labour productivity is not automatically a cash saving, and proactive tasks earn no labour savings.

## Verification

Unit tests independently check a 100-task example: 100 frontier calls × (2,000 input / 300 output) = 200,000 input + 30,000 output tokens; inference = 0.2 × $8 + 0.03 × $40 = **$2.80/month**. Tests also cover zero work, deterministic execution, caching, validation, cost reconciliation, capacity, forecasts, rebound behaviour, provider pricing presets, and Worker API endpoints. Playwright exercises navigation, inputs, persistence and desktop/mobile layouts and checks for page errors and horizontal overflow.

## Known limitations and next steps

The model uses point estimates, not uncertainty bands. GPU costs use assumed measured application throughput; capacity economics are indicative and must be validated with load/latency/quality experiments. Distillation payback is an upper-bound screen, not a guarantee of equivalent service quality. Generic prices are not vendor quotations. Browser localStorage is device-specific; export JSON for backup. No taxes, financing, procurement discounts, or unentered change-management costs are included. For production research, add dated official model pricing sources, validate domain distributions against enterprise evidence, add uncertainty ranges and quality gates, and consider lazy-loading charts to reduce bundle size. Future optional Cloudflare services: KV for public price snapshots, D1 for price history, R2 for anonymised benchmark traces and scheduled Workers for pricing updates. None are needed for V1.

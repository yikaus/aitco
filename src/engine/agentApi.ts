import type {
  Complexity,
  Costs,
  Distillation,
  Domain,
  DomainKey,
  Enterprise,
  Execution,
  Forecast,
  ForecastPoint,
  Hosting,
  Price,
  Results,
  Scenario,
  Tier,
  Value,
} from './types';
import {
  MATURITY_LEVELS,
  PRICE_PRESETS,
  SUPPLY_STRATEGIES,
  applyMaturity,
  applyPricePreset,
  applySupplyStrategy,
  domainKeys,
  forecastPresets,
  industries,
  makeScenario,
  pricePresets,
  profiles,
  suggestedDomains,
} from '../data/presets';
import {
  calculate,
  distillationEconomics,
  forecast,
  hostingEconomics,
  sensitivity,
  validate,
} from './calculate';

export const WORKSPACE_PAGES = [
  'Overview',
  'Workloads & adoption',
  'Supply & execution',
  'TCO & value',
  '5-year forecast',
  'Compare scenarios',
  'Methodology',
] as const;

export type DomainOverride = Partial<
  Pick<
    Domain,
    | 'volume'
    | 'eligibility'
    | 'adoption'
    | 'proactiveMode'
    | 'proactive'
    | 'success'
    | 'intervention'
    | 'skillsMultiplier'
    | 'trigger'
    | 'humanHours'
  >
> & {
  classes?: Partial<Record<Complexity, Partial<Domain['classes'][Complexity]>>>;
};

export interface ScenarioInput {
  base?: Scenario;
  preset?: string;
  industry?: string;
  maturity?: number;
  strategy?: string;
  pricePreset?: string;
  forecastPreset?: string;
  globalPriceAdjustment?: number;
  enableSelfHosted?: boolean;
  enableStudentModels?: boolean;
  name?: string;
  regenerateWorkloads?: boolean;
  enterprise?: Partial<Enterprise>;
  execution?: Partial<Execution>;
  hosting?: Partial<Hosting>;
  distillation?: Partial<Distillation>;
  costs?: Partial<Costs>;
  value?: Partial<Value>;
  forecast?: Partial<Forecast>;
  prices?: Partial<Record<Tier, Partial<Price>>>;
  domainOverrides?: Partial<Record<DomainKey, DomainOverride>>;
}

export interface AgentSummary {
  name: string;
  preset: string;
  industry: string;
  maturity: string;
  strategy: string;
  pricePreset: string;
  globalPriceAdjustment: number;
  monthlyTasks: number;
  monthlyTokens: number;
  monthlyInferenceUsd: number;
  annualInferenceUsd: number;
  monthlyTcoUsd: number;
  annualTcoUsd: number;
  firstYearTcoUsd: number;
  fiveYearCumulativeTcoUsd: number;
  inferenceShareOfTco: number;
  costPerSuccessUsd: number | null;
  costPerAttemptUsd: number | null;
  monthlyProductivityUsd: number;
  monthlyCashSavingsUsd: number;
  netAnnualEconomicBenefitUsd: number;
  paybackMonths: number | null;
}

export function buildScenario(
  input: ScenarioInput = {},
  current?: Scenario
): { scenario: Scenario; errors: string[] } {
  const errors: string[] = [];

  if (input.preset !== undefined && !(input.preset in profiles)) {
    errors.push(`Unknown preset "${input.preset}". Valid presets: ${Object.keys(profiles).join(', ')}`);
  }
  if (input.industry !== undefined && !(input.industry in industries)) {
    errors.push(`Unknown industry "${input.industry}". Valid industries: ${Object.keys(industries).join(', ')}`);
  }
  if (
    input.maturity !== undefined &&
    (!Number.isInteger(input.maturity) || input.maturity < 0 || input.maturity > 4)
  ) {
    errors.push('maturity must be an integer between 0 and 4');
  }
  if (
    input.strategy !== undefined &&
    !SUPPLY_STRATEGIES.includes(input.strategy as (typeof SUPPLY_STRATEGIES)[number])
  ) {
    errors.push(`Unknown strategy "${input.strategy}". Valid strategies: ${SUPPLY_STRATEGIES.join(', ')}`);
  }
  if (input.pricePreset !== undefined && !(input.pricePreset in pricePresets)) {
    errors.push(`Unknown pricePreset "${input.pricePreset}". Valid pricePresets: ${PRICE_PRESETS.join(', ')}`);
  }
  if (input.forecastPreset !== undefined && !(input.forecastPreset in forecastPresets)) {
    errors.push(
      `Unknown forecastPreset "${input.forecastPreset}". Valid forecastPresets: ${Object.keys(forecastPresets).join(', ')}`
    );
  }

  let scenario = input.base
    ? structuredClone(input.base)
    : current
      ? structuredClone(current)
      : makeScenario(input.preset && input.preset in profiles ? input.preset : 'Medium');

  if (errors.length > 0) {
    return { scenario, errors };
  }

  let shouldRegenerate = Boolean(input.regenerateWorkloads);

  if (input.preset !== undefined && (input.base || current || input.preset !== scenario.preset)) {
    scenario.preset = input.preset;
    scenario.enterprise = { ...profiles[input.preset] };
    shouldRegenerate = true;
  }

  if (input.industry !== undefined) {
    scenario.industry = input.industry;
    shouldRegenerate = true;
  }

  if (input.enterprise) {
    Object.assign(scenario.enterprise, input.enterprise);
  }

  if (shouldRegenerate) {
    scenario.domains = suggestedDomains(scenario.enterprise, scenario.industry);
  }

  if (input.maturity !== undefined) {
    scenario = applyMaturity(scenario, input.maturity);
  }

  if (input.strategy !== undefined) {
    scenario = applySupplyStrategy(scenario, input.strategy);
  }

  if (input.pricePreset !== undefined) {
    scenario = applyPricePreset(scenario, input.pricePreset);
  }

  if (input.forecastPreset !== undefined) {
    scenario.forecast = { ...forecastPresets[input.forecastPreset] };
  }

  if (input.enableSelfHosted !== undefined) {
    scenario.enableSelfHosted = input.enableSelfHosted;
  }
  if (input.enableStudentModels !== undefined) {
    scenario.enableStudentModels = input.enableStudentModels;
  }
  if (input.globalPriceAdjustment !== undefined) {
    scenario.globalPriceAdjustment = input.globalPriceAdjustment;
  }
  if (input.name !== undefined) {
    scenario.name = input.name;
  }

  if (input.execution) Object.assign(scenario.execution, input.execution);
  if (input.hosting) Object.assign(scenario.hosting, input.hosting);
  if (input.distillation) Object.assign(scenario.distillation, input.distillation);
  if (input.costs) Object.assign(scenario.costs, input.costs);
  if (input.value) Object.assign(scenario.value, input.value);
  if (input.forecast) Object.assign(scenario.forecast, input.forecast);

  if (input.prices) {
    for (const tier of ['frontier', 'mid', 'light', 'self'] as Tier[]) {
      const override = input.prices[tier];
      if (override) {
        Object.assign(scenario.prices[tier], override);
        if (tier !== 'self') {
          scenario.pricePreset = 'Custom';
        }
      }
    }
  }

  if (input.domainOverrides) {
    for (const [key, override] of Object.entries(input.domainOverrides)) {
      const dom = scenario.domains.find((d) => d.key === key);
      if (!dom) {
        errors.push(`Unknown domain "${key}". Valid domains: ${domainKeys.join(', ')}`);
        continue;
      }
      if (!override) continue;
      const { classes, ...rest } = override;
      Object.assign(dom, rest);
      if (classes) {
        for (const cls of ['simple', 'medium', 'complex'] as Complexity[]) {
          const classOverride = classes[cls];
          if (classOverride) {
            const { routing, ...classRest } = classOverride;
            Object.assign(dom.classes[cls], classRest);
            if (routing) {
              Object.assign(dom.classes[cls].routing, routing);
            }
          }
        }
      }
    }
  }

  errors.push(...validate(scenario));
  return { scenario, errors };
}

export function summarizeResults(s: Scenario, r: Results, points: ForecastPoint[]): AgentSummary {
  return {
    name: s.name,
    preset: s.preset,
    industry: s.industry,
    maturity: MATURITY_LEVELS[s.maturity] ?? `L${s.maturity}`,
    strategy: s.strategy,
    pricePreset: s.pricePreset ?? 'Generic baseline',
    globalPriceAdjustment: s.globalPriceAdjustment,
    monthlyTasks: r.tasks,
    monthlyTokens: r.input + r.output,
    monthlyInferenceUsd: r.inference,
    annualInferenceUsd: r.inference * 12,
    monthlyTcoUsd: r.monthlyTco,
    annualTcoUsd: r.annualTco,
    firstYearTcoUsd: r.firstYearTco,
    fiveYearCumulativeTcoUsd: points[5].cumulative,
    inferenceShareOfTco: r.monthlyTco > 0 ? r.inference / r.monthlyTco : 0,
    costPerSuccessUsd: r.perSuccess,
    costPerAttemptUsd: r.perAttempt,
    monthlyProductivityUsd: r.productivity,
    monthlyCashSavingsUsd: r.cashSavings,
    netAnnualEconomicBenefitUsd: r.netAnnual,
    paybackMonths: r.paybackMonths,
  };
}

export function evaluateScenario(
  input: ScenarioInput = {},
  options: { includeSensitivity?: boolean; includeScenario?: boolean; current?: Scenario } = {}
) {
  const { scenario, errors } = buildScenario(input, options.current);
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const results = calculate(scenario);
  const points = forecast(scenario);
  const summary = summarizeResults(scenario, results, points);
  const hosting = scenario.enableSelfHosted
    ? hostingEconomics(scenario, results.selfInput, results.selfOutput)
    : null;
  const distillation = scenario.enableStudentModels
    ? distillationEconomics(scenario, results.inference)
    : null;

  return {
    ok: true as const,
    summary,
    results,
    forecast: points,
    hosting,
    distillation,
    ...(options.includeSensitivity ? { sensitivity: sensitivity(scenario) } : {}),
    ...(options.includeScenario ? { scenario } : {}),
  };
}

const DEFAULT_COMPARISON_ITEMS: Array<{ label: string } & ScenarioInput> = [
  { label: 'Medium · Frontier only', preset: 'Medium', strategy: 'Frontier only' },
  {
    label: 'Medium · Tiered (Generic baseline)',
    preset: 'Medium',
    strategy: 'Tiered routing',
    pricePreset: 'Generic baseline',
  },
  {
    label: 'Medium · Tiered (AWS Bedrock Claude 5.5)',
    preset: 'Medium',
    strategy: 'Tiered routing',
    pricePreset: 'AWS Bedrock (Claude 5.5)',
  },
  {
    label: 'Medium · Tiered (OpenRouter Value mix)',
    preset: 'Medium',
    strategy: 'Tiered routing',
    pricePreset: 'OpenRouter (Value mix)',
  },
  {
    label: 'Medium · Tiered (OpenAI GPT-6.2 stack)',
    preset: 'Medium',
    strategy: 'Tiered routing',
    pricePreset: 'OpenAI (GPT-6.2 stack)',
  },
];

export function compareScenarios(items?: Array<{ label?: string } & ScenarioInput>) {
  const list = items && items.length > 0 ? items : DEFAULT_COMPARISON_ITEMS;
  const comparisons = list.map((item, index) => {
    const { label, ...input } = item;
    const evaluation = evaluateScenario(input, { includeScenario: false, includeSensitivity: false });
    if (!evaluation.ok) {
      return {
        label: label ?? `Scenario ${index + 1}`,
        ok: false as const,
        errors: evaluation.errors,
      };
    }
    return {
      label: label ?? evaluation.summary.name,
      ok: true as const,
      summary: evaluation.summary,
      year5: evaluation.forecast[5],
    };
  });

  return { ok: true as const, comparisons };
}

export function getPresetsCatalog() {
  return {
    schemaVersion: 1,
    enterprisePresets: Object.keys(profiles),
    profiles,
    industries: Object.keys(industries),
    maturityLevels: [...MATURITY_LEVELS],
    supplyStrategies: [...SUPPLY_STRATEGIES],
    pricePresets: PRICE_PRESETS,
    pricePresetDetails: pricePresets,
    forecastPresets: Object.keys(forecastPresets),
    domainKeys,
    pages: [...WORKSPACE_PAGES],
  };
}

export function getOpenApiSpec(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Intelligence Economics API',
      version: '1.0.0',
      description:
        'Deterministic enterprise agentic AI TCO, token inference, and 5-year forecast calculator API.',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/health': {
        get: {
          summary: 'Health check and endpoint discovery',
          responses: { '200': { description: 'Service status and available endpoints' } },
        },
      },
      '/api/presets': {
        get: {
          summary: 'List valid enterprise presets, industries, maturity levels, strategies, and pricing catalogues',
          responses: { '200': { description: 'Catalog of valid input presets and defaults' } },
        },
      },
      '/api/calculate': {
        get: {
          summary: 'Run a scenario calculation from query parameters',
          parameters: [
            { name: 'preset', in: 'query', schema: { type: 'string', enum: Object.keys(profiles) } },
            { name: 'industry', in: 'query', schema: { type: 'string', enum: Object.keys(industries) } },
            { name: 'maturity', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 4 } },
            { name: 'strategy', in: 'query', schema: { type: 'string', enum: [...SUPPLY_STRATEGIES] } },
            { name: 'pricePreset', in: 'query', schema: { type: 'string', enum: PRICE_PRESETS } },
            {
              name: 'forecastPreset',
              in: 'query',
              schema: { type: 'string', enum: Object.keys(forecastPresets) },
            },
            { name: 'globalPriceAdjustment', in: 'query', schema: { type: 'number', minimum: 0.01 } },
            { name: 'enableSelfHosted', in: 'query', schema: { type: 'boolean' } },
            { name: 'enableStudentModels', in: 'query', schema: { type: 'boolean' } },
            { name: 'includeScenario', in: 'query', schema: { type: 'boolean', default: false } },
            { name: 'includeSensitivity', in: 'query', schema: { type: 'boolean', default: false } },
          ],
          responses: {
            '200': { description: 'Calculated summary, domain breakdown, and 5-year forecast' },
            '400': { description: 'Validation error' },
          },
        },
        post: {
          summary: 'Run a full or partial scenario calculation from JSON body',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    preset: { type: 'string', enum: Object.keys(profiles) },
                    industry: { type: 'string', enum: Object.keys(industries) },
                    maturity: { type: 'integer', minimum: 0, maximum: 4 },
                    strategy: { type: 'string', enum: [...SUPPLY_STRATEGIES] },
                    pricePreset: { type: 'string', enum: PRICE_PRESETS },
                    forecastPreset: { type: 'string', enum: Object.keys(forecastPresets) },
                    globalPriceAdjustment: { type: 'number' },
                    enableSelfHosted: { type: 'boolean' },
                    enableStudentModels: { type: 'boolean' },
                    includeScenario: { type: 'boolean', default: true },
                    includeSensitivity: { type: 'boolean', default: true },
                    domainOverrides: { type: 'object' },
                    execution: { type: 'object' },
                    prices: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Calculated summary, domain breakdown, 5-year forecast, and sensitivity' },
            '400': { description: 'Invalid JSON or validation error' },
          },
        },
      },
      '/api/compare': {
        post: {
          summary: 'Compare multiple scenarios side-by-side (or default provider/strategy benchmarks when empty)',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scenarios: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Comparison array with summary and year-5 forecast for each scenario' },
            '400': { description: 'Invalid JSON body' },
          },
        },
      },
    },
  };
}

export function getLlmsTxt(origin: string): string {
  return `# Intelligence Economics — AI Agent API

Base URL: ${origin}
OpenAPI Schema: ${origin}/openapi.json

## Endpoints
- GET  /api/health
- GET  /api/presets
- GET  /api/calculate?preset=Large&maturity=3&pricePreset=AWS+Bedrock+(Claude+5.5)
- POST /api/calculate
- POST /api/compare

## Valid Preset Values
- preset: ${Object.keys(profiles).join(' | ')}
- industry: ${Object.keys(industries).join(' | ')}
- maturity: 0..4 (${MATURITY_LEVELS.join(' | ')})
- strategy: ${SUPPLY_STRATEGIES.join(' | ')}
- pricePreset: ${PRICE_PRESETS.join(' | ')}
- forecastPreset: ${Object.keys(forecastPresets).join(' | ')}

## Examples
curl -s "${origin}/api/presets"

curl -s -X POST "${origin}/api/calculate" \\
  -H "Content-Type: application/json" \\
  -d '{"preset":"Large","maturity":3,"pricePreset":"AWS Bedrock (Claude 5.5)","includeScenario":false}'

curl -s -X POST "${origin}/api/compare" \\
  -H "Content-Type: application/json" \\
  -d '{}'

## Browser WebMCP
When opened in a WebMCP-enabled browser, the page also registers:
get_calculator_state, list_presets, configure_scenario, calculate_what_if, compare_scenarios, navigate_view
`;
}

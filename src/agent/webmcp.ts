import type { ForecastPoint, Results, Scenario } from '../engine/types';
import {
  type ScenarioInput,
  WORKSPACE_PAGES,
  buildScenario,
  compareScenarios,
  evaluateScenario,
  getPresetsCatalog,
  summarizeResults,
} from '../engine/agentApi';

export interface AgentBridgeController {
  getSnapshot: () => {
    scenario: Scenario;
    results: Results;
    forecast: ForecastPoint[];
    errors: string[];
    page: string;
    advanced: boolean;
    savedNames: string[];
  };
  setScenario: (scenario: Scenario) => void;
  setPage: (page: string) => void;
  setAdvanced: (advanced: boolean) => void;
  saveCurrent: () => void;
  reset: () => void;
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
  };
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface ModelContextLike {
  registerTool?: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void;
}

declare global {
  interface Window {
    __aitco?: {
      getState: () => unknown;
      listPresets: () => unknown;
      configureScenario: (input?: ScenarioInput) => unknown;
      calculateWhatIf: (input?: ScenarioInput) => unknown;
      compareScenarios: (items?: Array<{ label?: string } & ScenarioInput>) => unknown;
      navigate: (page?: string, advanced?: boolean) => unknown;
      saveCurrent: () => unknown;
      reset: () => unknown;
    };
  }
}

export function registerAgentBridge(controller: AgentBridgeController): () => void {
  const getState = () => {
    const snap = controller.getSnapshot();
    return {
      ok: true,
      page: snap.page,
      advanced: snap.advanced,
      savedNames: snap.savedNames,
      validationErrors: snap.errors,
      summary: summarizeResults(snap.scenario, snap.results, snap.forecast),
      results: snap.results,
      forecast: snap.forecast,
      scenario: snap.scenario,
    };
  };

  const configureScenario = (input: ScenarioInput = {}) => {
    const snap = controller.getSnapshot();
    const { scenario, errors } = buildScenario(input, snap.scenario);
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    controller.setScenario(scenario);
    const evaluated = evaluateScenario({ base: scenario }, { includeScenario: false, includeSensitivity: false });
    return evaluated.ok
      ? { ok: true, summary: evaluated.summary, results: evaluated.results, forecast: evaluated.forecast }
      : evaluated;
  };

  const calculateWhatIf = (input: ScenarioInput = {}) => {
    const snap = controller.getSnapshot();
    return evaluateScenario(input, {
      current: snap.scenario,
      includeScenario: false,
      includeSensitivity: true,
    });
  };

  const navigate = (page?: string, advanced?: boolean) => {
    if (page !== undefined) {
      if (!WORKSPACE_PAGES.includes(page as (typeof WORKSPACE_PAGES)[number])) {
        return {
          ok: false,
          errors: [`Unknown page "${page}". Valid pages: ${WORKSPACE_PAGES.join(', ')}`],
        };
      }
      controller.setPage(page);
    }
    if (advanced !== undefined) {
      controller.setAdvanced(Boolean(advanced));
    }
    const snap = controller.getSnapshot();
    return { ok: true, page: page ?? snap.page, advanced: advanced ?? snap.advanced };
  };

  const saveCurrent = () => {
    controller.saveCurrent();
    return { ok: true, savedCount: controller.getSnapshot().savedNames.length + 1 };
  };

  const reset = () => {
    controller.reset();
    return { ok: true };
  };

  window.__aitco = {
    getState,
    listPresets: getPresetsCatalog,
    configureScenario,
    calculateWhatIf,
    compareScenarios,
    navigate,
    saveCurrent,
    reset,
  };

  const ac = new AbortController();
  const docMc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  const navMc = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext;
  const mc = docMc ?? navMc;

  if (typeof mc?.registerTool === 'function') {
    const tools: ModelContextTool[] = [
      {
        name: 'get_calculator_state',
        description: 'Read the active Intelligence Economics scenario, summary metrics, TCO breakdown, and 5-year forecast.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: () => getState(),
      },
      {
        name: 'list_presets',
        description: 'List valid enterprise sizes, industries, maturity levels (0-4), supply strategies, and provider pricing catalogues (AWS Bedrock, OpenRouter, OpenAI).',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: () => getPresetsCatalog(),
      },
      {
        name: 'configure_scenario',
        description: 'Update the live calculator scenario in the browser UI (enterprise preset, industry, maturity 0-4, supply strategy, pricePreset, globalPriceAdjustment, or domainOverrides).',
        inputSchema: {
          type: 'object',
          properties: {
            preset: { type: 'string', enum: getPresetsCatalog().enterprisePresets },
            industry: { type: 'string', enum: getPresetsCatalog().industries },
            maturity: { type: 'integer', minimum: 0, maximum: 4 },
            strategy: { type: 'string', enum: getPresetsCatalog().supplyStrategies },
            pricePreset: { type: 'string', enum: getPresetsCatalog().pricePresets },
            forecastPreset: { type: 'string', enum: getPresetsCatalog().forecastPresets },
            globalPriceAdjustment: { type: 'number' },
            enableSelfHosted: { type: 'boolean' },
            enableStudentModels: { type: 'boolean' },
            domainOverrides: { type: 'object' },
          },
        },
        annotations: { readOnlyHint: false },
        execute: (input) => configureScenario(input as ScenarioInput),
      },
      {
        name: 'calculate_what_if',
        description: 'Evaluate a what-if scenario without mutating the active browser UI state.',
        inputSchema: {
          type: 'object',
          properties: {
            preset: { type: 'string' },
            industry: { type: 'string' },
            maturity: { type: 'integer', minimum: 0, maximum: 4 },
            strategy: { type: 'string' },
            pricePreset: { type: 'string' },
            forecastPreset: { type: 'string' },
            globalPriceAdjustment: { type: 'number' },
            enableSelfHosted: { type: 'boolean' },
            enableStudentModels: { type: 'boolean' },
            domainOverrides: { type: 'object' },
          },
        },
        annotations: { readOnlyHint: true },
        execute: (input) => calculateWhatIf(input as ScenarioInput),
      },
      {
        name: 'compare_scenarios',
        description: 'Compare multiple scenarios side-by-side, or run the default strategy & provider comparison if scenarios is omitted.',
        inputSchema: {
          type: 'object',
          properties: {
            scenarios: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        annotations: { readOnlyHint: true },
        execute: (input) =>
          compareScenarios(input.scenarios as Array<{ label?: string } & ScenarioInput> | undefined),
      },
      {
        name: 'navigate_view',
        description: 'Switch the visible workspace page or toggle Advanced modelling mode.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'string', enum: [...WORKSPACE_PAGES] },
            advanced: { type: 'boolean' },
          },
        },
        annotations: { readOnlyHint: false },
        execute: (input) =>
          navigate(
            typeof input.page === 'string' ? input.page : undefined,
            typeof input.advanced === 'boolean' ? input.advanced : undefined
          ),
      },
    ];

    for (const tool of tools) {
      try {
        mc.registerTool(tool, { signal: ac.signal });
      } catch {
        // Ignore registration errors if a partial browser polyfill is present
      }
    }
  }

  return () => {
    ac.abort();
    delete window.__aitco;
  };
}

import type { Scenario, Enterprise, Domain, DomainKey, Complexity, Routing, Forecast } from '../engine/types';

export const profiles: Record<string, Enterprise> = {
  Medium: {
    employees: 3000,
    engineers: 300,
    ops: 100,
    applications: 200,
    repos: 500,
    services: 300,
    pipelines: 500,
    cloudAccounts: 50,
    tickets: 5000,
    budget: 50000000,
  },
  Large: {
    employees: 20000,
    engineers: 2000,
    ops: 600,
    applications: 1000,
    repos: 5000,
    services: 2000,
    pipelines: 5000,
    cloudAccounts: 250,
    tickets: 50000,
    budget: 500000000,
  },
  Global: {
    employees: 100000,
    engineers: 10000,
    ops: 3000,
    applications: 5000,
    repos: 25000,
    services: 10000,
    pipelines: 25000,
    cloudAccounts: 1000,
    tickets: 200000,
    budget: 2000000000,
  },
};

export const industries: Record<string, Partial<Record<DomainKey, number>>> = {
  'General enterprise': {},
  'Banking and financial services': { security: 1.5, integration: 1.3, service: 1.2 },
  'Technology and SaaS': { engineering: 1.4, delivery: 1.5, infrastructure: 1.4 },
  'Retail and e-commerce': { business: 1.5, integration: 1.4 },
  Telecommunications: { infrastructure: 1.5, service: 1.4 },
  'Government and regulated enterprises': { security: 1.4, service: 1.3, data: 1.2 },
};

export const MATURITY_LEVELS = [
  'L0 Traditional IT',
  'L1 AI assistant',
  'L2 Integrated agents',
  'L3 Autonomous operations',
  'L4 Agent-centric',
] as const;

export const SUPPLY_STRATEGIES = [
  'Frontier only',
  'Tiered routing',
  'Hybrid cloud & self-hosted',
  'Enterprise student models',
] as const;

const labels: Record<DomainKey, string> = {
  engineering: 'Software engineering',
  delivery: 'CI/CD & delivery',
  infrastructure: 'Cloud & infrastructure',
  security: 'Security operations',
  integration: 'System integration',
  service: 'IT service management',
  data: 'Data & analytics',
  business: 'Business operations',
};

export const domainKeys = Object.keys(labels) as DomainKey[];
export const baseRouting: Routing = { frontier: 0.2, mid: 0.5, light: 0.3, self: 0 };

export function suggestedDomains(e: Enterprise, industry = 'General enterprise'): Domain[] {
  const volumes: Record<DomainKey, number> = {
    engineering: e.engineers * 22 * 2,
    delivery: e.pipelines * 20,
    infrastructure: e.services * 12,
    security: e.applications * 5,
    integration: e.applications * 200,
    service: e.tickets,
    data: e.applications * 15,
    business: e.employees * 4,
  };
  const eligible: Record<DomainKey, number> = {
    engineering: 0.75,
    delivery: 0.25,
    infrastructure: 0.2,
    security: 0.8,
    integration: 0.08,
    service: 0.7,
    data: 0.5,
    business: 0.35,
  };
  const distributions: Record<DomainKey, [number, number, number]> = {
    engineering: [0.25, 0.5, 0.25],
    delivery: [0.55, 0.35, 0.1],
    infrastructure: [0.4, 0.4, 0.2],
    security: [0.3, 0.45, 0.25],
    integration: [0.65, 0.3, 0.05],
    service: [0.65, 0.3, 0.05],
    data: [0.4, 0.45, 0.15],
    business: [0.55, 0.35, 0.1],
  };
  const configs: Record<Complexity, [number, number, number, number]> = {
    simple: [1, 1, 2000, 300],
    medium: [3, 3, 8000, 1000],
    complex: [8, 6, 20000, 3000],
  };

  return domainKeys.map((key) => ({
    key,
    label: labels[key],
    volume: Math.round(volumes[key] * (industries[industry]?.[key] ?? 1)),
    eligibility: eligible[key],
    adoption: 0.25,
    proactiveMode: 'percent',
    proactive: 0,
    success: 0.85,
    intervention: 0.2,
    skillsMultiplier: 1,
    trigger: (['engineering', 'service', 'business', 'data'] as DomainKey[]).includes(key) ? 'human' : 'event',
    humanHours: key === 'engineering' ? 1 : key === 'business' ? 0.4 : 0.5,
    classes: Object.fromEntries(
      (['simple', 'medium', 'complex'] as Complexity[]).map((c, i) => [
        c,
        {
          share: distributions[key][i],
          skills: configs[c][0],
          calls: configs[c][1],
          input: configs[c][2],
          output: configs[c][3],
          routing: { ...baseRouting },
        },
      ])
    ) as Domain['classes'],
  }));
}

export const forecastPresets: Record<string, Forecast> = {
  Conservative: {
    declineInput: 0.08,
    declineOutput: 0.08,
    growth: 0.08,
    efficiency: 0.04,
    adoptionGrowth: 0.03,
    frontierShift: 0.02,
    midShift: 0.02,
    deterministicGrowth: 0.01,
    reuseGrowth: 0.01,
    floor: 0.35,
    elasticity: 0,
    mode: 'independent',
  },
  'Competitive market': {
    declineInput: 0.22,
    declineOutput: 0.18,
    growth: 0.18,
    efficiency: 0.1,
    adoptionGrowth: 0.07,
    frontierShift: 0.05,
    midShift: 0.04,
    deterministicGrowth: 0.02,
    reuseGrowth: 0.02,
    floor: 0.15,
    elasticity: 0.4,
    mode: 'independent',
  },
  'Rapid commoditisation': {
    declineInput: 0.4,
    declineOutput: 0.35,
    growth: 0.4,
    efficiency: 0.15,
    adoptionGrowth: 0.12,
    frontierShift: 0.08,
    midShift: 0.07,
    deterministicGrowth: 0.03,
    reuseGrowth: 0.03,
    floor: 0.05,
    elasticity: 1,
    mode: 'responsive',
  },
};

export function makeScenario(preset = 'Medium'): Scenario {
  const enterprise = { ...profiles[preset] };
  return {
    schemaVersion: 1,
    enableSelfHosted: false,
    enableStudentModels: false,
    globalPriceAdjustment: 1,
    name: `${preset} enterprise · Tiered`,
    preset,
    industry: 'General enterprise',
    maturity: 2,
    strategy: 'Tiered routing',
    enterprise,
    domains: suggestedDomains(enterprise),
    execution: {
      deterministic: 0.15,
      retry: 0.08,
      fanout: 0,
      escalation: 0,
      cache: 0.2,
      cacheWrite: 0,
      context: 0.15,
      reasoning: 0,
      reasoningIncluded: true,
      reuse: 0.1,
      optimisation: 0.1,
      runtimePerSkill: 0.0005,
    },
    prices: {
      frontier: {
        provider: 'Scenario assumption',
        id: 'Generic frontier',
        tier: 'frontier',
        input: 8,
        output: 40,
        cached: 4,
        cacheWrite: 0,
        region: 'Global (illustrative)',
        date: 'Not applicable',
        source: '',
        status: 'illustrative',
      },
      mid: {
        provider: 'Scenario assumption',
        id: 'Generic mid-tier',
        tier: 'mid',
        input: 1,
        output: 5,
        cached: 0.5,
        cacheWrite: 0,
        region: 'Global (illustrative)',
        date: 'Not applicable',
        source: '',
        status: 'illustrative',
      },
      light: {
        provider: 'Scenario assumption',
        id: 'Generic lightweight',
        tier: 'light',
        input: 0.1,
        output: 0.5,
        cached: 0.05,
        cacheWrite: 0,
        region: 'Global (illustrative)',
        date: 'Not applicable',
        source: '',
        status: 'illustrative',
      },
      self: {
        provider: 'User capacity model',
        id: 'Self-hosted open weight',
        tier: 'self',
        input: 0,
        output: 0,
        cached: 0,
        cacheWrite: 0,
        region: 'User-defined',
        date: 'Not applicable',
        source: '',
        status: 'illustrative',
      },
    },
    hosting: {
      gpuHourly: 3,
      gpus: 4,
      utilisation: 0.55,
      inputThroughput: 3000,
      outputThroughput: 250,
      peak: 1.5,
      ha: 1.25,
      overhead: 0.2,
      maintenance: 5000,
      support: 10000,
    },
    distillation: {
      examples: 20000,
      tokensPerExample: 1500,
      teacherPerMillion: 10,
      epochs: 3,
      training: 12000,
      preparation: 15000,
      evaluation: 8000,
      retrainMonths: 6,
      maintenance: 3000,
    },
    costs: {
      sandboxPerSkill: 0.001,
      retrievalPerTask: 0.002,
      integrationMonthly: 10000,
      observabilityMonthly: 3500,
      governanceMonthly: 5000,
      evaluationMonthly: 3500,
      engineeringMonthly: 18000,
      oversightHourly: 65,
      recoveryPerFailure: 0.2,
      migration: 100000,
      runtimeMonthly: 5000,
      platformGrowth: 0.15,
    },
    value: {
      hourly: 75,
      reviewMinutes: 3,
      realisation: 0.5,
      licensingMonthly: 0,
      externalMonthly: 0,
      operationsMonthly: 0,
      cashConversion: 0,
    },
    forecast: { ...forecastPresets['Competitive market'] },
  };
}

export function applyMaturity(s: Scenario, level: number): Scenario {
  const adoption = [0, 0.12, 0.3, 0.55, 0.8][level];
  const proactive = [0, 0, 0.02, 0.1, 0.25][level];
  return {
    ...s,
    maturity: level,
    domains: s.domains.map((d) => ({ ...d, adoption, proactive })),
    execution: { ...s.execution, deterministic: [0, 0.05, 0.15, 0.25, 0.4][level] },
  };
}

export function applySupplyStrategy(s: Scenario, strategy: string): Scenario {
  const next = structuredClone(s);
  next.strategy = strategy;
  const routing: Routing =
    strategy === 'Frontier only'
      ? { frontier: 1, mid: 0, light: 0, self: 0 }
      : strategy === 'Hybrid cloud & self-hosted'
        ? { frontier: 0.1, mid: 0.3, light: 0.3, self: 0.3 }
        : strategy === 'Enterprise student models'
          ? { frontier: 0.05, mid: 0.2, light: 0.25, self: 0.5 }
          : { frontier: 0.2, mid: 0.5, light: 0.3, self: 0 };

  next.domains.forEach((d) => {
    Object.values(d.classes).forEach((c) => {
      c.routing = { ...routing };
    });
  });

  if (strategy === 'Hybrid cloud & self-hosted') next.enableSelfHosted = true;
  if (strategy === 'Enterprise student models') next.enableStudentModels = true;
  return next;
}

export function builtIns(): Scenario[] {
  const base = makeScenario();
  return [
    'Frontier-only enterprise',
    'Tiered model routing',
    'Optimised agent architecture',
    'Hybrid intelligence supply',
  ].map((name, i) => {
    const s = structuredClone(base);
    s.name = name;
    s.strategy = name;
    if (i === 0) {
      s.domains.forEach((d) =>
        Object.values(d.classes).forEach((c) => (c.routing = { frontier: 1, mid: 0, light: 0, self: 0 }))
      );
    }
    if (i === 2) {
      s.execution.deterministic = 0.4;
      s.execution.cache = 0.5;
      s.execution.optimisation = 0.25;
      s.execution.reuse = 0.25;
    }
    if (i === 3) {
      s.domains.forEach((d) =>
        Object.values(d.classes).forEach((c) => (c.routing = { frontier: 0.1, mid: 0.3, light: 0.3, self: 0.3 }))
      );
      s.enableSelfHosted = true;
    }
    return s;
  });
}

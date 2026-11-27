export type Tier = 'frontier' | 'mid' | 'light' | 'self';
export type Complexity = 'simple' | 'medium' | 'complex';
export type DomainKey =
  | 'engineering'
  | 'delivery'
  | 'infrastructure'
  | 'security'
  | 'integration'
  | 'service'
  | 'data'
  | 'business';

export type Routing = Record<Tier, number>;

export interface ClassConfig {
  share: number;
  skills: number;
  calls: number;
  input: number;
  output: number;
  routing: Routing;
}

export interface Domain {
  key: DomainKey;
  label: string;
  volume: number;
  eligibility: number;
  adoption: number;
  proactiveMode: 'percent' | 'absolute';
  proactive: number;
  success: number;
  intervention: number;
  skillsMultiplier: number;
  trigger: 'human' | 'event';
  classes: Record<Complexity, ClassConfig>;
  humanHours: number;
}

export interface Enterprise {
  employees: number;
  engineers: number;
  ops: number;
  applications: number;
  repos: number;
  services: number;
  pipelines: number;
  cloudAccounts: number;
  tickets: number;
  budget: number;
}

export interface Price {
  provider: string;
  id: string;
  tier: Tier;
  input: number;
  output: number;
  cached: number;
  cacheWrite: number;
  region: string;
  date: string;
  source: string;
  status: 'illustrative' | 'verified';
}

export interface Execution {
  deterministic: number;
  retry: number;
  fanout: number;
  escalation: number;
  cache: number;
  cacheWrite: number;
  context: number;
  reasoning: number;
  reasoningIncluded: boolean;
  reuse: number;
  optimisation: number;
  runtimePerSkill: number;
}

export interface Hosting {
  gpuHourly: number;
  gpus: number;
  utilisation: number;
  inputThroughput: number;
  outputThroughput: number;
  peak: number;
  ha: number;
  overhead: number;
  maintenance: number;
  support: number;
}

export interface Distillation {
  examples: number;
  tokensPerExample: number;
  teacherPerMillion: number;
  epochs: number;
  training: number;
  preparation: number;
  evaluation: number;
  retrainMonths: number;
  maintenance: number;
}

export interface Costs {
  sandboxPerSkill: number;
  retrievalPerTask: number;
  integrationMonthly: number;
  observabilityMonthly: number;
  governanceMonthly: number;
  evaluationMonthly: number;
  engineeringMonthly: number;
  oversightHourly: number;
  recoveryPerFailure: number;
  migration: number;
  runtimeMonthly: number;
  platformGrowth: number;
}

export interface Value {
  hourly: number;
  reviewMinutes: number;
  realisation: number;
  licensingMonthly: number;
  externalMonthly: number;
  operationsMonthly: number;
  cashConversion: number;
}

export interface Forecast {
  declineInput: number;
  declineOutput: number;
  growth: number;
  efficiency: number;
  adoptionGrowth: number;
  frontierShift: number;
  midShift: number;
  deterministicGrowth: number;
  reuseGrowth: number;
  floor: number;
  elasticity: number;
  mode: 'independent' | 'responsive';
}

export interface Scenario {
  schemaVersion: 1;
  enableSelfHosted: boolean;
  enableStudentModels: boolean;
  globalPriceAdjustment: number;
  name: string;
  preset: string;
  industry: string;
  maturity: number;
  strategy: string;
  enterprise: Enterprise;
  domains: Domain[];
  execution: Execution;
  prices: Record<Tier, Price>;
  hosting: Hosting;
  distillation: Distillation;
  costs: Costs;
  value: Value;
  forecast: Forecast;
}

export interface DomainResult {
  key: DomainKey;
  label: string;
  adopted: number;
  proactive: number;
  tasks: number;
  successes: number;
  skills: number;
  calls: number;
  input: number;
  output: number;
  inference: number;
  runtime: number;
  tierCosts: Record<Tier, number>;
  tierCalls: Record<Tier, number>;
  selfTokens: number;
  productivity: number;
  reviewHours: number;
  failures: number;
}

export interface Results {
  domains: DomainResult[];
  tasks: number;
  successes: number;
  skills: number;
  calls: number;
  input: number;
  output: number;
  selfInput: number;
  selfOutput: number;
  inference: number;
  tierCosts: Record<Tier, number>;
  tierCalls: Record<Tier, number>;
  monthlyTco: number;
  annualTco: number;
  firstYearTco: number;
  recurring: Record<string, number>;
  productivity: number;
  cashSavings: number;
  netAnnual: number;
  perAttempt: number | null;
  perSuccess: number | null;
  perSkill: number | null;
  paybackMonths: number | null;
}

export interface ForecastPoint {
  year: number;
  priceIndex: number;
  tasks: number;
  inference: number;
  annualTco: number;
  perSuccess: number | null;
  cumulative: number;
  frontierShare: number;
  midShare: number;
  lightShare: number;
  selfShare: number;
}

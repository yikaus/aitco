import type { Scenario, Results, Tier, DomainResult, ForecastPoint, Routing } from './types';

const TIERS: Tier[] = ['frontier', 'mid', 'light', 'self'];
const zeroTiers = (): Record<Tier, number> => ({ frontier: 0, mid: 0, light: 0, self: 0 });
const isFiniteNonNegative = (n: number) => Number.isFinite(n) && n >= 0;
const isCloseToOne = (n: number) => Math.abs(n - 1) < 0.0001;

/**
 * Safely updates one tier's routing share and proportionally rebalances the remaining active tiers
 * so that all shares stay in [0, 1] and sum to 1.0.
 */
export function rebalanceRouting(
  current: Routing,
  tier: Tier,
  nextValue: number,
  includeSelf: boolean
): Routing {
  const activeTiers: Tier[] = includeSelf ? ['frontier', 'mid', 'light', 'self'] : ['frontier', 'mid', 'light'];
  const clamped = Math.max(0, Math.min(1, Number.isFinite(nextValue) ? nextValue : 0));
  const next: Routing = { ...current, [tier]: clamped };
  if (!includeSelf) next.self = 0;

  const others = activeTiers.filter((t) => t !== tier);
  const remainder = Math.max(0, 1 - clamped);
  const otherSum = others.reduce((sum, t) => sum + Math.max(0, current[t]), 0);

  if (otherSum > 0) {
    for (const t of others) {
      next[t] = (Math.max(0, current[t]) / otherSum) * remainder;
    }
  } else if (others.length > 0) {
    // Fallback when all other active tiers were 0: assign remainder to mid-tier (or first available)
    const fallback: Tier = others.includes('mid') ? 'mid' : others[0];
    for (const t of others) {
      next[t] = t === fallback ? remainder : 0;
    }
  }

  return next;
}

export function validate(s: Scenario): string[] {
  const errors: string[] = [];

  function walk(value: unknown, path: string) {
    if (typeof value === 'number' && !isFiniteNonNegative(value)) {
      errors.push(`${path} must be non-negative and finite`);
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => walk(v, `${path}.${k}`));
    }
  }
  walk(s, 'scenario');

  const ratio = (n: number, path: string) => {
    if (n < 0 || n > 1 || !Number.isFinite(n)) {
      errors.push(`${path} must be between 0 and 1`);
    }
  };

  if (!isFiniteNonNegative(s.globalPriceAdjustment) || s.globalPriceAdjustment <= 0) {
    errors.push('Global token price adjustment must be greater than zero');
  }

  s.domains.forEach((d) => {
    (['eligibility', 'adoption', 'success', 'intervention'] as const).forEach((k) =>
      ratio(d[k], `${d.key}.${k}`)
    );
    if (d.proactiveMode === 'percent') ratio(d.proactive, `${d.key}.proactive`);

    const shareTotal = Object.values(d.classes).reduce((a, c) => a + c.share, 0);
    if (!isCloseToOne(shareTotal)) {
      errors.push(`${d.key} complexity shares must total 100%`);
    }

    Object.entries(d.classes).forEach(([key, c]) => {
      ratio(c.share, `${d.key}.${key}.share`);
      const routingTotal = Object.values(c.routing).reduce((a, v) => a + v, 0);
      if (!isCloseToOne(routingTotal)) {
        errors.push(`${d.key}.${key} routing must total 100%`);
      }
      Object.entries(c.routing).forEach(([tier, r]) => ratio(r, `${d.key}.${key}.${tier}`));
    });
  });

  (['deterministic', 'cache', 'cacheWrite', 'reuse', 'optimisation'] as const).forEach((k) =>
    ratio(s.execution[k], `execution.${k}`)
  );
  if (s.execution.cacheWrite > s.execution.cache) {
    errors.push('Cache writes cannot exceed cached input share');
  }

  ratio(s.hosting.utilisation, 'hosting.utilisation');
  (['realisation', 'cashConversion'] as const).forEach((k) => ratio(s.value[k], `value.${k}`));
  (
    [
      'declineInput',
      'declineOutput',
      'efficiency',
      'floor',
      'frontierShift',
      'midShift',
      'deterministicGrowth',
      'reuseGrowth',
    ] as const
  ).forEach((k) => ratio(s.forecast[k], `forecast.${k}`));

  if (s.hosting.peak < 1 || s.hosting.ha < 1) {
    errors.push('Peak and HA multipliers must be at least 1');
  }

  return errors;
}

export function hostingEconomics(s: Scenario, input: number, output: number) {
  const h = s.hosting;
  const seconds = 730 * 3600;
  const capacityInput = h.gpus * h.utilisation * h.inputThroughput * seconds;
  const capacityOutput = h.gpus * h.utilisation * h.outputThroughput * seconds;

  // Serial time constraint: input and output share the same GPU capacity, not two independent pools.
  const gpuSeconds =
    (h.inputThroughput ? input / h.inputThroughput : input ? Infinity : 0) +
    (h.outputThroughput ? output / h.outputThroughput : output ? Infinity : 0);

  const required = Math.ceil((gpuSeconds * h.peak * h.ha) / (seconds * Math.max(h.utilisation, 1e-9)));
  const used = input + output > 0 ? Math.max(h.gpus, required) : 0;
  const monthly = used * (h.gpuHourly * 730 * (1 + h.overhead)) + (used ? h.maintenance + h.support : 0);
  const baseMonthly = h.gpus * h.gpuHourly * 730 * (1 + h.overhead) + h.maintenance + h.support;

  return {
    monthly,
    baseMonthly,
    capacityInput,
    capacityOutput,
    capacityUtilisation: h.gpus ? gpuSeconds / (h.gpus * h.utilisation * seconds) : 0,
    additionalGpus: Math.max(0, required - h.gpus),
    requiredGpus: required,
    costPerMillion: input + output ? (monthly / (input + output)) * 1e6 : null,
    breakEvenMillionTokens: baseMonthly / Math.max(0.000001, (s.prices.mid.input + s.prices.mid.output) / 2),
  };
}

export function distillationEconomics(s: Scenario, monthlyApiAlternative = 0) {
  const d = s.distillation;
  const teacher = ((d.examples * d.tokensPerExample) / 1e6) * d.teacherPerMillion;
  const initial = teacher + d.training * d.epochs + d.preparation + d.evaluation;
  const recurring = d.maintenance + (d.retrainMonths ? initial / d.retrainMonths : 0);
  const savings = monthlyApiAlternative - recurring;

  return {
    teacher,
    initial,
    recurring,
    amortisedMonthly: initial / 36 + recurring,
    paybackMonths: savings > 0 ? initial / savings : null,
  };
}

function shifted(r: Routing, t: number, f: { frontierShift: number; midShift: number }): Routing {
  const frontier = r.frontier * Math.pow(1 - f.frontierShift, t);
  const mid = r.mid + (r.frontier - frontier);
  const moved = mid * (1 - Math.pow(1 - f.midShift, t));
  return { frontier, mid: mid - moved, light: r.light + moved, self: r.self };
}

export function calculate(s: Scenario, year = 0): Results {
  const f = s.forecast;
  const inputIndex = Math.max(f.floor, Math.pow(1 - f.declineInput, year));
  const outputIndex = Math.max(f.floor, Math.pow(1 - f.declineOutput, year));
  const priceIndex = (inputIndex + outputIndex) / 2;
  const demand =
    Math.pow(1 + f.growth, year) *
    Math.pow(1 + f.adoptionGrowth, year) *
    (f.mode === 'responsive' ? Math.pow(1 / priceIndex, f.elasticity) : 1);

  const ex = s.execution;
  const deterministic = Math.min(1, ex.deterministic + f.deterministicGrowth * year);
  const reuse = Math.min(1, ex.reuse + f.reuseGrowth * year);

  const tierCosts = zeroTiers();
  const tierCalls = zeroTiers();
  let selfInput = 0;
  let selfOutput = 0;

  const domains: DomainResult[] = s.domains.map((d) => {
    const adopted = d.volume * d.eligibility * d.adoption * demand;
    const proactive = (d.proactiveMode === 'percent' ? d.volume * d.proactive : d.proactive) * demand;
    const tasks = adopted + proactive;
    const successes = tasks * d.success;

    let skills = 0;
    let calls = 0;
    let input = 0;
    let output = 0;
    let inference = 0;
    let runtime = 0;
    let domainSelfTokens = 0;
    const dc = zeroTiers();
    const dt = zeroTiers();

    for (const c of Object.values(d.classes)) {
      const classTasks = tasks * c.share;
      const classSkills = classTasks * c.skills * d.skillsMultiplier * (1 - reuse);
      skills += classSkills;

      const reasoning = classSkills * (1 - deterministic);
      const classCalls = reasoning * c.calls * (1 + ex.retry) * (1 + ex.fanout) * (1 + ex.escalation);
      calls += classCalls;

      const inTokens =
        classCalls * c.input * (1 + ex.context) * (1 - ex.optimisation) * Math.pow(1 - f.efficiency, year);
      const outTokens =
        classCalls * (c.output + (ex.reasoningIncluded ? 0 : ex.reasoning)) * Math.pow(1 - f.efficiency, year);

      input += inTokens;
      output += outTokens;
      runtime += classSkills * ex.runtimePerSkill;

      const projectedRouting = year ? shifted(c.routing, year, f) : c.routing;
      const routing: Routing = s.enableSelfHosted
        ? projectedRouting
        : { ...projectedRouting, mid: projectedRouting.mid + projectedRouting.self, self: 0 };

      for (const tier of TIERS) {
        const share = routing[tier];
        const ti = inTokens * share;
        const to = outTokens * share;
        dt[tier] += classCalls * share;
        tierCalls[tier] += classCalls * share;

        if (tier === 'self' && s.enableSelfHosted) {
          selfInput += ti;
          selfOutput += to;
          domainSelfTokens += ti + to;
          continue;
        }
        if (tier === 'self') continue;

        const p = s.prices[tier];
        const multiplier = s.globalPriceAdjustment;
        const cost =
          ((ti * (1 - ex.cache) * p.input +
            ti * (ex.cache - ex.cacheWrite) * p.cached +
            ti * ex.cacheWrite * p.cacheWrite) *
            multiplier *
            inputIndex) /
            1e6 +
          (to * p.output * multiplier * outputIndex) / 1e6;

        dc[tier] += cost;
        tierCosts[tier] += cost;
        inference += cost;
      }
    }

    return {
      key: d.key,
      label: d.label,
      adopted,
      proactive,
      tasks,
      successes,
      skills,
      calls,
      input,
      output,
      inference,
      runtime,
      tierCosts: dc,
      tierCalls: dt,
      selfTokens: domainSelfTokens,
      productivity: adopted * d.success * d.humanHours * s.value.hourly * s.value.realisation,
      reviewHours: (tasks * d.intervention * s.value.reviewMinutes) / 60,
      failures: tasks - successes,
    };
  });

  const hosting = s.enableSelfHosted ? hostingEconomics(s, selfInput, selfOutput) : { monthly: 0 };
  tierCosts.self = hosting.monthly;
  const selfTokens = selfInput + selfOutput;

  for (const d of domains) {
    const portion = selfTokens ? d.selfTokens / selfTokens : 0;
    d.tierCosts.self = hosting.monthly * portion;
    d.inference += d.tierCosts.self;
  }

  const sum = (key: keyof DomainResult) => domains.reduce((a, d) => a + (d[key] as number), 0);
  const tasks = sum('tasks');
  const successes = sum('successes');
  const skills = sum('skills');
  const calls = sum('calls');
  const input = sum('input');
  const output = sum('output');
  const inference = Object.values(tierCosts).reduce((a, b) => a + b, 0);

  const c = s.costs;
  const v = s.value;
  const platformScale = 1 + c.platformGrowth * year;

  const recurring: Record<string, number> = {
    'Model API inference': inference - tierCosts.self,
    'Self-hosted inference': s.enableSelfHosted ? tierCosts.self : 0,
    'Model training and distillation': s.enableStudentModels ? distillationEconomics(s).recurring : 0,
    'Agent runtime and orchestration': c.runtimeMonthly * platformScale + sum('runtime'),
    'Sandbox execution': skills * c.sandboxPerSkill,
    'Knowledge and retrieval': tasks * c.retrievalPerTask,
    'Capability integration': c.integrationMonthly * platformScale,
    'Observability and tracing': c.observabilityMonthly * platformScale + calls * 0.00001,
    'Security, governance and audit': c.governanceMonthly * platformScale,
    'Evaluation and regression testing': c.evaluationMonthly * platformScale,
    'Platform engineering': c.engineeringMonthly * platformScale,
    'Human oversight': sum('reviewHours') * c.oversightHourly,
    'Failure recovery and rework': sum('failures') * c.recoveryPerFailure,
  };

  const monthlyTco = Object.values(recurring).reduce((a, b) => a + b, 0);
  const annualTco = monthlyTco * 12;
  const productivity = sum('productivity');
  const cashSavings =
    productivity * v.cashConversion + v.licensingMonthly + v.externalMonthly + v.operationsMonthly;
  const netAnnual = (productivity + v.licensingMonthly + v.externalMonthly + v.operationsMonthly - monthlyTco) * 12;
  const monthlyCashNet = cashSavings - monthlyTco;

  return {
    domains,
    tasks,
    successes,
    skills,
    calls,
    input,
    output,
    selfInput,
    selfOutput,
    inference,
    tierCosts,
    tierCalls,
    monthlyTco,
    annualTco,
    firstYearTco: annualTco + c.migration,
    recurring,
    productivity,
    cashSavings,
    netAnnual,
    perAttempt: tasks ? monthlyTco / tasks : null,
    perSuccess: successes ? monthlyTco / successes : null,
    perSkill: skills ? monthlyTco / skills : null,
    paybackMonths: monthlyCashNet > 0 ? c.migration / monthlyCashNet : null,
  };
}

export function forecast(s: Scenario): ForecastPoint[] {
  let cumulative = s.costs.migration;
  return Array.from({ length: 6 }, (_, year) => {
    const r = calculate(s, year);
    const priceIndex =
      (Math.max(s.forecast.floor, Math.pow(1 - s.forecast.declineInput, year)) +
        Math.max(s.forecast.floor, Math.pow(1 - s.forecast.declineOutput, year))) /
      2;
    if (year > 0) cumulative += r.annualTco;
    const total = r.calls || 1;
    return {
      year,
      priceIndex,
      tasks: r.tasks,
      inference: r.inference * 12,
      annualTco: r.annualTco,
      perSuccess: r.perSuccess,
      cumulative: year ? cumulative : r.firstYearTco,
      frontierShare: r.tierCalls.frontier / total,
      midShare: r.tierCalls.mid / total,
      lightShare: r.tierCalls.light / total,
      selfShare: r.tierCalls.self / total,
    };
  });
}

export function sensitivity(s: Scenario) {
  const variants: [string, (x: Scenario) => void][] = [
    [
      'Model prices',
      (x) => {
        x.globalPriceAdjustment *= 1.2;
      },
    ],
    ['Agent adoption', (x) => x.domains.forEach((d) => (d.adoption = Math.min(1, d.adoption * 1.2)))],
    ['Workload growth', (x) => (x.forecast.growth *= 1.2)],
    ['Context size', (x) => (x.execution.context += 0.2)],
    [
      'Calls per skill',
      (x) => x.domains.forEach((d) => Object.values(d.classes).forEach((c) => (c.calls *= 1.2))),
    ],
    [
      'Frontier dependency',
      (x) =>
        x.domains.forEach((d) =>
          Object.values(d.classes).forEach((c) => {
            const transfer = Math.min(0.2, c.routing.mid);
            c.routing.mid -= transfer;
            c.routing.frontier += transfer;
          })
        ),
    ],
    ['Execution success', (x) => x.domains.forEach((d) => (d.success = Math.min(1, d.success * 1.2)))],
  ];

  const baseline = calculate(s);
  return variants.map(([label, fn]) => {
    const x = structuredClone(s);
    fn(x);
    return {
      label,
      tco:
        label === 'Workload growth'
          ? calculate(x, 1).annualTco - calculate(s, 1).annualTco
          : calculate(x).annualTco - baseline.annualTco,
      perSuccess: calculate(x).perSuccess,
    };
  });
}

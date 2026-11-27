import type { Scenario, Results, Domain, Complexity, Tier } from '../engine/types';
import { SUPPLY_STRATEGIES, PRICE_PRESETS, pricePresets } from '../data/presets';
import { hostingEconomics, distillationEconomics, rebalanceRouting } from '../engine/calculate';
import {
  Heading,
  Panel,
  NumberField as N,
  Details,
  AdvancedBanner,
  money,
  num,
  pct,
} from '../components/Fields';

interface SupplyPageProps {
  s: Scenario;
  r: Results;
  advanced: boolean;
  onEnableAdvanced: () => void;
  onStrategy: (strategy: string) => void;
  onPricePreset: (preset: string) => void;
  onUpdate: (fn: (v: Scenario) => void) => void;
  onSetDomain: (index: number, fn: (d: Domain) => void) => void;
}

const QUICK_EXECUTION_FIELDS = [
  ['deterministic', 'Deterministic skill ratio', 'No LLM charge; skill runtime still applies'],
  ['cache', 'Cached input share', 'Fraction of input tokens served from cache'],
  ['retry', 'Retry overhead', 'Additional calls beyond class defaults'],
] as const;

const ADVANCED_EXECUTION_FIELDS = [
  ['fanout', 'Subagent fan-out', 'Additional calls beyond class defaults'],
  ['escalation', 'Model escalation overhead', 'Additional calls beyond class defaults, priced using the same routing mix'],
  ['cacheWrite', 'Cache write share', 'Subset of cached input tokens charged at cache-write price'],
  ['context', 'Tool/context overhead', 'Extra input tokens per call'],
  ['reuse', 'Skill reuse', 'Reduces skill invocations and downstream calls'],
  ['optimisation', 'Context optimisation', 'Reduces input tokens after overhead'],
] as const;

export default function SupplyPage({
  s,
  r,
  advanced,
  onEnableAdvanced,
  onStrategy,
  onPricePreset,
  onUpdate,
  onSetDomain,
}: SupplyPageProps) {
  const h = s.enableSelfHosted ? hostingEconomics(s, r.selfInput, r.selfOutput) : null;
  const d = s.enableStudentModels ? distillationEconomics(s, r.inference) : null;

  return (
    <>
      <Heading
        title="Supply & execution"
        subtitle="Choose how your enterprise sources model intelligence, tune token prices, and control agent execution efficiency."
      />

      <Panel title="Supply strategy">
        <div className="maturity">
          {SUPPLY_STRATEGIES.map((x) => (
            <button
              type="button"
              key={x}
              className={`choice ${s.strategy === x ? 'selected' : ''}`}
              onClick={() => onStrategy(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <p className="muted">
          Switching strategies resets class routing; manual allocations below override it. Self-hosting and student
          models are independent options below.
        </p>
      </Panel>

      <Panel
        title="Global Token Price Adjustment"
        subtitle="A single scenario-level factor applied to all commercial model prices. Private GPU capacity costs are not affected."
      >
        <div className="price-adjust">
          <div className="price-adjust-copy">
            <strong>{s.globalPriceAdjustment.toFixed(2)}×</strong>
            <span>
              {s.globalPriceAdjustment < 1
                ? 'Lower token prices'
                : s.globalPriceAdjustment > 1
                  ? 'Higher token prices'
                  : 'Baseline token prices'}
            </span>
          </div>
          <input
            aria-label="Global Token Price Adjustment"
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={s.globalPriceAdjustment}
            onChange={(e) =>
              onUpdate((v) => {
                v.globalPriceAdjustment = Number(e.target.value);
              })
            }
          />
          <div className="range-ends">
            <span>0.1× · 90% lower</span>
            <span>3.0× · 200% higher</span>
          </div>
          <div className="maturity" style={{ marginTop: 12 }}>
            {(
              [
                ['Batch API (0.50×)', 0.5],
                ['Baseline (1.00×)', 1],
                ['OpenRouter fee (1.05×)', 1.05],
                ['AWS regional (1.10×)', 1.1],
              ] as const
            ).map(([label, val]) => (
              <button
                type="button"
                key={label}
                className={`choice ${Math.abs(s.globalPriceAdjustment - val) < 0.001 ? 'selected' : ''}`}
                onClick={() =>
                  onUpdate((v) => {
                    v.globalPriceAdjustment = val;
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p>
            Adjusts input, output, cached-input and cache-write prices equally, preserving relative tier premiums.
            Use it to test enterprise discounts or price-change scenarios.
          </p>
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Optional: self-hosted inference">
          <p className="muted">
            Use private GPU capacity when deployment control, data boundaries or sustained volume make it relevant.
          </p>
          <label className="optional-check">
            <input
              type="checkbox"
              checked={s.enableSelfHosted}
              onChange={(e) =>
                onUpdate((v) => {
                  v.enableSelfHosted = e.target.checked;
                })
              }
            />
            <span>
              <strong>Enable self-hosted inference</strong>
              <small>Independent from training or distillation.</small>
            </span>
          </label>
          {!s.enableSelfHosted && (
            <p className="optional-note">
              Off by default. Saved self-hosted allocations are temporarily routed through mid-tier commercial
              pricing; your configuration is preserved.
            </p>
          )}
        </Panel>

        <Panel title="Optional: student models">
          <p className="muted">Estimate fine-tuning or distillation costs for specialised workloads.</p>
          <label className="optional-check">
            <input
              type="checkbox"
              checked={s.enableStudentModels}
              onChange={(e) =>
                onUpdate((v) => {
                  v.enableStudentModels = e.target.checked;
                })
              }
            />
            <span>
              <strong>Enable enterprise student models / distillation</strong>
              <small>Does not require self-hosted inference.</small>
            </span>
          </label>
          {!s.enableStudentModels && (
            <p className="optional-note">
              Off by default. No training, evaluation or maintenance costs are included while disabled.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Execution pipeline & efficiency"
        subtitle="Workload → agent task → skill invocation → reasoning call → billable tokens."
      >
        <div className="ledger">
          {[
            ['Enterprise workloads', s.domains.reduce((a, dom) => a + dom.volume, 0)],
            ['Agent tasks', r.tasks],
            ['Skill invocations', r.skills],
            ['LLM calls', r.calls],
            ['Billable input tokens', r.input],
            ['Billable output tokens', r.output],
          ].map(([label, val], i) => (
            <div key={String(label)} className="ledger-step">
              <span>0{i + 1}</span>
              <strong>{label}</strong>
              <b>{num(Number(val))}</b>
            </div>
          ))}
        </div>

        <h3>Execution efficiency levers</h3>
        <div className="field-grid">
          {QUICK_EXECUTION_FIELDS.map(([key, label, help]) => (
            <N
              key={key}
              label={label}
              value={s.execution[key]}
              percent
              help={help}
              onChange={(n) =>
                onUpdate((v) => {
                  v.execution[key] = n;
                })
              }
            />
          ))}
          {advanced &&
            ADVANCED_EXECUTION_FIELDS.map(([key, label, help]) => (
              <N
                key={key}
                label={label}
                value={s.execution[key]}
                percent
                help={help}
                onChange={(n) =>
                  onUpdate((v) => {
                    v.execution[key] = n;
                  })
                }
              />
            ))}
          {advanced && (
            <>
              <N
                label="Reasoning tokens / call"
                value={s.execution.reasoning}
                help="Only added when output tokens do not already include reasoning tokens."
                onChange={(n) =>
                  onUpdate((v) => {
                    v.execution.reasoning = n;
                  })
                }
              />
              <label className="field check">
                <input
                  type="checkbox"
                  checked={s.execution.reasoningIncluded}
                  onChange={(e) =>
                    onUpdate((v) => {
                      v.execution.reasoningIncluded = e.target.checked;
                    })
                  }
                />
                Reasoning included in output tokens
              </label>
              <N
                label="Runtime cost / skill (USD)"
                value={s.execution.runtimePerSkill}
                onChange={(n) =>
                  onUpdate((v) => {
                    v.execution.runtimePerSkill = n;
                  })
                }
              />
            </>
          )}
        </div>

        {!advanced && (
          <AdvancedBanner
            message="Fan-out, escalation, context overhead, reuse, optimisation and reasoning-token settings are hidden in Quick estimate."
            onEnable={onEnableAdvanced}
          />
        )}

        <Details>
          <p>
            Skills = tasks × class skills × domain multiplier × (1 − reuse). Reasoning skills = skills × (1 −
            deterministic ratio). Calls = reasoning skills × class calls × (1 + retry) × (1 + fan-out) × (1 +
            escalation). Deterministic skills incur runtime cost but no LLM inference.
          </p>
        </Details>
      </Panel>

      <Panel
        title="Model price catalogue"
        subtitle="Choose a reference provider catalogue (AWS Bedrock, OpenRouter, OpenAI) or generic baseline in USD per 1M tokens, or edit any cell."
      >
        <div className="maturity" style={{ marginBottom: 10 }}>
          {PRICE_PRESETS.map((name) => (
            <button
              type="button"
              key={name}
              className={`choice ${(s.pricePreset ?? 'Generic baseline') === name ? 'selected' : ''}`}
              onClick={() => onPricePreset(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
          {pricePresets[s.pricePreset ?? 'Generic baseline']?.description ?? 'Custom edited token rates.'}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tier / provenance</th>
                <th>Input</th>
                <th>Output</th>
                <th>Cached input</th>
                <th>Cache write</th>
              </tr>
            </thead>
            <tbody>
              {(['frontier', 'mid', 'light'] as Tier[]).map((t) => (
                <tr key={t}>
                  <td>
                    <strong>{s.prices[t].id}</strong>
                    <small>
                      {s.prices[t].provider} · {s.prices[t].status} · {s.prices[t].region} · {s.prices[t].date}
                    </small>
                  </td>
                  {(['input', 'output', 'cached', 'cacheWrite'] as const).map((k) => (
                    <td key={k}>
                      <N
                        label={k}
                        value={s.prices[t][k]}
                        onChange={(n) =>
                          onUpdate((v) => {
                            v.prices[t][k] = n;
                            v.pricePreset = 'Custom';
                          })
                        }
                      />
                      <small>{money(s.prices[t][k] * s.globalPriceAdjustment)} adjusted</small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Details title="Real-world billing notes (Bedrock, OpenRouter, caching)">
          <p>
            AWS Bedrock and Anthropic bill cache reads at 0.05×–0.10× (90–95% off) and cache writes at 1.25× (5-min
            TTL) or 2.0× (1-hr TTL) base input. OpenRouter adds a ~5% platform credit fee (1.05×); AWS Bedrock
            US-only regional inference adds 1.10×; async Batch APIs reduce rates by 50% (0.50×). Long-context calls
            (&gt;100K tokens) may cross higher pricing tiers not separately modeled here, and thinking/reasoning
            tokens are billed at output rates.
          </p>
        </Details>
      </Panel>

      <details className="advanced-supply" open={advanced}>
        <summary>Advanced modelling · routing by domain and complexity</summary>
        <Panel
          title="Per-domain model routing"
          subtitle="Each row automatically rebalances to 100% of reasoning calls. Inactive supply options remain saved but are excluded from calculations."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Domain / class</th>
                  <th>Frontier</th>
                  <th>Mid-tier</th>
                  <th>Lightweight</th>
                  {s.enableSelfHosted && <th>Self-hosted</th>}
                </tr>
              </thead>
              <tbody>
                {s.domains.flatMap((dom, i) =>
                  (['simple', 'medium', 'complex'] as Complexity[]).map((k) => (
                    <tr key={`${dom.key}-${k}`}>
                      <td>
                        {dom.label} <small>{k}</small>
                      </td>
                      {(['frontier', 'mid', 'light', ...(s.enableSelfHosted ? ['self'] : [])] as Tier[]).map(
                        (t) => (
                          <td key={t}>
                            <N
                              label={t}
                              value={dom.classes[k].routing[t]}
                              percent
                              onChange={(n) =>
                                onSetDomain(i, (x) => {
                                  x.classes[k].routing = rebalanceRouting(
                                    x.classes[k].routing,
                                    t,
                                    n,
                                    s.enableSelfHosted
                                  );
                                })
                              }
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </details>

      {s.enableSelfHosted && h && (
        <Panel
          title="Self-hosted inference capacity"
          subtitle="GPU throughput is assumed measured application throughput, not theoretical peak. Independent of student-model training."
        >
          <div className="field-grid">
            {(
              [
                ['gpuHourly', 'GPU USD / hour'],
                ['gpus', 'Provisioned GPUs'],
                ['utilisation', 'Effective utilisation'],
                ['inputThroughput', 'Input tokens / GPU second'],
                ['outputThroughput', 'Output tokens / GPU second'],
                ['peak', 'Peak multiplier'],
                ['ha', 'HA capacity multiplier'],
                ['overhead', 'Infrastructure overhead'],
                ['maintenance', 'Model maintenance / month'],
                ['support', 'Engineering & operations / month'],
              ] as const
            ).map(([k, label]) => (
              <N
                key={k}
                label={label}
                value={s.hosting[k]}
                percent={k === 'utilisation' || k === 'overhead'}
                onChange={(n) =>
                  onUpdate((v) => {
                    v.hosting[k] = n;
                  })
                }
              />
            ))}
          </div>
          <div className="mini-stats">
            <span>
              Monthly allocated GPU cost <b>{money(h.monthly)}</b>
            </span>
            <span>
              Additional GPUs <b>{num(h.additionalGpus)}</b>
            </span>
            <span>
              Capacity use <b>{pct(h.capacityUtilisation)}</b>
            </span>
            <span>
              Cost / 1M combined tokens <b>{h.costPerMillion === null ? 'N/A' : money(h.costPerMillion)}</b>
            </span>
            <span>
              API break-even volume* <b>{num(h.breakEvenMillionTokens)}M tokens</b>
            </span>
          </div>
          <Details>
            *Approximate monthly token volume at which base GPU capacity cost equals an illustrative blended
            mid-tier API unit price. Actual break-even depends on input/output mix, quality, latency, peak load and
            utilisation. Additional GPUs scale with demand; maintenance and support are charged once.
          </Details>
        </Panel>
      )}

      {s.enableStudentModels && d && (
        <Panel
          title="Student / distilled models"
          subtitle="Investment estimate only; model quality, latency and reliability must be evaluated separately."
        >
          <div className="field-grid">
            {(
              [
                ['examples', 'Training examples'],
                ['tokensPerExample', 'Tokens / example'],
                ['teacherPerMillion', 'Teacher generation USD / 1M'],
                ['epochs', 'Training epochs'],
                ['training', 'Training cost / epoch'],
                ['preparation', 'Preparation & validation'],
                ['evaluation', 'Evaluation & security'],
                ['retrainMonths', 'Retrain interval (months)'],
                ['maintenance', 'Maintenance / month'],
              ] as const
            ).map(([k, label]) => (
              <N
                key={k}
                label={label}
                value={s.distillation[k]}
                onChange={(n) =>
                  onUpdate((v) => {
                    v.distillation[k] = n;
                  })
                }
              />
            ))}
          </div>
          <div className="mini-stats">
            <span>
              Initial investment <b>{money(d.initial)}</b>
            </span>
            <span>
              Recurring / month <b>{money(d.recurring)}</b>
            </span>
            <span>
              36-month amortised / month <b>{money(d.amortisedMonthly)}</b>
            </span>
            <span>
              Illustrative payback*{' '}
              <b>{d.paybackMonths === null ? 'N/A' : `${num(d.paybackMonths)} months`}</b>
            </span>
          </div>
          <Details>
            *Payback compares the entire current inference bill with training recurring cost; only meaningful if
            the student model can actually replace all those calls at adequate quality and capacity. This is an
            upper-bound screening estimate, not a procurement case.
          </Details>
        </Panel>
      )}
    </>
  );
}

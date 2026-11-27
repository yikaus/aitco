import type { Scenario, Results } from '../engine/types';
import {
  Heading,
  Panel,
  Metric,
  NumberField as N,
  Details,
  AdvancedBanner,
  Download as Export,
  csv,
  money,
  num,
  pct,
} from '../components/Fields';

interface TcoPageProps {
  s: Scenario;
  r: Results;
  advanced: boolean;
  onEnableAdvanced: () => void;
  onUpdate: (fn: (v: Scenario) => void) => void;
}

const USAGE_CATEGORIES = [
  'Agent runtime and orchestration',
  'Sandbox execution',
  'Knowledge and retrieval',
  'Human oversight',
  'Failure recovery and rework',
];

export default function TcoPage({ s, r, advanced, onEnableAdvanced, onUpdate }: TcoPageProps) {
  const inferenceCost = r.recurring['Model API inference'] + r.recurring['Self-hosted inference'];
  const trainingCost = r.recurring['Model training and distillation'];
  const runtimeUsageCost =
    r.recurring['Agent runtime and orchestration'] +
    r.recurring['Sandbox execution'] +
    r.recurring['Knowledge and retrieval'];
  const platformFixedCost =
    r.recurring['Capability integration'] +
    r.recurring['Observability and tracing'] +
    r.recurring['Security, governance and audit'] +
    r.recurring['Evaluation and regression testing'] +
    r.recurring['Platform engineering'];
  const oversightRecoveryCost =
    r.recurring['Human oversight'] + r.recurring['Failure recovery and rework'];

  const total = Math.max(r.monthlyTco, 1e-9);
  const buckets = [
    { label: 'Model inference', value: inferenceCost, color: '#337970' },
    ...(trainingCost > 0 ? [{ label: 'Training & distillation', value: trainingCost, color: '#a88db7' }] : []),
    { label: 'Platform & governance', value: platformFixedCost, color: '#8a93be' },
    { label: 'Runtime, sandbox & retrieval', value: runtimeUsageCost, color: '#bcaa7d' },
    { label: 'Oversight & rework', value: oversightRecoveryCost, color: '#cc8872' },
  ];

  return (
    <>
      <Heading
        title="TCO & value"
        subtitle="Inference is just one line in the enterprise operating model. Compare full recurring TCO against productivity and cash value."
      />

      <div className="metrics compact">
        <Metric label="Monthly inference" value={money(r.inference)} detail="API + self-hosted capacity" />
        <Metric label="Annual recurring" value={money(r.annualTco)} detail="Monthly costs × 12" />
        <Metric label="First-year TCO" value={money(r.firstYearTco)} detail="Recurring + migration" />
        <Metric
          label="Cost / attempted task"
          value={r.perAttempt === null ? 'N/A' : money(r.perAttempt)}
          detail="All recurring costs / tasks"
        />
      </div>

      <Panel
        title="Where every recurring dollar goes"
        subtitle="Grouped monthly TCO composition across inference, platform, runtime and human oversight."
      >
        <div className="stacked-bar" aria-label="Monthly TCO composition">
          {buckets.map((b) => {
            const share = (b.value / total) * 100;
            if (share <= 0) return null;
            return (
              <div
                key={b.label}
                className="stacked-segment"
                style={{ width: `${share}%`, background: b.color }}
                title={`${b.label}: ${money(b.value)} (${pct(b.value / total)})`}
              />
            );
          })}
        </div>
        <div className="stacked-legend">
          {buckets.map((b) => (
            <div key={b.label} className="stacked-legend-item">
              <span className="swatch" style={{ background: b.color }} />
              <span>{b.label}</span>
              <strong>
                {money(b.value)} ({pct(b.value / total)})
              </strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Cost ledger"
        subtitle="Fixed, usage-dependent and capacity costs are separated; all numbers are monthly unless noted."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Cost type</th>
                <th>Share</th>
                <th>Monthly estimate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(r.recurring).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>
                    {k.includes('inference')
                      ? 'Usage / capacity'
                      : USAGE_CATEGORIES.includes(k)
                        ? 'Fixed + usage'
                        : 'Fixed + growth'}
                  </td>
                  <td>{r.monthlyTco > 0 ? pct(v / r.monthlyTco) : '0.0%'}</td>
                  <td>{money(v)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total recurring</td>
                <td></td>
                <td>100.0%</td>
                <td>{money(r.monthlyTco)}</td>
              </tr>
              <tr>
                <td>One-off migration and implementation</td>
                <td>One-off</td>
                <td>—</td>
                <td>{money(s.costs.migration)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Export
          filename="intelligence-cost-breakdown.csv"
          type="text/csv"
          content={csv([
            ['Category', 'Monthly USD'],
            ...Object.entries(r.recurring),
            ['Total recurring', r.monthlyTco],
            ['One-off migration', s.costs.migration],
          ])}
        >
          ↓ Export cost breakdown CSV
        </Export>
        <Details>
          Monthly TCO sums each recurring ledger row exactly once. First year = 12 × monthly TCO + one-off
          migration. Per-success cost is unavailable when there are no successful tasks.
        </Details>
      </Panel>

      <Panel
        title="Business value & key assumptions"
        subtitle="Productivity capacity is tracked separately from direct cash savings."
      >
        <div className="mini-stats" style={{ marginTop: 0, marginBottom: 18 }}>
          <span>
            Potential productivity capacity <b>{money(r.productivity)} / month</b>
          </span>
          <span>
            Estimated cash savings <b>{money(r.cashSavings)} / month</b>
          </span>
          <span>
            Net economic benefit* <b>{money(r.netAnnual)} / year</b>
          </span>
          <span>
            Cash break-even{' '}
            <b>{r.paybackMonths === null ? 'Not reached' : `${num(r.paybackMonths)} months`}</b>
          </span>
        </div>

        <div className="field-grid">
          <N
            label="One-off migration"
            value={s.costs.migration}
            onChange={(n) =>
              onUpdate((v) => {
                v.costs.migration = n;
              })
            }
          />
          <N
            label="Loaded hourly labour USD"
            value={s.value.hourly}
            onChange={(n) =>
              onUpdate((v) => {
                v.value.hourly = n;
              })
            }
          />
          <N
            label="Productivity realisation"
            value={s.value.realisation}
            percent
            onChange={(n) =>
              onUpdate((v) => {
                v.value.realisation = n;
              })
            }
          />
          <N
            label="Capacity converted to cash"
            value={s.value.cashConversion}
            percent
            onChange={(n) =>
              onUpdate((v) => {
                v.value.cashConversion = n;
              })
            }
          />
        </div>

        {!advanced && (
          <AdvancedBanner
            message="Detailed platform, governance, observability, sandbox, oversight and avoided-spend line items are hidden in Quick estimate."
            onEnable={onEnableAdvanced}
          />
        )}

        {advanced && (
          <>
            <h3>Platform, runtime &amp; oversight line items</h3>
            <div className="field-grid">
              {(
                [
                  ['sandboxPerSkill', 'Sandbox USD / skill'],
                  ['retrievalPerTask', 'Retrieval USD / task'],
                  ['integrationMonthly', 'Integration / month'],
                  ['observabilityMonthly', 'Observability / month'],
                  ['governanceMonthly', 'Governance / month'],
                  ['evaluationMonthly', 'Evaluation / month'],
                  ['engineeringMonthly', 'Platform engineering / month'],
                  ['runtimeMonthly', 'Orchestration base / month'],
                  ['oversightHourly', 'Human oversight USD / hour'],
                  ['recoveryPerFailure', 'Recovery USD / failed task'],
                  ['platformGrowth', 'Annual platform overhead growth'],
                ] as const
              ).map(([k, label]) => (
                <N
                  key={k}
                  label={label}
                  value={s.costs[k]}
                  percent={k === 'platformGrowth'}
                  onChange={(n) =>
                    onUpdate((v) => {
                      v.costs[k] = n;
                    })
                  }
                />
              ))}
            </div>

            <h3>Direct cash avoidance &amp; review time</h3>
            <div className="field-grid">
              {(
                [
                  ['reviewMinutes', 'Review minutes / intervened task'],
                  ['licensingMonthly', 'Avoided licensing / month'],
                  ['externalMonthly', 'Avoided external services / month'],
                  ['operationsMonthly', 'Reduced operations / month'],
                ] as const
              ).map(([k, label]) => (
                <N
                  key={k}
                  label={label}
                  value={s.value[k]}
                  onChange={(n) =>
                    onUpdate((v) => {
                      v.value[k] = n;
                    })
                  }
                />
              ))}
            </div>
          </>
        )}

        <Details>
          *Economic benefit includes monetised productivity capacity, which is not necessarily a cash saving. Cash
          break-even uses only cash-converted savings, avoided expenditure and recurring TCO; it also recovers
          one-off migration.
        </Details>
      </Panel>
    </>
  );
}

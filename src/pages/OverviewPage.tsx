import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Scenario, Results, ForecastPoint } from '../engine/types';
import { profiles, industries, MATURITY_LEVELS, SUPPLY_STRATEGIES } from '../data/presets';
import { Panel, Metric, Details, SelectField, money, num, pct } from '../components/Fields';
import { ChartBox, CHART_COLORS } from '../components/ChartBox';

interface OverviewPageProps {
  s: Scenario;
  r: Results;
  points: ForecastPoint[];
  onPreset: (preset: string) => void;
  onIndustry: (industry: string) => void;
  onMaturity: (level: number) => void;
  onStrategy: (strategy: string) => void;
  onNavigate: (page: string) => void;
}

export default function OverviewPage({
  s,
  r,
  points,
  onPreset,
  onIndustry,
  onMaturity,
  onStrategy,
  onNavigate,
}: OverviewPageProps) {
  const inferenceShare = r.monthlyTco > 0 ? r.inference / r.monthlyTco : 0;
  const budgetShare = s.enterprise.budget > 0 ? r.annualTco / s.enterprise.budget : null;
  const topDomain = [...r.domains].sort((a, b) => b.inference + b.runtime - (a.inference + a.runtime))[0];
  const tierData = Object.entries(r.tierCosts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <>
      <div className="hero">
        <div className="eyebrow">ENTERPRISE INTELLIGENCE ECONOMICS / RESEARCH MODEL 01</div>
        <h1>
          From workloads to
          <br />
          <em>intelligence economics.</em>
        </h1>
        <p>
          Estimate the full operating cost of an agent-centric enterprise in under 60 seconds. Pick your
          organisation profile below, then drill into workloads, supply, or five-year forecasts.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn primary" onClick={() => onNavigate('Workloads & adoption')}>
            Fine-tune workloads →
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('5-year forecast')}>
            Explore the forecast ↗
          </button>
        </div>
      </div>

      <Panel
        title="Quick scenario setup"
        subtitle="Adjust these four high-level levers for an immediate estimate — all charts and metrics update live."
      >
        <div className="field-grid">
          <SelectField label="Enterprise size" value={s.preset} options={Object.keys(profiles)} onChange={onPreset} />
          <SelectField
            label="Industry starting point"
            value={s.industry}
            options={Object.keys(industries)}
            onChange={onIndustry}
          />
          <SelectField
            label="Autonomy maturity"
            value={MATURITY_LEVELS[s.maturity] ?? MATURITY_LEVELS[2]}
            options={MATURITY_LEVELS}
            onChange={(label) => {
              const idx = MATURITY_LEVELS.indexOf(label as (typeof MATURITY_LEVELS)[number]);
              if (idx >= 0) onMaturity(idx);
            }}
          />
          <SelectField
            label="Model supply strategy"
            value={
              SUPPLY_STRATEGIES.includes(s.strategy as (typeof SUPPLY_STRATEGIES)[number])
                ? s.strategy
                : 'Tiered routing'
            }
            options={SUPPLY_STRATEGIES}
            onChange={onStrategy}
          />
        </div>
      </Panel>

      <div className="metrics">
        <Metric
          label="Annual enterprise AI TCO"
          value={money(r.annualTco)}
          detail={
            budgetShare !== null
              ? `${pct(budgetShare)} of annual IT budget · excludes migration`
              : 'Recurring estimate · excludes migration'
          }
        />
        <Metric
          label="Monthly model inference"
          value={money(r.inference)}
          detail={`${pct(inferenceShare)} of monthly TCO · API + self-hosted`}
        />
        <Metric
          label="Cost / successful outcome"
          value={r.perSuccess === null ? 'N/A' : money(r.perSuccess)}
          detail="Total recurring cost / successful tasks"
        />
        <Metric
          label="Five-year cumulative cost"
          value={money(points[5].cumulative)}
          detail="Years 1–5 recurring + one-off migration"
        />
        <Metric label="Monthly agent tasks" value={num(r.tasks)} detail="Adopted + proactive workload" />
        <Metric
          label="Monthly token consumption"
          value={num(r.input + r.output)}
          detail="Billable input + output tokens"
        />
      </div>

      <div className="two-col">
        <Panel
          title="Where cost accumulates"
          subtitle="Monthly workload cost by domain (inference + allocated runtime)"
        >
          <ChartBox>
            <BarChart
              data={r.domains.map((d) => ({ name: d.label.split(' ')[0], cost: d.inference + d.runtime }))}
              margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => num(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar isAnimationActive={false} dataKey="cost" fill="#337970" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
          <Details>
            Domain bars show monthly model inference and skill runtime only. Shared platform, governance and human
            oversight costs appear in TCO &amp; value.
          </Details>
        </Panel>

        <Panel title="The five-year outlook" subtitle="Annual inference vs. total ownership cost">
          <ChartBox>
            <AreaChart data={points.slice(1)} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} />
              <YAxis tickFormatter={(v) => num(v)} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="annualTco"
                name="Total TCO"
                stroke="#337970"
                fill="#337970"
                fillOpacity={0.15}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="inference"
                name="Inference"
                stroke="#b17e4d"
                fill="#b17e4d"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartBox>
          <Details>
            Forecast applies annual workload growth, adoption, token efficiency, price declines and tier migration.
            Year 0 is the current baseline.
          </Details>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Model supply mix" subtitle="Monthly inference cost by tier">
          <div className="mix">
            <ChartBox height={220}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={tierData}
                  innerRadius={58}
                  outerRadius={87}
                  dataKey="value"
                >
                  {tierData.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
              </PieChart>
            </ChartBox>
          </div>
        </Panel>

        <Panel title="Executive takeaways & scope" subtitle="Plain-English summary of the active scenario">
          <div className="note-list">
            <p>
              <strong>Cost structure.</strong> Model inference is <strong>{pct(inferenceShare)}</strong> of
              recurring TCO ({money(r.inference)}/mo); platform, runtime, governance and human oversight make up
              the remaining <strong>{pct(1 - inferenceShare)}</strong>.
            </p>
            {topDomain && topDomain.inference + topDomain.runtime > 0 && (
              <p>
                <strong>Largest workload driver.</strong> {topDomain.label} leads domain spend at{' '}
                <strong>{money(topDomain.inference + topDomain.runtime)}/mo</strong> across{' '}
                {num(topDomain.tasks)} monthly tasks.
              </p>
            )}
            <p>
              <strong>Active assumptions.</strong> {s.preset} enterprise · {s.industry} ·{' '}
              {MATURITY_LEVELS[s.maturity]} · {s.strategy} · {pct(s.execution.deterministic)} deterministic
              skills · {s.globalPriceAdjustment.toFixed(2)}× token price factor.
            </p>
            <p>
              <strong>Illustrative &amp; browser-local.</strong> Synthetic starting assumptions, not vendor
              quotations. All calculations run locally in your browser; productivity capacity is tracked separately
              from cash savings.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Scenario, ForecastPoint, Forecast as ForecastType } from '../engine/types';
import { forecastPresets } from '../data/presets';
import {
  Heading,
  Panel,
  NumberField as N,
  SelectField as S,
  Details,
  AdvancedBanner,
  Download as Export,
  csv,
  money,
  num,
  pct,
} from '../components/Fields';
import { ChartBox, CHART_COLORS } from '../components/ChartBox';

interface ForecastPageProps {
  s: Scenario;
  points: ForecastPoint[];
  forecastName: string;
  advanced: boolean;
  onEnableAdvanced: () => void;
  onForecastName: (name: string) => void;
  onUpdate: (fn: (v: Scenario) => void) => void;
}

const FORECAST_FIELDS = [
  ['declineInput', 'Annual input price decline'],
  ['declineOutput', 'Annual output price decline'],
  ['growth', 'Independent workload growth'],
  ['adoptionGrowth', 'Enterprise adoption growth'],
  ['efficiency', 'Annual token efficiency gain'],
  ['frontierShift', 'Frontier → mid substitution'],
  ['midShift', 'Mid → small substitution'],
  ['deterministicGrowth', 'Deterministic share gain / year'],
  ['reuseGrowth', 'Skill reuse gain / year'],
  ['floor', 'Price floor ratio'],
  ['elasticity', 'Demand price elasticity'],
] as const;

export default function ForecastPage({
  s,
  points,
  forecastName,
  advanced,
  onEnableAdvanced,
  onForecastName,
  onUpdate,
}: ForecastPageProps) {
  const trajectoryData = points.slice(1).map((p) => ({
    year: p.year,
    inference: p.inference,
    nonInference: Math.max(0, p.annualTco - p.inference),
  }));

  return (
    <>
      <Heading
        title="5-year forecast"
        subtitle="Falling unit prices can coexist with growing total expenditure — choose a market trajectory or customise every annual driver."
      />

      <Panel title="Forecast assumptions">
        <div className="field-grid">
          <S
            label="Forecast scenario"
            value={forecastName}
            options={[...Object.keys(forecastPresets), 'Custom']}
            onChange={(n) => {
              onForecastName(n);
              if (n !== 'Custom') {
                onUpdate((v) => {
                  v.forecast = { ...forecastPresets[n] };
                });
              }
            }}
          />
          <S
            label="Demand projection"
            value={s.forecast.mode}
            options={['independent', 'responsive']}
            onChange={(n) =>
              onUpdate((v) => {
                v.forecast.mode = n as ForecastType['mode'];
              })
            }
          />
          {!advanced && s.forecast.mode === 'responsive' && (
            <N
              label="Demand price elasticity"
              value={s.forecast.elasticity}
              help="Responsive mode only: demand scales by inverse price index raised to elasticity."
              onChange={(n) => {
                onForecastName('Custom');
                onUpdate((v) => {
                  v.forecast.elasticity = n;
                });
              }}
            />
          )}
          {advanced &&
            FORECAST_FIELDS.map(([k, label]) => (
              <N
                key={k}
                label={label}
                value={s.forecast[k]}
                percent={k !== 'elasticity'}
                help={
                  k === 'floor'
                    ? 'Adjustable assumption, not a verified equilibrium.'
                    : k === 'elasticity'
                      ? 'Responsive mode only: demand scales by inverse price index raised to elasticity.'
                      : 'Year-on-year scenario assumption.'
                }
                onChange={(n) => {
                  onForecastName('Custom');
                  onUpdate((v) => {
                    v.forecast[k] = n;
                  });
                }}
              />
            ))}
        </div>

        {!advanced && (
          <AdvancedBanner
            message="Using preset annual price decline, growth, efficiency and tier-shift curves."
            onEnable={onEnableAdvanced}
          />
        )}

        <Details>
          Future price = max(initial price × floor ratio, initial price × (1 − annual decline)^year). Independent
          demand = base × (1 + workload growth)^year × (1 + adoption growth)^year. Responsive mode further
          multiplies demand by (1 / blended price index)^elasticity. This illustrates a possible rebound effect;
          it does not assert Jevons Paradox.
        </Details>
      </Panel>

      <div className="two-col">
        <Panel
          title="Unit price vs. total expenditure"
          subtitle="Index (current = 100) · a rebound is conditional, not inevitable"
        >
          <ChartBox>
            <LineChart
              data={points.map((p) => ({
                year: p.year,
                unitPrice: p.priceIndex * 100,
                spending: (p.inference / Math.max(points[0].inference, 1)) * 100,
                workload: (p.tasks / Math.max(points[0].tasks, 1)) * 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                isAnimationActive={false}
                dataKey="unitPrice"
                name="Token price index"
                stroke="#b17e4d"
                strokeWidth={2}
              />
              <Line
                isAnimationActive={false}
                dataKey="spending"
                name="Inference spending index"
                stroke="#337970"
                strokeWidth={2}
              />
              <Line
                isAnimationActive={false}
                dataKey="workload"
                name="Agent tasks index"
                stroke="#8a93be"
                strokeWidth={2}
              />
            </LineChart>
          </ChartBox>
        </Panel>

        <Panel title="Cost per successful outcome" subtitle="Total recurring cost / successful tasks">
          <ChartBox>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} />
              <YAxis tickFormatter={(v) => money(v)} />
              <Tooltip formatter={(v) => (v == null ? 'N/A' : money(Number(v)))} />
              <Line
                isAnimationActive={false}
                dataKey="perSuccess"
                name="Cost per outcome"
                stroke="#337970"
                strokeWidth={2}
              />
            </LineChart>
          </ChartBox>
        </Panel>

        <Panel
          title="Annual cost trajectory"
          subtitle="Stacked annual TCO: model inference + platform & operations"
        >
          <ChartBox>
            <BarChart data={trajectoryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} />
              <YAxis tickFormatter={(v) => num(v)} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend />
              <Bar isAnimationActive={false} dataKey="inference" name="Inference" stackId="tco" fill="#b17e4d" />
              <Bar
                isAnimationActive={false}
                dataKey="nonInference"
                name="Platform & operations"
                stackId="tco"
                fill="#337970"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartBox>
        </Panel>

        <Panel title="Model tier migration" subtitle="Share of reasoning calls">
          <ChartBox>
            <AreaChart data={points}>
              <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} />
              <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip formatter={(v) => pct(Number(v))} />
              <Legend />
              {(['frontier', 'mid', 'light', ...(s.enableSelfHosted ? (['self'] as const) : [])] as const).map(
                (t, i) => (
                  <Area
                    isAnimationActive={false}
                    key={t}
                    dataKey={`${t}Share`}
                    name={t}
                    stackId="a"
                    stroke={CHART_COLORS[i]}
                    fill={CHART_COLORS[i]}
                  />
                )
              )}
            </AreaChart>
          </ChartBox>
        </Panel>
      </div>

      <Panel title="Forecast ledger">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Price index</th>
                <th>Monthly tasks</th>
                <th>Annual inference</th>
                <th>Annual TCO</th>
                <th>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(1).map((p) => (
                <tr key={p.year}>
                  <td>{p.year}</td>
                  <td>{pct(p.priceIndex)}</td>
                  <td>{num(p.tasks)}</td>
                  <td>{money(p.inference)}</td>
                  <td>{money(p.annualTco)}</td>
                  <td>{money(p.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Export
          filename="intelligence-forecast.csv"
          type="text/csv"
          content={csv([
            ['Year', 'Price index', 'Monthly tasks', 'Annual inference USD', 'Annual TCO USD', 'Cumulative USD'],
            ...points
              .slice(1)
              .map((p) => [p.year, p.priceIndex, p.tasks, p.inference, p.annualTco, p.cumulative]),
          ])}
        >
          ↓ Export forecast CSV
        </Export>
      </Panel>
    </>
  );
}

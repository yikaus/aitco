import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download as DownloadIcon, Copy, Save } from 'lucide-react';
import type { Scenario } from '../engine/types';
import { builtIns } from '../data/presets';
import { calculate, forecast, validate, sensitivity } from '../engine/calculate';
import { Heading, Panel, Details, Download as Export, money, num, pct } from '../components/Fields';
import { ChartBox } from '../components/ChartBox';

interface ComparisonPageProps {
  s: Scenario;
  saved: Scenario[];
  importStatus: { kind: 'ok' | 'error'; message: string } | null;
  onSaveCurrent: () => void;
  onDuplicateCurrent: () => void;
  onRename: (name: string) => void;
  onLoadSaved: (scenario: Scenario) => void;
  onDuplicateSaved: (scenario: Scenario) => void;
  onDeleteSaved: (index: number) => void;
  onImport: (file: File) => void;
}

export default function ComparisonPage({
  s,
  saved,
  importStatus,
  onSaveCurrent,
  onDuplicateCurrent,
  onRename,
  onLoadSaved,
  onDuplicateSaved,
  onDeleteSaved,
  onImport,
}: ComparisonPageProps) {
  const comparisons = useMemo(
    () =>
      [...builtIns(), ...saved].map((x) => {
        const valid = validate(x).length === 0;
        return {
          name: x.name,
          s: x,
          r: valid ? calculate(x) : null,
          f: valid ? forecast(x)[5] : null,
        };
      }),
    [saved]
  );

  const benchmark = useMemo(
    () =>
      builtIns().map((x) => {
        const b = structuredClone(x);
        b.domains.forEach((d) => {
          d.volume = 0;
          d.proactiveMode = 'absolute';
          d.proactive = 0;
        });
        b.domains[0].proactive = 1000000 / ((0.25 * 1 + 0.5 * 3 + 0.25 * 8) * (1 - b.execution.reuse));
        b.domains[0].classes.simple.skills = 1;
        b.domains[0].classes.medium.skills = 3;
        b.domains[0].classes.complex.skills = 8;
        return { name: x.name, r: calculate(b) };
      }),
    []
  );

  const sensitivityData = useMemo(() => sensitivity(s), [s]);

  return (
    <>
      <Heading
        title="Compare scenarios"
        subtitle="Compare built-in strategies under identical enterprise workload assumptions, save your own configurations locally, and test cost sensitivity."
      />

      <Panel
        title="Your local scenarios"
        subtitle="Stored in this browser only; exporting JSON is the portable backup."
      >
        <div className="toolbar">
          <button type="button" className="btn primary" onClick={onSaveCurrent}>
            <Save size={15} /> Save current
          </button>
          <button type="button" className="btn" onClick={onDuplicateCurrent}>
            <Copy size={15} /> Duplicate current
          </button>
          <Export
            filename="intelligence-scenario.json"
            type="application/json"
            content={JSON.stringify(s, null, 2)}
          >
            <DownloadIcon size={15} /> Export JSON
          </Export>
          <label className="btn file-input">
            ↑ Import JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                if (e.target.files?.[0]) onImport(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {importStatus && (
          <div className={`status-banner ${importStatus.kind}`} role="status">
            {importStatus.message}
          </div>
        )}

        <input
          className="name-input"
          aria-label="Scenario name"
          value={s.name}
          onChange={(e) => onRename(e.target.value)}
        />

        <div className="saved-list">
          {saved.map((x, i) => (
            <div key={`${x.name}-${i}`}>
              <strong>{x.name}</strong>
              <button type="button" className="btn" onClick={() => onLoadSaved(x)}>
                Load
              </button>
              <button type="button" className="btn" onClick={() => onDuplicateSaved(x)}>
                Duplicate
              </button>
              <button type="button" className="btn danger" onClick={() => onDeleteSaved(i)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Strategy comparison"
        subtitle="Built-in strategies use the same Medium enterprise workload starting point."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Annual inference</th>
                <th>Annual TCO</th>
                <th>Cost / success</th>
                <th>Frontier share</th>
                <th>Deterministic</th>
                <th>Monthly tokens</th>
                <th>Five-year cost</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((x, i) => (
                <tr key={`${x.name}-${i}`}>
                  <td>
                    <strong>{x.name}</strong>
                  </td>
                  {x.r && x.f ? (
                    <>
                      <td>{money(x.r.inference * 12)}</td>
                      <td>{money(x.r.annualTco)}</td>
                      <td>{x.r.perSuccess === null ? 'N/A' : money(x.r.perSuccess)}</td>
                      <td>{pct(x.r.tierCalls.frontier / Math.max(x.r.calls, 1))}</td>
                      <td>{pct(x.s.execution.deterministic)}</td>
                      <td>{num(x.r.input + x.r.output)}</td>
                      <td>{money(x.f.cumulative)}</td>
                    </>
                  ) : (
                    <td colSpan={7}>Invalid saved scenario</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Sensitivity analysis"
        subtitle="One-at-a-time +20% perturbation (growth shows year-1 effect). Change in annual TCO from baseline."
      >
        <ChartBox>
          <BarChart data={sensitivityData} layout="vertical" margin={{ left: 100, right: 25 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => num(v)} />
            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Bar isAnimationActive={false} dataKey="tco" fill="#337970" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartBox>
        <Details>
          Success rate changes the cost per outcome and failure recovery cost; the other drivers change inference
          or task demand. These are local directional experiments, not statistical confidence intervals.
        </Details>
      </Panel>

      <Panel
        title="One million monthly skill benchmark"
        subtitle="Synthetic benchmark: identical assumed task distribution across supply strategies; not any organisation’s measured spending."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supply strategy</th>
                <th>Skills / month</th>
                <th>Calls / month</th>
                <th>Inference / month</th>
                <th>Input + output tokens</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.map((x) => (
                <tr key={x.name}>
                  <td>{x.name}</td>
                  <td>{num(x.r.skills)}</td>
                  <td>{num(x.r.calls)}</td>
                  <td>{money(x.r.inference)}</td>
                  <td>{num(x.r.input + x.r.output)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Details>
          Benchmark forces roughly one million monthly skill invocations using the default simple/medium/complex
          mix. Architecture optimisation intentionally changes effective skill demand and call counts. It is
          entirely simulated; no published company benchmark or actual spend is claimed.
        </Details>
      </Panel>
    </>
  );
}

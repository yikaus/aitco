import { Heading, Panel } from '../components/Fields';

const STEPS = [
  [
    '01 / WORKLOAD',
    'Eligible tasks = volume × eligibility. Adopted tasks = eligible × adoption. Proactive tasks are additive.',
  ],
  [
    '02 / EXECUTION',
    'Skills = tasks × class share × skills per task × reuse factor. Reasoning skills remove deterministic work. Calls add explicitly configured retry, fan-out and escalation overhead.',
  ],
  [
    '03 / TOKENS',
    'Input = calls × input tokens per call × context overhead × optimisation × forecast efficiency. Output = calls × billable output tokens; reasoning is included only if separately configured.',
  ],
  [
    '04 / INFERENCE',
    'For each class and tier: uncached input × input price + cached input × cached price + cache writes × write price + output × output price, each per million. Private inference is capacity-priced instead.',
  ],
  [
    '05 / OWNERSHIP',
    'Recurring ledger = inference + runtime + usage costs + capacity + fixed platform + oversight + recovery. First year adds migration once. Five-year cumulative sums years 1–5 plus migration.',
  ],
  [
    '06 / VALUE',
    'Only successful adopted tasks earn potential labour capacity. Proactive tasks do not. Cash savings apply an explicit cash-conversion factor plus avoided expenditures.',
  ],
] as const;

export default function MethodologyPage() {
  return (
    <>
      <Heading
        title="Methodology & assumptions"
        subtitle="An inspectable, synthetic model — not a vendor quote or a guaranteed financial outcome."
      />

      <Panel title="Calculation chain">
        <div className="method-grid">
          {STEPS.map(([title, body]) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Assumption register">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Input</th>
                <th>Classification</th>
                <th>Meaning / source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Enterprise profiles &amp; workload mixes</td>
                <td>Illustrative assumption</td>
                <td>
                  Medium / Large / Global and eight domain estimates. Synthetic starting points; no claim of
                  industry averages.
                </td>
              </tr>
              <tr>
                <td>Generic model tiers</td>
                <td>Illustrative assumption</td>
                <td>
                  Frontier $8/$40, mid $1/$5, lightweight $0.10/$0.50 per million input/output tokens (50% cache
                  discount, $0 cache write). Synthetic 5:1 baseline; not vendor quotes.
                </td>
              </tr>
              <tr>
                <td>Reference provider catalogues</td>
                <td>Reference snapshot (2026-11)</td>
                <td>
                  AWS Bedrock Claude 5.5 ($4/$20, $2/$10, $0.10/$0.50), OpenRouter Claude 5.5 &amp; Value
                  multi-provider mix (Opus 5.5 + Gemini 3.8 Flash + DeepSeek V4 Flash with 1.05× fee), and OpenAI
                  GPT-6.2 ($8/$40, $2/$10, $0.10/$0.50), with 90–95% cache read discounts and 1.25× 5-min cache
                  writes.
                </td>
              </tr>
              <tr>
                <td>Complexity classes</td>
                <td>Illustrative assumption</td>
                <td>
                  Simple 1 skill, 1 call, 2k/300 tokens; medium 3, 3, 8k/1k; complex 8, 6, 20k/3k. Distributions
                  differ by domain.
                </td>
              </tr>
              <tr>
                <td>Edited inputs</td>
                <td>User-provided data</td>
                <td>Stored locally in browser localStorage; never submitted to a server.</td>
              </tr>
              <tr>
                <td>Dashboard and forecast</td>
                <td>Derived calculation</td>
                <td>
                  Computed client-side from the active scenario. Future price floor is a configurable scenario
                  assumption, not a verified equilibrium.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Scope and limitations">
        <p>
          Throughput is an assumed <strong>measured application throughput</strong>, not peak GPU specifications.
          Self-hosted quality, latency, reliability, regulatory constraints and peak concurrency may invalidate
          apparent savings. Student-model payback is a screening upper bound, not a guaranteed substitution. The
          model does not estimate tax, financing, procurement discounts, data egress, organisational change costs
          beyond entered line items, or distributional uncertainty. Forecasts are deterministic what-if scenarios,
          not predictions.
        </p>
        <p>
          Generic baseline prices have no provider identifier, official source URL or verified pricing date because they
          are hypothetical. Reference provider catalogues (AWS Bedrock, OpenRouter, OpenAI) are point-in-time
          snapshots and should be verified against live provider pricing pages before procurement. Long-context
          pricing cliffs (&gt;100K tokens) and Gemini hourly cache storage fees are not separately modeled. No
          external benchmark expenditure is represented.
        </p>
      </Panel>

      <Panel title="Privacy & future architecture">
        <p>
          This static application has no authentication, analytics or backend calculation. Scenarios persist in
          localStorage and can be exported as schema-versioned JSON. A later version could use Cloudflare KV for
          public price snapshots, D1 for historical price metadata, R2 for anonymised benchmark traces and scheduled
          Workers for price checks — none are required or enabled here.
        </p>
      </Panel>
    </>
  );
}

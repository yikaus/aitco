import { useState } from 'react';
import type { Scenario, Results, Domain, Complexity } from '../engine/types';
import { profiles, industries, MATURITY_LEVELS } from '../data/presets';
import {
  Heading,
  Panel,
  NumberField as N,
  SelectField as S,
  Details,
  AdvancedBanner,
  money,
  num,
} from '../components/Fields';

interface WorkloadsPageProps {
  s: Scenario;
  r: Results;
  advanced: boolean;
  onEnableAdvanced: () => void;
  onPreset: (preset: string) => void;
  onIndustry: (industry: string) => void;
  onMaturity: (level: number) => void;
  onUpdate: (fn: (v: Scenario) => void) => void;
  onSetDomain: (index: number, fn: (d: Domain) => void) => void;
  onRegenerateWorkloads: () => void;
}

const ACTIVE_ENTERPRISE_FIELDS: [keyof Scenario['enterprise'], string, string][] = [
  ['employees', 'Total employees', 'Drives Business operations volume'],
  ['engineers', 'Software engineers', 'Drives Software engineering volume'],
  ['applications', 'Applications', 'Drives Security, Integration & Data volumes'],
  ['services', 'Production services', 'Drives Cloud & infrastructure volume'],
  ['pipelines', 'CI/CD pipelines', 'Drives CI/CD & delivery volume'],
  ['tickets', 'Monthly IT tickets', 'Drives IT service management volume'],
  ['budget', 'Annual IT budget (USD)', 'Used to contextualise AI TCO as % of IT budget'],
];

const EXTRA_ENTERPRISE_FIELDS: [keyof Scenario['enterprise'], string][] = [
  ['ops', 'IT operations staff'],
  ['repos', 'Git repositories'],
  ['cloudAccounts', 'Cloud accounts'],
];

export default function WorkloadsPage({
  s,
  r,
  advanced,
  onEnableAdvanced,
  onPreset,
  onIndustry,
  onMaturity,
  onUpdate,
  onSetDomain,
  onRegenerateWorkloads,
}: WorkloadsPageProps) {
  const [profileDirty, setProfileDirty] = useState(false);

  const handleEnterpriseChange = (key: keyof Scenario['enterprise'], val: number) => {
    onUpdate((v) => {
      v.enterprise[key] = val;
    });
    if (key !== 'budget' && key !== 'ops' && key !== 'repos' && key !== 'cloudAccounts') {
      setProfileDirty(true);
    }
  };

  const handleRegenerate = () => {
    onRegenerateWorkloads();
    setProfileDirty(false);
  };

  return (
    <>
      <Heading
        title="Workloads & adoption"
        subtitle="Start from your organisation size and autonomy maturity, then override any of the eight workload domains."
      />

      <Panel
        title="Enterprise profile"
        subtitle="Changing Enterprise size or Industry regenerates suggested domain volumes immediately. Manual number edits preserve your domain overrides until you apply them."
      >
        <div className="field-grid">
          <S
            label="Enterprise size"
            value={s.preset}
            options={Object.keys(profiles)}
            onChange={(p) => {
              onPreset(p);
              setProfileDirty(false);
            }}
          />
          <S
            label="Industry starting point"
            value={s.industry}
            options={Object.keys(industries)}
            onChange={(ind) => {
              onIndustry(ind);
              setProfileDirty(false);
            }}
          />
          {ACTIVE_ENTERPRISE_FIELDS.map(([key, label, help]) => (
            <N
              key={key}
              label={label}
              help={help}
              value={s.enterprise[key]}
              onChange={(n) => handleEnterpriseChange(key, n)}
            />
          ))}
          {advanced &&
            EXTRA_ENTERPRISE_FIELDS.map(([key, label]) => (
              <N
                key={key}
                label={label}
                help="Descriptive profile metadata; does not directly alter workload calculations."
                value={s.enterprise[key]}
                onChange={(n) => handleEnterpriseChange(key, n)}
              />
            ))}
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className={`btn ${profileDirty ? 'primary' : ''}`}
            onClick={handleRegenerate}
          >
            {profileDirty ? 'Apply profile edits to workload volumes' : 'Regenerate suggested workloads'}
          </button>
          {profileDirty && (
            <span className="muted-inline">
              Profile counts changed — click to recalculate suggested domain volumes.
            </span>
          )}
        </div>
      </Panel>

      <Panel
        title="Autonomy maturity"
        subtitle="Sets editable adoption, proactive work and deterministic skill defaults across all domains."
      >
        <div className="maturity">
          {MATURITY_LEVELS.map((label, i) => (
            <button
              type="button"
              key={label}
              className={`choice ${s.maturity === i ? 'selected' : ''}`}
              onClick={() => onMaturity(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {!advanced && (
        <AdvancedBanner
          message="Showing core workload levers. Proactive tasks, human intervention, and per-complexity token mixes are hidden in Quick estimate."
          onEnable={onEnableAdvanced}
        />
      )}

      <div className="domain-list">
        {s.domains.map((d, i) => (
          <Panel
            key={d.key}
            title={d.label}
            subtitle={`${d.trigger === 'human' ? 'Human' : 'Event'}-triggered · ${num(
              r.domains[i].tasks
            )} monthly tasks · ${money(r.domains[i].inference)} inference`}
          >
            <div className="field-grid">
              <N
                label="Monthly workload volume"
                value={d.volume}
                onChange={(n) =>
                  onSetDomain(i, (x) => {
                    x.volume = n;
                  })
                }
                help="Monthly enterprise events, cases or tasks; not every event needs a model call."
              />
              <N
                label="Agent eligibility"
                value={d.eligibility}
                percent
                onChange={(n) =>
                  onSetDomain(i, (x) => {
                    x.eligibility = n;
                  })
                }
              />
              <N
                label="Agent adoption"
                value={d.adoption}
                percent
                onChange={(n) =>
                  onSetDomain(i, (x) => {
                    x.adoption = n;
                  })
                }
              />
              <N
                label="Execution success"
                value={d.success}
                percent
                onChange={(n) =>
                  onSetDomain(i, (x) => {
                    x.success = n;
                  })
                }
              />

              {advanced && (
                <>
                  <label className="field">
                    <span>Proactive mode</span>
                    <select
                      aria-label={`${d.label} proactive mode`}
                      value={d.proactiveMode}
                      onChange={(e) =>
                        onSetDomain(i, (x) => {
                          x.proactiveMode = e.target.value as Domain['proactiveMode'];
                          x.proactive = 0;
                        })
                      }
                    >
                      <option value="percent">% of volume</option>
                      <option value="absolute">Absolute / month</option>
                    </select>
                  </label>
                  <N
                    label={`Proactive work (${num(r.domains[i].proactive)}/mo)`}
                    value={d.proactive}
                    percent={d.proactiveMode === 'percent'}
                    help="Additional agent-initiated tasks; never automatically assigned labour savings."
                    onChange={(n) =>
                      onSetDomain(i, (x) => {
                        x.proactive = n;
                      })
                    }
                  />
                  <N
                    label="Human intervention"
                    value={d.intervention}
                    percent
                    onChange={(n) =>
                      onSetDomain(i, (x) => {
                        x.intervention = n;
                      })
                    }
                  />
                  <N
                    label="Average skills multiplier"
                    value={d.skillsMultiplier}
                    onChange={(n) =>
                      onSetDomain(i, (x) => {
                        x.skillsMultiplier = n;
                      })
                    }
                    help="Multiplier on class-specific skills per task; 1 uses class defaults."
                  />
                  <N
                    label="Eligible human hours / task"
                    value={d.humanHours}
                    onChange={(n) =>
                      onSetDomain(i, (x) => {
                        x.humanHours = n;
                      })
                    }
                  />
                  <S
                    label="Task trigger"
                    value={d.trigger}
                    options={['human', 'event']}
                    onChange={(n) =>
                      onSetDomain(i, (x) => {
                        x.trigger = n as Domain['trigger'];
                      })
                    }
                  />
                </>
              )}
            </div>

            {advanced && (
              <>
                <h3>Complexity mix</h3>
                <div className="field-grid">
                  {(['simple', 'medium', 'complex'] as Complexity[]).map((k) => (
                    <N
                      key={k}
                      label={`${k} share`}
                      value={d.classes[k].share}
                      percent
                      onChange={(n) =>
                        onSetDomain(i, (x) => {
                          x.classes[k].share = n;
                        })
                      }
                    />
                  ))}
                </div>
                <Details title="Execution hierarchy and class assumptions">
                  {(['simple', 'medium', 'complex'] as Complexity[]).map((k) => (
                    <div key={k} className="class-row">
                      <strong>{k}</strong>
                      <N
                        label="Skills / task"
                        value={d.classes[k].skills}
                        onChange={(n) =>
                          onSetDomain(i, (x) => {
                            x.classes[k].skills = n;
                          })
                        }
                      />
                      <N
                        label="Calls / reasoning skill"
                        value={d.classes[k].calls}
                        onChange={(n) =>
                          onSetDomain(i, (x) => {
                            x.classes[k].calls = n;
                          })
                        }
                      />
                      <N
                        label="Input tokens / call"
                        value={d.classes[k].input}
                        onChange={(n) =>
                          onSetDomain(i, (x) => {
                            x.classes[k].input = n;
                          })
                        }
                      />
                      <N
                        label="Output tokens / call"
                        value={d.classes[k].output}
                        onChange={(n) =>
                          onSetDomain(i, (x) => {
                            x.classes[k].output = n;
                          })
                        }
                      />
                    </div>
                  ))}
                </Details>
              </>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}

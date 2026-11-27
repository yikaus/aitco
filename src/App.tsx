import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  LayoutDashboard,
  Layers3,
  BrainCircuit,
  Wallet,
  TrendingUp,
  GitCompareArrows,
  BookOpen,
  Menu,
  Sun,
  Moon,
  RotateCcw,
} from 'lucide-react';
import {
  makeScenario,
  profiles,
  suggestedDomains,
  applyMaturity,
  applySupplyStrategy,
} from './data/presets';
import { calculate, forecast, validate } from './engine/calculate';
import type { Scenario, Domain } from './engine/types';
import OverviewPage from './pages/OverviewPage';

const WorkloadsPage = lazy(() => import('./pages/WorkloadsPage'));
const SupplyPage = lazy(() => import('./pages/SupplyPage'));
const TcoPage = lazy(() => import('./pages/TcoPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'));

const NAV = [
  ['Overview', LayoutDashboard],
  ['Workloads & adoption', Layers3],
  ['Supply & execution', BrainCircuit],
  ['TCO & value', Wallet],
  ['5-year forecast', TrendingUp],
  ['Compare scenarios', GitCompareArrows],
  ['Methodology', BookOpen],
] as const;

const STORE_KEY = 'intelligence-economics-v1';

function migrateScenario(value: Scenario): Scenario {
  const x = structuredClone(value);
  x.enableSelfHosted ??= false;
  x.enableStudentModels ??= false;
  x.globalPriceAdjustment ??= 1;
  return x;
}

function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (v?.current?.schemaVersion === 1 && Array.isArray(v.saved)) {
      return {
        current: migrateScenario(v.current),
        saved: v.saved.map(migrateScenario),
      };
    }
  } catch {
    // Fall back to default scenario on corrupted localStorage
  }
  return { current: makeScenario(), saved: [] as Scenario[] };
}

export default function App() {
  const [initial] = useState(loadState);
  const [s, setS] = useState<Scenario>(initial.current);
  const [saved, setSaved] = useState<Scenario[]>(initial.saved);
  const [page, setPage] = useState<string>('Overview');
  const [advanced, setAdvanced] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('ie-theme') === 'dark');
  const [menu, setMenu] = useState(false);
  const [forecastName, setForecastName] = useState('Competitive market');
  const [importStatus, setImportStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ current: s, saved }));
  }, [s, saved]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('ie-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const errors = useMemo(() => validate(s), [s]);
  const r = useMemo(() => calculate(s), [s]);
  const points = useMemo(() => forecast(s), [s]);

  const update = (fn: (v: Scenario) => void) =>
    setS((old) => {
      const next = structuredClone(old);
      fn(next);
      return next;
    });

  const setDomain = (i: number, fn: (d: Domain) => void) => update((v) => fn(v.domains[i]));

  const setPageSafe = (p: string) => {
    setPage(p);
    setMenu(false);
    window.scrollTo(0, 0);
  };

  const setPreset = (p: string) =>
    update((v) => {
      v.preset = p;
      v.enterprise = { ...profiles[p] };
      v.domains = suggestedDomains(v.enterprise, v.industry);
    });

  const setIndustry = (ind: string) =>
    update((v) => {
      v.industry = ind;
      v.domains = suggestedDomains(v.enterprise, ind);
    });

  const setMaturity = (level: number) => setS((old) => applyMaturity(old, level));
  const setStrategy = (strategy: string) => setS((old) => applySupplyStrategy(old, strategy));

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const x = JSON.parse(String(reader.result));
        if (x.schemaVersion !== 1 || !Array.isArray(x.domains) || !x.prices || !x.enterprise) {
          throw Error('Unsupported scenario schema');
        }
        const imported = migrateScenario(x);
        const issues = validate(imported);
        if (issues.length) throw Error(issues.join('; '));
        setS(imported);
        setImportStatus({ kind: 'ok', message: `Imported "${imported.name}" locally.` });
      } catch (e) {
        setImportStatus({
          kind: 'error',
          message: `Import failed: ${e instanceof Error ? e.message : 'Invalid JSON'}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const renderPage = () => {
    switch (page) {
      case 'Overview':
        return (
          <OverviewPage
            s={s}
            r={r}
            points={points}
            onPreset={setPreset}
            onIndustry={setIndustry}
            onMaturity={setMaturity}
            onStrategy={setStrategy}
            onNavigate={setPageSafe}
          />
        );
      case 'Workloads & adoption':
        return (
          <WorkloadsPage
            s={s}
            r={r}
            advanced={advanced}
            onEnableAdvanced={() => setAdvanced(true)}
            onPreset={setPreset}
            onIndustry={setIndustry}
            onMaturity={setMaturity}
            onUpdate={update}
            onSetDomain={setDomain}
            onRegenerateWorkloads={() =>
              update((v) => {
                v.domains = suggestedDomains(v.enterprise, v.industry);
              })
            }
          />
        );
      case 'Supply & execution':
        return (
          <SupplyPage
            s={s}
            r={r}
            advanced={advanced}
            onEnableAdvanced={() => setAdvanced(true)}
            onStrategy={setStrategy}
            onUpdate={update}
            onSetDomain={setDomain}
          />
        );
      case 'TCO & value':
        return (
          <TcoPage
            s={s}
            r={r}
            advanced={advanced}
            onEnableAdvanced={() => setAdvanced(true)}
            onUpdate={update}
          />
        );
      case '5-year forecast':
        return (
          <ForecastPage
            s={s}
            points={points}
            forecastName={forecastName}
            advanced={advanced}
            onEnableAdvanced={() => setAdvanced(true)}
            onForecastName={setForecastName}
            onUpdate={update}
          />
        );
      case 'Compare scenarios':
        return (
          <ComparisonPage
            s={s}
            saved={saved}
            importStatus={importStatus}
            onSaveCurrent={() => setSaved((v) => [...v, structuredClone(s)])}
            onDuplicateCurrent={() => {
              const x = structuredClone(s);
              x.name = `${s.name} (copy)`;
              setS(x);
            }}
            onRename={(name) =>
              update((v) => {
                v.name = name;
              })
            }
            onLoadSaved={(x) => setS(structuredClone(x))}
            onDuplicateSaved={(x) => {
              const copy = structuredClone(x);
              copy.name += ' (copy)';
              setSaved((v) => [...v, copy]);
            }}
            onDeleteSaved={(index) => setSaved((v) => v.filter((_, j) => j !== index))}
            onImport={handleImport}
          />
        );
      default:
        return <MethodologyPage />;
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div>
            <strong>
              INTELLIGENCE
              <br />
              ECONOMICS
            </strong>
            <small>ENTERPRISE RESEARCH TOOL</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {NAV.map(([name, Icon]) => (
            <button
              type="button"
              key={name}
              className={`nav-item ${page === name ? 'active' : ''}`}
              onClick={() => setPageSafe(name)}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{name}</span>
              {page === name && <span className="nav-marker" />}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="privacy">
            <span className="live-dot" /> BROWSER-LOCAL MODEL
            <br />
            <small>No inputs leave this device</small>
          </div>
          <button type="button" className="theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            RESEARCH DESK <span>/</span> {page.toUpperCase()}
          </div>
          <div className="top-actions">
            <span className="status">
              <span className="live-dot" /> LIVE MODEL
            </span>
            <button
              type="button"
              className="mode"
              onClick={() => setAdvanced(!advanced)}
              aria-pressed={advanced}
            >
              {advanced ? 'Advanced modelling' : 'Quick estimate'}{' '}
              <span className={`toggle ${advanced ? 'on' : ''}`} />
            </button>
          </div>
        </header>

        <main className="content">
          {errors.length > 0 && (
            <div className="error" role="alert">
              <strong>Check assumptions:</strong> {errors.slice(0, 4).join(' · ')}
              {errors.length > 4 ? ` · +${errors.length - 4} more` : ''}
            </div>
          )}

          <Suspense fallback={<div className="panel">Loading view…</div>}>{renderPage()}</Suspense>

          <footer>
            <span>
              INTELLIGENCE ECONOMICS <b> / </b> INDEPENDENT RESEARCH MODEL
            </span>
            <span>Illustrative estimates · No enterprise data transmitted</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset current scenario to default assumptions?')) {
                  setS(makeScenario());
                  setForecastName('Competitive market');
                }
              }}
            >
              <RotateCcw size={13} /> Reset assumptions
            </button>
          </footer>
        </main>
      </div>

      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
    </div>
  );
}

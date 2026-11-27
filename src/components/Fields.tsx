import type { ReactNode } from 'react';

export function NumberField({
  label,
  value,
  onChange,
  percent = false,
  help,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  percent?: boolean;
  help?: string;
  step?: number;
}) {
  const displayValue = percent ? +(value * 100).toFixed(4) : value;
  return (
    <label className="field">
      <span title={help}>
        {label}
        {help && (
          <span className="hint" aria-label={help}>
            {' '}
            ⓘ
          </span>
        )}
      </span>
      <div className="input-wrap">
        <input
          type="number"
          min="0"
          max={percent ? 100 : undefined}
          step={step ?? (percent ? 1 : 'any')}
          value={Number.isFinite(displayValue) ? displayValue : 0}
          onChange={(e) => {
            const raw = e.target.value === '' ? 0 : Number(e.target.value);
            if (!Number.isFinite(raw)) return;
            onChange(Math.max(0, raw) / (percent ? 100 : 1));
          }}
        />
        {percent && <span>%</span>}
      </div>
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (s: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-heading">
      <div className="eyebrow">MODEL CONFIGURATION / {title.toUpperCase()}</div>
      <h1>
        {title}
        <span className="dot">.</span>
      </h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

export function Details({
  children,
  title = 'How this is calculated',
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <details className="explain">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

export function AdvancedBanner({
  message,
  onEnable,
}: {
  message: string;
  onEnable: () => void;
}) {
  return (
    <div className="advanced-banner">
      <span>{message}</span>
      <button type="button" className="btn" onClick={onEnable}>
        Switch to Advanced modelling →
      </button>
    </div>
  );
}

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(n) < 100 ? 2 : 0,
  }).format(n);

export const num = (n: number) =>
  new Intl.NumberFormat('en-US', {
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(n) < 100 ? 2 : 1,
  }).format(n);

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function Download({
  filename,
  content,
  type = 'text/plain',
  children,
}: {
  filename: string;
  content: string;
  type?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type }));
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }}
    >
      {children}
    </button>
  );
}

export function csv(rows: (string | number | null)[][]) {
  return rows.map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}

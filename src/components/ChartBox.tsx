import type { ReactElement, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

export const CHART_COLORS = [
  '#bcaa7d',
  '#76a79d',
  '#8a93be',
  '#cc8872',
  '#a88db7',
  '#72a0c2',
  '#a4a76e',
  '#d4ae84',
];

export function ChartBox({ children, height = 270 }: { children: ReactNode; height?: number }) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

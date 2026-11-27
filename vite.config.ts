import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  compareProviderMatrix,
  getLlmsTxt,
  getOpenApiSpec,
  getPresetsCatalog,
  getStandardScenariosMatrix,
} from './src/engine/agentApi';

function pagesStaticAssets(): Plugin {
  return {
    name: 'pages-static-assets',
    apply: 'build',
    generateBundle() {
      if (process.env.VITE_PAGES_STATIC !== '1') return;

      const workersOrigin = 'https://aitco.yikaus.workers.dev';
      const pagesOrigin = 'https://yikaus.github.io/aitco';

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: 'User-agent: *\nAllow: /\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: 'presets.json',
        source: JSON.stringify({ ok: true, ...getPresetsCatalog() }, null, 2),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'scenarios.json',
        source: JSON.stringify(getStandardScenariosMatrix(), null, 2),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'compare.json',
        source: JSON.stringify(compareProviderMatrix({ preset: 'Medium', maturity: 2 }), null, 2),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'openapi.json',
        source: JSON.stringify(getOpenApiSpec(workersOrigin), null, 2),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source:
          getLlmsTxt(workersOrigin) +
          `\n## GitHub Pages Static Mirror\n- ${pagesOrigin}/presets.json\n- ${pagesOrigin}/scenarios.json\n- ${pagesOrigin}/compare.json\n`,
      });
    },
    closeBundle() {
      if (process.env.VITE_PAGES_STATIC !== '1') return;
      const indexPath = resolve('dist', 'index.html');
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, resolve('dist', '404.html'));
      }
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), pagesStaticAssets()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'charts', test: /node_modules\/(recharts|d3-|victory-)/ },
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|scheduler)/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/tests/**/*.test.ts'],
  },
});

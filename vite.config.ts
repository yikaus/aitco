import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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

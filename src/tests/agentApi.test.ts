import { describe, expect, it } from 'vitest';
import {
  buildScenario,
  compareScenarios,
  evaluateScenario,
  getLlmsTxt,
  getOpenApiSpec,
  getPresetsCatalog,
} from '../engine/agentApi';
import { handleRequest } from '../../worker/index';

describe('agentApi pure functions', () => {
  it('builds and evaluates scenarios with provider presets and domain overrides', () => {
    const res = evaluateScenario(
      {
        preset: 'Large',
        maturity: 3,
        pricePreset: 'AWS Bedrock (Claude 5.5)',
        domainOverrides: {
          engineering: { adoption: 0.9 },
        },
      },
      { includeScenario: true, includeSensitivity: true }
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.preset).toBe('Large');
    expect(res.summary.pricePreset).toBe('AWS Bedrock (Claude 5.5)');
    expect(res.summary.annualTcoUsd).toBeGreaterThan(0);
    expect(res.forecast).toHaveLength(6);
    expect(res.sensitivity).toHaveLength(7);
    expect(res.scenario?.domains[0].adoption).toBe(0.9);
  });

  it('rejects invalid enum and numeric inputs cleanly', () => {
    const bad = buildScenario({ preset: 'Startup', maturity: 9 });
    expect(bad.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('compares default and custom scenarios', () => {
    const def = compareScenarios();
    expect(def.ok).toBe(true);
    expect(def.comparisons).toHaveLength(5);

    const custom = compareScenarios([
      { label: 'Bedrock', preset: 'Medium', pricePreset: 'AWS Bedrock (Claude 5.5)' },
      { label: 'OpenAI', preset: 'Medium', pricePreset: 'OpenAI (GPT-6.2 stack)' },
    ]);
    expect(custom.comparisons).toHaveLength(2);
    expect(custom.comparisons[0].ok).toBe(true);
    expect(custom.comparisons[1].ok).toBe(true);
  });

  it('exposes presets catalog, OpenAPI spec, and llms.txt', () => {
    const catalog = getPresetsCatalog();
    expect(catalog.pricePresets).toContain('AWS Bedrock (Claude 5.5)');
    const spec = getOpenApiSpec('https://aitco.yikaus.workers.dev');
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths['/api/calculate']).toBeDefined();
    expect(getLlmsTxt('https://aitco.yikaus.workers.dev')).toContain('/api/calculate');
  });
});

describe('Cloudflare Worker handleRequest', () => {
  it('serves /llms.txt, /openapi.json, /api/health, and /api/presets', async () => {
    const llms = await handleRequest(new Request('https://aitco.yikaus.workers.dev/llms.txt'));
    expect(llms.status).toBe(200);
    expect(await llms.text()).toContain('/api/calculate');

    const openapi = await handleRequest(new Request('https://aitco.yikaus.workers.dev/openapi.json'));
    expect(openapi.status).toBe(200);
    const spec = (await openapi.json()) as { openapi: string };
    expect(spec.openapi).toBe('3.1.0');

    const health = await handleRequest(new Request('https://aitco.yikaus.workers.dev/api/health'));
    expect(health.status).toBe(200);
    expect(((await health.json()) as { ok: boolean }).ok).toBe(true);

    const presets = await handleRequest(new Request('https://aitco.yikaus.workers.dev/api/presets'));
    expect(presets.status).toBe(200);
    const presetsJson = (await presets.json()) as { pricePresets: string[] };
    expect(presetsJson.pricePresets).toContain('AWS Bedrock (Claude 5.5)');
  });

  it('handles GET and POST /api/calculate and validation errors', async () => {
    const getRes = await handleRequest(
      new Request(
        'https://aitco.yikaus.workers.dev/api/calculate?preset=Large&maturity=3&pricePreset=AWS+Bedrock+(Claude+5.5)'
      )
    );
    expect(getRes.status).toBe(200);
    const getData = (await getRes.json()) as { ok: boolean; summary: { annualInferenceUsd: number } };
    const direct = evaluateScenario({
      preset: 'Large',
      maturity: 3,
      pricePreset: 'AWS Bedrock (Claude 5.5)',
    });
    expect(direct.ok).toBe(true);
    if (direct.ok) {
      expect(getData.summary.annualInferenceUsd).toBeCloseTo(direct.summary.annualInferenceUsd);
    }

    const postRes = await handleRequest(
      new Request('https://aitco.yikaus.workers.dev/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: 'Medium',
          pricePreset: 'OpenRouter (Value mix)',
          domainOverrides: { engineering: { adoption: 0.5 } },
        }),
      })
    );
    expect(postRes.status).toBe(200);

    const badPreset = await handleRequest(
      new Request('https://aitco.yikaus.workers.dev/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'InvalidSize' }),
      })
    );
    expect(badPreset.status).toBe(400);

    const badJson = await handleRequest(
      new Request('https://aitco.yikaus.workers.dev/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      })
    );
    expect(badJson.status).toBe(400);
  });

  it('handles POST /api/compare, CORS preflight, and unknown /api/* routes', async () => {
    const cmp = await handleRequest(
      new Request('https://aitco.yikaus.workers.dev/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    );
    expect(cmp.status).toBe(200);
    const cmpJson = (await cmp.json()) as { comparisons: unknown[] };
    expect(cmpJson.comparisons).toHaveLength(5);

    const opt = await handleRequest(
      new Request('https://aitco.yikaus.workers.dev/api/calculate', { method: 'OPTIONS' })
    );
    expect(opt.status).toBe(204);
    expect(opt.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const notFound = await handleRequest(new Request('https://aitco.yikaus.workers.dev/api/unknown'));
    expect(notFound.status).toBe(404);
  });
});

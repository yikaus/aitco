import {
  type ScenarioInput,
  compareScenarios,
  evaluateScenario,
  getLlmsTxt,
  getOpenApiSpec,
  getPresetsCatalog,
} from '../src/engine/agentApi';

export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ENDPOINTS = ['/llms.txt', '/openapi.json', '/api/health', '/api/presets', '/api/calculate', '/api/compare'];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function parseBool(value: string | null): boolean | undefined {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function parseQueryCalculate(url: URL) {
  const input: ScenarioInput = {};
  const errors: string[] = [];

  const str = (key: string) => {
    const val = url.searchParams.get(key);
    return val && val.trim() !== '' ? val : undefined;
  };

  const preset = str('preset');
  const industry = str('industry');
  const strategy = str('strategy');
  const pricePreset = str('pricePreset');
  const forecastPreset = str('forecastPreset');
  const name = str('name');

  if (preset !== undefined) input.preset = preset;
  if (industry !== undefined) input.industry = industry;
  if (strategy !== undefined) input.strategy = strategy;
  if (pricePreset !== undefined) input.pricePreset = pricePreset;
  if (forecastPreset !== undefined) input.forecastPreset = forecastPreset;
  if (name !== undefined) input.name = name;

  const maturityRaw = str('maturity');
  if (maturityRaw !== undefined) {
    const n = Number(maturityRaw);
    if (!Number.isFinite(n)) errors.push('maturity must be a number between 0 and 4');
    else input.maturity = n;
  }

  const adjRaw = str('globalPriceAdjustment');
  if (adjRaw !== undefined) {
    const n = Number(adjRaw);
    if (!Number.isFinite(n)) errors.push('globalPriceAdjustment must be a finite number');
    else input.globalPriceAdjustment = n;
  }

  const selfHosted = parseBool(url.searchParams.get('enableSelfHosted'));
  if (selfHosted !== undefined) input.enableSelfHosted = selfHosted;

  const studentModels = parseBool(url.searchParams.get('enableStudentModels'));
  if (studentModels !== undefined) input.enableStudentModels = studentModels;

  const includeScenario = parseBool(url.searchParams.get('includeScenario')) ?? false;
  const includeSensitivity = parseBool(url.searchParams.get('includeSensitivity')) ?? false;

  return { input, includeScenario, includeSensitivity, errors };
}

export async function handleRequest(request: Request, env?: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  const isAgentRoute =
    pathname.startsWith('/api/') || pathname === '/openapi.json' || pathname === '/llms.txt';

  if (isAgentRoute && request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (pathname === '/llms.txt' && request.method === 'GET') {
    return new Response(getLlmsTxt(url.origin), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...CORS_HEADERS,
      },
    });
  }

  if ((pathname === '/openapi.json' || pathname === '/api/openapi.json') && request.method === 'GET') {
    return json(getOpenApiSpec(url.origin));
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, service: 'aitco', schemaVersion: 1, endpoints: ENDPOINTS });
  }

  if (pathname === '/api/presets' && request.method === 'GET') {
    return json({ ok: true, ...getPresetsCatalog() });
  }

  if (pathname === '/api/calculate') {
    if (request.method === 'GET') {
      const { input, includeScenario, includeSensitivity, errors } = parseQueryCalculate(url);
      if (errors.length > 0) return json({ ok: false, errors }, 400);
      const res = evaluateScenario(input, { includeScenario, includeSensitivity });
      return json(res, res.ok ? 200 : 400);
    }

    if (request.method === 'POST') {
      let body: Record<string, unknown> = {};
      const text = await request.text();
      if (text.trim() !== '') {
        try {
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return json({ ok: false, errors: ['Request body must be a JSON object'] }, 400);
          }
          body = parsed as Record<string, unknown>;
        } catch {
          return json({ ok: false, errors: ['Invalid JSON request body'] }, 400);
        }
      }
      const { includeScenario = true, includeSensitivity = true, ...input } = body;
      const res = evaluateScenario(input as ScenarioInput, {
        includeScenario: Boolean(includeScenario),
        includeSensitivity: Boolean(includeSensitivity),
      });
      return json(res, res.ok ? 200 : 400);
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  if (pathname === '/api/compare') {
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405);
    }
    let items: Array<{ label?: string } & ScenarioInput> | undefined;
    const text = await request.text();
    if (text.trim() !== '') {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const maybeScenarios = (parsed as { scenarios?: unknown }).scenarios;
          if (maybeScenarios !== undefined && !Array.isArray(maybeScenarios)) {
            return json({ ok: false, errors: ['scenarios must be an array'] }, 400);
          }
          items = maybeScenarios as Array<{ label?: string } & ScenarioInput> | undefined;
        } else {
          return json({ ok: false, errors: ['Invalid JSON request body'] }, 400);
        }
      } catch {
        return json({ ok: false, errors: ['Invalid JSON request body'] }, 400);
      }
    }
    return json(compareScenarios(items), 200);
  }

  if (pathname.startsWith('/api/')) {
    return json({ ok: false, error: 'Not found', endpoints: ENDPOINTS }, 404);
  }

  return env ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
}

export default {
  fetch: handleRequest,
};

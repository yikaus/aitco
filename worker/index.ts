import {
  type ScenarioInput,
  compareProviderMatrix,
  compareScenarios,
  evaluateScenario,
  getLlmsTxt,
  getOpenApiSpec,
  getPresetsCatalog,
  getStandardScenariosMatrix,
} from '../src/engine/agentApi';

export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ENDPOINTS = [
  '/robots.txt',
  '/llms.txt',
  '/openapi.json',
  '/presets.json',
  '/scenarios.json',
  '/estimate.json',
  '/compare.json',
  '/api/health',
  '/api/presets',
  '/api/calculate',
  '/api/compare',
];

function respond(
  request: Request,
  body: string,
  status = 200,
  contentType = 'application/json; charset=utf-8'
): Response {
  const headers = {
    'Content-Type': contentType,
    ...CORS_HEADERS,
  };
  if (request.method === 'HEAD') {
    return new Response(null, { status, headers });
  }
  return new Response(body, { status, headers });
}

function json(request: Request, data: unknown, status = 200): Response {
  return respond(request, JSON.stringify(data, null, 2), status, 'application/json; charset=utf-8');
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
  const isRead = request.method === 'GET' || request.method === 'HEAD';

  const isAgentRoute =
    pathname.startsWith('/api/') ||
    pathname === '/openapi.json' ||
    pathname === '/llms.txt' ||
    pathname === '/robots.txt' ||
    pathname === '/presets.json' ||
    pathname === '/estimate.json' ||
    pathname === '/compare.json' ||
    pathname === '/scenarios.json';

  if (isAgentRoute && request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (pathname === '/robots.txt' && isRead) {
    return respond(request, 'User-agent: *\nAllow: /\n', 200, 'text/plain; charset=utf-8');
  }

  if (pathname === '/llms.txt' && isRead) {
    return respond(request, getLlmsTxt(url.origin), 200, 'text/plain; charset=utf-8');
  }

  if ((pathname === '/openapi.json' || pathname === '/api/openapi.json') && isRead) {
    return json(request, getOpenApiSpec(url.origin));
  }

  if (pathname === '/api/health' && isRead) {
    return json(request, { ok: true, service: 'aitco', schemaVersion: 1, endpoints: ENDPOINTS });
  }

  if ((pathname === '/api/presets' || pathname === '/presets.json') && isRead) {
    return json(request, { ok: true, ...getPresetsCatalog() });
  }

  if (pathname === '/scenarios.json' && isRead) {
    return json(request, getStandardScenariosMatrix());
  }

  if (pathname === '/estimate.json' && isRead) {
    const { input, includeScenario, includeSensitivity, errors } = parseQueryCalculate(url);
    if (errors.length > 0) return json(request, { ok: false, errors }, 400);
    const res = evaluateScenario(input, { includeScenario, includeSensitivity });
    return json(request, res, res.ok ? 200 : 400);
  }

  if (pathname === '/compare.json' && isRead) {
    const { input, errors } = parseQueryCalculate(url);
    if (errors.length > 0) return json(request, { ok: false, errors }, 400);
    return json(request, compareProviderMatrix(input), 200);
  }

  if (pathname === '/api/calculate') {
    if (isRead) {
      const { input, includeScenario, includeSensitivity, errors } = parseQueryCalculate(url);
      if (errors.length > 0) return json(request, { ok: false, errors }, 400);
      const res = evaluateScenario(input, { includeScenario, includeSensitivity });
      return json(request, res, res.ok ? 200 : 400);
    }

    if (request.method === 'POST') {
      let body: Record<string, unknown> = {};
      const text = await request.text();
      if (text.trim() !== '') {
        try {
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return json(request, { ok: false, errors: ['Request body must be a JSON object'] }, 400);
          }
          body = parsed as Record<string, unknown>;
        } catch {
          return json(request, { ok: false, errors: ['Invalid JSON request body'] }, 400);
        }
      }
      const { includeScenario = true, includeSensitivity = true, ...input } = body;
      const res = evaluateScenario(input as ScenarioInput, {
        includeScenario: Boolean(includeScenario),
        includeSensitivity: Boolean(includeSensitivity),
      });
      return json(request, res, res.ok ? 200 : 400);
    }

    return json(request, { ok: false, error: 'Method not allowed' }, 405);
  }

  if (pathname === '/api/compare') {
    if (isRead) {
      const { input, errors } = parseQueryCalculate(url);
      if (errors.length > 0) return json(request, { ok: false, errors }, 400);
      return json(request, compareProviderMatrix(input), 200);
    }
    if (request.method !== 'POST') {
      return json(request, { ok: false, error: 'Method not allowed' }, 405);
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
            return json(request, { ok: false, errors: ['scenarios must be an array'] }, 400);
          }
          items = maybeScenarios as Array<{ label?: string } & ScenarioInput> | undefined;
        } else {
          return json(request, { ok: false, errors: ['Invalid JSON request body'] }, 400);
        }
      } catch {
        return json(request, { ok: false, errors: ['Invalid JSON request body'] }, 400);
      }
    }
    return json(request, compareScenarios(items), 200);
  }

  if (pathname.startsWith('/api/')) {
    return json(request, { ok: false, error: 'Not found', endpoints: ENDPOINTS }, 404);
  }

  return env ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
}

export default {
  fetch: handleRequest,
};

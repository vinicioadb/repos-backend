import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('./data/repositorios.json', import.meta.url));
const defaultRepositories = JSON.parse(readFileSync(dataPath, 'utf8'));

const requestCounters = new Map();
const requestDurations = new Map();

function metricRoute(pathname) {
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/metrics') {
    return pathname;
  }
  if (pathname === '/api/repositorios') {
    return pathname;
  }
  if (pathname.startsWith('/api/')) {
    return '/api/*';
  }
  return 'other';
}

function escapeMetricLabel(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function recordRequest(method, route, statusCode, durationSeconds) {
  const counterKey = `${method}|${route}|${statusCode}`;
  const durationKey = `${method}|${route}`;
  const counter = requestCounters.get(counterKey) || { method, route, statusCode, value: 0 };
  const duration = requestDurations.get(durationKey) || { method, route, count: 0, sum: 0 };

  counter.value += 1;
  duration.count += 1;
  duration.sum += durationSeconds;
  requestCounters.set(counterKey, counter);
  requestDurations.set(durationKey, duration);
}

function renderMetrics(repositories) {
  const lines = [
    '# HELP easysoft_http_requests_total Total HTTP requests processed by the API.',
    '# TYPE easysoft_http_requests_total counter',
  ];

  for (const metric of requestCounters.values()) {
    lines.push(
      `easysoft_http_requests_total{method="${escapeMetricLabel(metric.method)}",route="${escapeMetricLabel(metric.route)}",status="${metric.statusCode}"} ${metric.value}`,
    );
  }

  lines.push(
    '# HELP easysoft_http_request_duration_seconds HTTP request duration in seconds.',
    '# TYPE easysoft_http_request_duration_seconds summary',
  );
  for (const metric of requestDurations.values()) {
    const labels = `method="${escapeMetricLabel(metric.method)}",route="${escapeMetricLabel(metric.route)}"`;
    lines.push(`easysoft_http_request_duration_seconds_sum{${labels}} ${metric.sum.toFixed(6)}`);
    lines.push(`easysoft_http_request_duration_seconds_count{${labels}} ${metric.count}`);
  }

  const memory = process.memoryUsage();
  lines.push(
    '# HELP easysoft_repositories_total Number of repositories exposed by the catalog.',
    '# TYPE easysoft_repositories_total gauge',
    `easysoft_repositories_total ${repositories.length}`,
    '# HELP easysoft_process_uptime_seconds API process uptime in seconds.',
    '# TYPE easysoft_process_uptime_seconds gauge',
    `easysoft_process_uptime_seconds ${process.uptime().toFixed(3)}`,
    '# HELP easysoft_process_heap_used_bytes Heap memory currently used by the API process.',
    '# TYPE easysoft_process_heap_used_bytes gauge',
    `easysoft_process_heap_used_bytes ${memory.heapUsed}`,
    '',
  );

  return lines.join('\n');
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

export function createApiServer({ repositories = defaultRepositories } = {}) {
  return createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const route = metricRoute(url.pathname);
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      recordRequest(request.method, route, response.statusCode, durationSeconds);
    });

    if (request.method === 'GET' && url.pathname === '/metrics') {
      response.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return response.end(renderMetrics(repositories));
    }

    if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
      return sendJson(response, 200, { status: 'ok' });
    }

    if (request.method === 'GET' && url.pathname === '/api/repositorios') {
      return sendJson(response, 200, {
        ok: true,
        total: repositories.length,
        data: repositories,
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return sendJson(response, 404, { ok: false, error: 'Endpoint no encontrado' });
    }

    return sendJson(response, 404, { ok: false, error: 'Ruta no encontrada' });
  });
}

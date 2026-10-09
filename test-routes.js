#!/usr/bin/env node
/**
 * Automated route-coverage test against the live backend.
 *
 * For every route discovered in src/routes/*.ts, checks:
 *   - No-auth behavior on admin-protected routes (expect 401)
 *   - A GET with a nonexistent numeric ID on parameterized routes (expect 404)
 *   - A POST/PUT with an empty/invalid body on admin-protected write routes
 *     while authenticated (expect 400, not a 500 crash)
 *   - A plain GET on public, non-parameterized list routes (expect 200)
 *
 * This is not exhaustive per-route "valid data" testing (that needs a crafted
 * payload per endpoint) — it is an automated sweep for the two things that
 * matter most: auth is actually enforced, and bad input doesn't crash the
 * server. Results print as a table and are also written to
 * test-results-backend.json.
 *
 * Does not touch .env or delete any real data — only reads, and any writes
 * it triggers (empty/invalid bodies) are expected to be rejected by
 * validation before anything is persisted.
 */

// index.ts mounts routes as router.use('/api/xyz', ...), so the prefixes we
// parse out already include /api — BASE must be just the origin.
const BASE = process.env.API_ORIGIN || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'winresearchcentre2020@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'win@123456';

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

// Map each routes/*.ts file to the mount prefix it's registered under in index.ts
const indexSrc = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
const mountMap = {};
for (const m of indexSrc.matchAll(/import (\w+) from '\.\/(\w+)';/g)) {
  mountMap[m[2]] = m[1]; // filename (no ext) -> import name
}
const prefixMap = {};
for (const m of indexSrc.matchAll(/router\.use\('([^']+)',\s*(\w+)\)/g)) {
  const [, prefix, importName] = m;
  const fileKey = Object.keys(mountMap).find((k) => mountMap[k] === importName);
  if (fileKey) prefixMap[fileKey] = prefix;
}

const routes = [];
for (const file of routeFiles) {
  const key = file.replace(/\.ts$/, '');
  const prefix = prefixMap[key];
  if (!prefix) continue; // not mounted (shouldn't happen)
  const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const re = /router\.(get|post|put|delete|patch)\(\s*'([^']*)'\s*,\s*([^)]*)\)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, method, subpath, rest] = m;
    const requiresAdmin = /requireAdmin/.test(rest);
    const fullPath = (prefix + subpath).replace(/\/+$/, '') || prefix;
    routes.push({ file, method: method.toUpperCase(), path: fullPath, requiresAdmin });
  }
}

console.log(`Discovered ${routes.length} routes across ${routeFiles.length} route files.\n`);

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Admin login failed, cannot test authenticated routes: ' + JSON.stringify(data));
  return data.token;
}

function resolvePath(p) {
  // Substitute :param placeholders with a syntactically-valid but nonexistent id
  return p.replace(/:(\w+)/g, () => '999999999');
}

async function call(method, url, token, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON response, fine */
    }
    return { status: res.status, data };
  } catch (err) {
    return { status: -1, error: String(err) };
  }
}

const results = [];

function record(test, expected, actual, pass, detail) {
  results.push({ test, expected, actual, pass: pass ? 'PASS' : 'FAIL', detail });
}

async function main() {
  const token = await login();
  console.log('Admin login OK.\n');

  for (const route of routes) {
    const url = `${BASE}${resolvePath(route.path)}`;
    const hasParam = route.path.includes(':');
    const label = `${route.method} ${route.path}`;

    // 1. No-auth check on admin-protected routes
    if (route.requiresAdmin) {
      const { status } = await call(route.method, url, null, route.method !== 'GET' ? {} : undefined);
      const pass = status === 401;
      record(`${label} — no auth`, '401', String(status), pass);
    }

    // 2. Nonexistent-ID check (GET with :id param) — only for GET, to avoid
    //    accidentally mutating/deleting anything via a guessed ID on write verbs.
    if (hasParam && route.method === 'GET') {
      const { status } = await call(
        'GET',
        url,
        route.requiresAdmin ? token : null
      );
      const pass = status === 404 || status === 400;
      record(`${label} — nonexistent id`, '404 (or 400)', String(status), pass);
    }

    // 3. Invalid/empty body on admin-protected write routes (authenticated,
    //    bad payload) — must be rejected with 400, not crash with 500.
    if (route.requiresAdmin && ['POST', 'PUT', 'PATCH'].includes(route.method) && !hasParam) {
      const { status } = await call(route.method, url, token, {});
      const pass = status === 400 || status === 404 || status === 422;
      record(`${label} — invalid body (authed)`, '400/422', String(status), pass, status === 500 ? 'SERVER CRASHED' : undefined);
    }

    // 4. Plain GET on public, non-parameterized routes — expect 200
    if (!route.requiresAdmin && route.method === 'GET' && !hasParam) {
      const { status } = await call('GET', url, null);
      const pass = status === 200;
      record(`${label} — public GET`, '200', String(status), pass);
    }
  }

  // Print table
  const colWidths = { test: 70, expected: 12, actual: 10, pass: 6 };
  const pad = (s, w) => String(s).padEnd(w).slice(0, w);
  console.log(pad('TEST', colWidths.test), pad('EXPECTED', colWidths.expected), pad('ACTUAL', colWidths.actual), 'RESULT');
  console.log('-'.repeat(110));
  for (const r of results) {
    console.log(
      pad(r.test, colWidths.test),
      pad(r.expected, colWidths.expected),
      pad(r.actual, colWidths.actual),
      r.pass + (r.detail ? ` (${r.detail})` : '')
    );
  }

  const passCount = results.filter((r) => r.pass === 'PASS').length;
  const failCount = results.length - passCount;
  console.log('-'.repeat(110));
  console.log(`\n${passCount}/${results.length} passed, ${failCount} failed.\n`);

  const failures = results.filter((r) => r.pass === 'FAIL');
  if (failures.length > 0) {
    console.log('FAILURES:');
    for (const f of failures) {
      console.log(`  - ${f.test}: expected ${f.expected}, got ${f.actual}${f.detail ? ' — ' + f.detail : ''}`);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'test-results-backend.json'),
    JSON.stringify({ total: results.length, passed: passCount, failed: failCount, results }, null, 2)
  );
  console.log('\nFull results written to test-results-backend.json');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

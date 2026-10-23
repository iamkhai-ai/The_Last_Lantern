/*
 * The release gate for the `deploy` branch: everything that must be true before a merge is allowed.
 * Run it locally with `npm run verify`; CI runs exactly the same command (.github/workflows/verify.yml).
 *
 *   1. TypeScript compiles with no errors.
 *   2. The Vitest unit tests (every *.test.ts under src/) pass.
 *   3. Every scripts/check-*.mjs passes (each in its own process).
 *   4. The DEMO build (VITE_BUILD_FLAVOR=demo) builds, is a single index.html, really is the demo flavor, and
 *      contains the Coming Soon hand-off the demo ends on.
 *
 * It exits non-zero on the first failing stage and prints which one. It never touches ./dist: the demo build goes to
 * a temporary directory that is removed afterwards.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const started = Date.now();
const stages = [];

function run(label, args, env = {}, quiet = false) {
  const t = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  const seconds = ((Date.now() - t) / 1000).toFixed(1);
  const ok = result.status === 0;
  stages.push({ label, ok, seconds });
  if (!ok) {
    if (quiet) process.stdout.write(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    fail(`${label} failed (exit ${result.status}) after ${seconds}s`);
  }
  return result;
}

function fail(message) {
  console.error(`\nVERIFY FAILED: ${message}`);
  for (const s of stages) console.error(`  ${s.ok ? 'ok  ' : 'FAIL'} ${s.label} (${s.seconds}s)`);
  process.exit(1);
}

// 1. types
console.log('== 1/4 TypeScript');
run('tsc --noEmit', [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit']);

// 2. unit tests
console.log('== 2/4 Vitest');
run('vitest run', [join(root, 'node_modules/vitest/vitest.mjs'), 'run']);

// 3. checks
const checks = readdirSync(join(root, 'scripts')).filter((f) => /^check-.*\.mjs$/.test(f)).sort();
if (checks.length === 0) console.warn('WARNING: no scripts/check-*.mjs found; the check stage is empty');
console.log(`== 3/4 ${checks.length} check scripts`);
for (const file of checks) run(file, [join(root, 'scripts', file)], {}, true);

// 4. demo build
console.log('== 4/4 demo build');
const out = mkdtempSync(join(tmpdir(), 'last-lantern-demo-'));
try {
  run('vite build (demo)', [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir'],
    { VITE_BUILD_FLAVOR: 'demo' });
  const files = readdirSync(out);
  if (files.length !== 1 || files[0] !== 'index.html') fail(`the demo build must be exactly one index.html, got: ${files.join(', ')}`);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  if (!existsSync(join(out, 'index.html')) || statSync(join(out, 'index.html')).size < 1_000_000) fail('the demo bundle is missing or implausibly small');
  // In a demo build the flavor reader returns the literal "demo"; in a full build it is `resolve(void 0)`.
  if (!/typeof\s*[\w$]+\s*>\s*"u"\s*\)\s*\)\s*return\s*"demo"/.test(html)) {
    fail('the built bundle is not the demo flavor (VITE_BUILD_FLAVOR was not applied, or the minified shape changed)');
  }
  if (!html.includes('demo-complete')) fail('the demo bundle has no Coming Soon hand-off (demo-complete)');
  stages.push({ label: 'demo bundle assertions', ok: true, seconds: '0.0' });
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\nVERIFY OK in ${((Date.now() - started) / 1000).toFixed(0)}s`);
for (const s of stages.filter((x) => !checks.includes(x.label))) console.log(`  ok   ${s.label} (${s.seconds}s)`);
console.log(`  ok   ${checks.length} check scripts`);

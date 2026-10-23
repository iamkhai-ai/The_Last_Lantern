/**
 * Runtime localization check.
 *
 * Run:  node scripts/check-i18n-runtime.mjs
 *
 * The catalogue gate is static; this one loads the shipped i18n modules and proves that:
 *  - Vietnamese is the default and returns the authored sentence unchanged;
 *  - English resolves a known line, a `{param}` template, and the speaker labels;
 *  - an unknown key falls back to Vietnamese instead of rendering a blank;
 *  - the locale choice persists under its own storage key and never touches the campaign save.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A minimal localStorage so the locale module can read and write its own key. */
class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
  get size() { return this.#data.size; }
}

globalThis.window = { localStorage: new MemoryStorage() };

/** Load one shipped TypeScript module with a CommonJS-style require for its relatives. */
const moduleCache = new Map();
function loadModule(relativePath, cache = moduleCache) {
  const file = join(rootDir, relativePath);
  if (cache.has(file)) return cache.get(file).exports;
  const source = readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  cache.set(file, module);
  const require = (specifier) => {
    // Relative to the importing file, exactly as the bundler resolves it.
    const target = specifier.startsWith('.') ? join(dirname(file), specifier) : specifier;
    return loadModule(relative(rootDir, target), cache);
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  return module.exports;
}

const locale = loadModule('src/i18n/locale.ts');
const i18n = loadModule('src/i18n/catalog.ts');

const failures = [];
let count = 0;
function check(name, run) {
  count += 1;
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failures.push(name); console.log(`FAIL  ${name}`); console.log(`        ${error.message}`); }
}

check('vietnamese is the default and returns the authored sentence', () => {
  assert.equal(locale.getLocale(), 'vi');
  const line = 'Hành trình mới';
  assert.equal(i18n.tr(line), line);
});

check('english resolves an authored line', () => {
  locale.setLocale('en');
  assert.equal(i18n.tr('Hành trình mới'), 'New Journey');
});

check('english fills {param} templates and leaves unknown placeholders visible', () => {
  const rendered = i18n.tr('Màn chơi {number}', { number: '03' });
  assert.equal(rendered, 'Màn chơi 03', 'unknown key falls back to Vietnamese with params filled');
  const known = i18n.tr('Xung sáng còn {seconds} giây', { seconds: '2.0' });
  assert.equal(known, 'Light Pulse ready in 2.0s');
});

check('an untranslated key degrades to Vietnamese, never to a blank', () => {
  const unknown = 'Câu này chưa có bản dịch.';
  assert.equal(i18n.tr(unknown), unknown);
});

check('speaker identity stays Vietnamese while its label localizes', () => {
  assert.equal(i18n.speakerLabel('Hệ thống'), 'System');
  assert.equal(i18n.speakerLabel('Ký Ức'), 'Memory');
  assert.equal(i18n.speakerLabel('The Shadow'), 'The Shadow');
  assert.equal(i18n.speakerLabel('Nhinh'), 'Nhinh');
  locale.setLocale('vi');
  assert.equal(i18n.speakerLabel('Hệ thống'), 'Hệ thống');
});

check('the locale choice persists under its own key and no campaign save is touched', () => {
  locale.setLocale('en');
  assert.equal(window.localStorage.getItem(locale.LOCALE_STORAGE_KEY), 'en');
  assert.equal(window.localStorage.getItem('last-lantern-campaign-save-v1'), null);
  locale.setLocale('vi');
});

check('storage failure still yields a usable locale', () => {
  const original = globalThis.window.localStorage;
  globalThis.window.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  locale.resetLocaleCacheForTests();
  assert.equal(locale.getLocale(), 'vi');
  locale.setLocale('en');
  assert.equal(locale.getLocale(), 'en');
  globalThis.window.localStorage = original;
  locale.resetLocaleCacheForTests();
});

check('every catalogue entry module is spread into CATALOG, so the runtime can see it', () => {
  const entriesDir = join(rootDir, 'src/i18n/entries');
  const declared = new Set();
  for (const file of readdirSync(entriesDir)) {
    const sf = ts.createSourceFile(file, readFileSync(join(entriesDir, file), 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'entry') {
        declared.add(node.arguments[0].text);
      }
      node.forEachChild(visit);
    };
    visit(sf);
  }
  const loaded = new Set(i18n.CATALOG.map((item) => item.id));
  const unreachable = [...declared].filter((id) => !loaded.has(id));
  assert.deepEqual(unreachable, [], 'entries declared in src/i18n/entries but missing from CATALOG');
  assert.equal(i18n.CATALOG.length, declared.size);
});

check('a build tag and a composed HUD line localize from the catalogue', () => {
  locale.setLocale('en');
  assert.equal(i18n.tr('PLAYTEST BUILD · MÀN 01–10'), 'PLAYTEST BUILD · LEVELS 01–10');
  locale.setLocale('vi');
});

console.log(`\n${count - failures.length}/${count} localization checks passed`);
if (failures.length) process.exit(1);

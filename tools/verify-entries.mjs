/**
 * Verify one translated catalogue module against the shipped sources.
 *
 * Run:  node tools/verify-entries.mjs src/i18n/entries/<name>.ts
 *
 * It fails when a Vietnamese key does not appear byte-for-byte in `src/` (a mistyped or mojibake key
 * would silently never be used) or when the file contains classic mojibake markers.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!target) {
  console.error('usage: node tools/verify-entries.mjs <entries-file>');
  process.exit(2);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const raw = readFileSync(join(rootDir, target), 'utf8');
const mojibake = /Ã|Â|ï¿½|â€/.test(raw);
const ast = ts.createSourceFile(join(rootDir, target), raw, ts.ScriptTarget.Latest, true);
const entries = [];
const visit = (node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'entry') {
    const [id, vi, en] = node.arguments;
    if (id && vi && en && ts.isStringLiteral(id) && ts.isStringLiteral(vi) && ts.isStringLiteral(en)) {
      entries.push({ id: id.text, vi: vi.text, en: en.text });
    }
  }
  node.forEachChild(visit);
};
visit(ast);

const sourceText = walk(join(rootDir, 'src'))
  .filter((file) => !relative(rootDir, file).replaceAll('\\', '/').startsWith('src/i18n/'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const seen = new Set();
const problems = [];
for (const item of entries) {
  if (seen.has(item.vi)) problems.push(`${item.id}: duplicate Vietnamese key`);
  seen.add(item.vi);
  if (!sourceText.includes(item.vi)) problems.push(`${item.id}: key not found in src/: ${item.vi}`);
  if (item.en.trim() === '') problems.push(`${item.id}: empty English`);
}

console.log(`${target}: ${entries.length} entries`);
console.log(`mojibake markers: ${mojibake ? 'FOUND' : 'none'}`);
if (problems.length || mojibake) {
  console.log(`FAIL (${problems.length + (mojibake ? 1 : 0)})`);
  for (const problem of problems.slice(0, 20)) console.log(`  ${problem}`);
  process.exit(1);
}
console.log('PASS');

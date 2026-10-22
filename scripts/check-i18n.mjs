/**
 * Localization gate.
 *
 * Run with:  node scripts/check-i18n.mjs [--strict]
 *
 * Reads the shipped sources with the TypeScript compiler API — no module loading, no Phaser — and
 * checks the catalogue against what the game can actually display:
 *
 *  - every `tr('…')` literal argument has an entry;
 *  - every dialogue line authored as `{ speaker, text }` has an entry (template literals are counted
 *    as dynamic and reported, because they are composed at runtime and cannot be looked up);
 *  - every authored speaker id has a `speakerLabel` mapping;
 *  - the catalogue itself has no duplicate id, duplicate Vietnamese key, or empty English;
 *  - entries whose Vietnamese key no longer appears in `src/` are reported as orphans.
 *
 * Without `--strict` the gate fails only on structural errors and broken references; with
 * `--strict` (used by the final task) missing translations and orphans fail too.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(rootDir, 'src');
const STRICT = process.argv.includes('--strict');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const isText = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
const text = (node) => (isText(node) ? node.text : null);

/** ---- catalogue ------------------------------------------------------ */

const catalogueFiles = walk(join(SRC, 'i18n', 'entries'));
const entries = [];
const catalogueProblems = [];

for (const file of catalogueFiles) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'entry') {
      const [id, vi, en] = node.arguments;
      const heading = `${relative(rootDir, file).replaceAll('\\', '/')}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`;
      if (!isText(id) || !isText(vi) || !isText(en)) {
        catalogueProblems.push(`${heading}: entry() arguments must be string literals`);
      } else {
        entries.push({ id: id.text, vi: vi.text, en: en.text, heading });
      }
    }
    node.forEachChild(visit);
  };
  visit(ast);
}
assert.ok(entries.length > 0, 'the catalogue still exports at least one entry');

const byVi = new Map();
const byId = new Map();
for (const item of entries) {
  if (byId.has(item.id)) catalogueProblems.push(`duplicate id "${item.id}" (${byId.get(item.id).heading} and ${item.heading})`);
  byId.set(item.id, item);
  if (byVi.has(item.vi)) catalogueProblems.push(`duplicate Vietnamese key at ${item.heading} and ${byVi.get(item.vi).heading}: "${item.vi}"`);
  byVi.set(item.vi, item);
  if (item.en.trim() === '') catalogueProblems.push(`${item.id}: empty English`);
  if (/\{[a-zA-Z_]+\}/.test(item.vi) !== /\{[a-zA-Z_]+\}/.test(item.en)) {
    catalogueProblems.push(`${item.id}: placeholder mismatch between Vietnamese and English`);
  }
}

/** ---- sources -------------------------------------------------------- */

const sourceFiles = walk(SRC).filter((file) => !relative(SRC, file).startsWith('i18n'));
const trKeys = [];
const dialogueTexts = [];
const dynamicSites = [];
const speakers = new Set();
const allLiteralTexts = new Set();
const untranslatedCopy = [];
const VIETNAMESE_COPY = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const rel = relative(rootDir, file).replaceAll('\\', '/');
  const lineOf = (node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr') {
      const first = node.arguments[0];
      if (isText(first)) trKeys.push({ key: first.text, where: `${rel}:${lineOf(node)}` });
      else dynamicSites.push(`${rel}:${lineOf(node)} tr() argument is not a literal`);
    }

    if (ts.isObjectLiteralExpression(node)) {
      const speakerProp = node.properties.find((p) => ts.isPropertyAssignment(p) && p.name && p.name.text === 'speaker');
      const textProp = node.properties.find((p) => ts.isPropertyAssignment(p) && p.name && p.name.text === 'text');
      if (speakerProp && textProp) {
        const speaker = text(speakerProp.initializer);
        if (speaker) speakers.add(speaker);
        const value = textProp.initializer;
        // A line may be authored as a literal or wrapped as tr('literal'); both are the same catalogue key.
        const wrapped = ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'tr'
          && isText(value.arguments[0]) ? value.arguments[0] : null;
        if (isText(value)) dialogueTexts.push({ key: value.text, where: `${rel}:${lineOf(textProp)}` });
        else if (wrapped) dialogueTexts.push({ key: wrapped.text, where: `${rel}:${lineOf(textProp)}` });
        else if (ts.isTemplateExpression(value) || ts.isBinaryExpression(value)) {
          dynamicSites.push(`${rel}:${lineOf(textProp)} dialogue text is composed at runtime`);
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(ast);

  /** Every Vietnamese literal that can reach the screen must be a catalogue key or sit inside tr(). */
  const scanCopy = (node, insideTr) => {
    const callsTr = ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr';
    const isPiece = isText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
    if (isPiece) {
      allLiteralTexts.add(node.text);
      // Speaker ids and their conditional alternatives are labelled by speakerLabel(), not tr().
      const speakerOwner = ts.isConditionalExpression(node.parent) ? node.parent.parent : node.parent;
      const isSpeaker = ts.isPropertyAssignment(speakerOwner) && speakerOwner.name.getText(ast) === 'speaker';
      // Type-level unions and object keys (e.g. a colour table keyed by speaker) are identifiers, not copy.
      const isTypeOrKey = ts.isLiteralTypeNode(node.parent) || (ts.isPropertyAssignment(node.parent) && node.parent.name === node);
      if (VIETNAMESE_COPY.test(node.text) && !insideTr && !isSpeaker && !isTypeOrKey && !byVi.has(node.text)) {
        untranslatedCopy.push(`${rel}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1} "${node.text.slice(0, 80)}"`);
      }
    }
    node.forEachChild((child) => scanCopy(child, insideTr || callsTr));
  };
  scanCopy(ast, false);
}

/** speakerLabel table, read from the catalogue module so the check cannot drift from the code. */
const catalogSource = readFileSync(join(SRC, 'i18n', 'catalog.ts'), 'utf8');
const labeledSpeakers = new Set([...catalogSource.matchAll(/^\s*'([^']+)':\s*'/gm)].map((m) => m[1]));

/** ---- verdicts ------------------------------------------------------- */

const failures = [];
const missingTr = trKeys.filter((item) => !byVi.has(item.key));
const missingDialogue = dialogueTexts.filter((item) => !byVi.has(item.key));
const missingSpeaker = [...speakers].filter((speaker) => speaker !== 'Nhinh' && speaker !== 'Lumo' && !labeledSpeakers.has(speaker));

/* A key is live when its Vietnamese text appears anywhere in src, including data tables that tr() reads at render. */
const orphans = entries.filter((item) => !allLiteralTexts.has(item.vi));

for (const problem of catalogueProblems) failures.push(problem);
for (const item of missingTr) failures.push(`${item.where}: no entry for tr("${item.key}")`);
if (STRICT) {
  for (const item of missingDialogue) failures.push(`${item.where}: no entry for dialogue "${item.key}"`);
  for (const item of orphans) failures.push(`${item.heading}: orphan entry (Vietnamese key not found in src/) "${item.vi}"`);
  for (const site of untranslatedCopy) failures.push(`${site}: Vietnamese copy with no catalogue entry and no tr() wrapper`);
}
for (const speaker of missingSpeaker) failures.push(`speaker "${speaker}" has no speakerLabel() mapping`);

const coverage = dialogueTexts.length === 0 ? 100 : Math.round(((dialogueTexts.length - missingDialogue.length) / dialogueTexts.length) * 1000) / 10;

console.log(`catalogue entries: ${entries.length}`);
console.log(`tr() literals: ${trKeys.length} (missing ${missingTr.length})`);
console.log(`dialogue lines: ${dialogueTexts.length} (missing ${missingDialogue.length}, coverage ${coverage}%)`);
console.log(`dynamic sites: ${dynamicSites.length}`);
console.log(`authored speakers: ${speakers.size}`);
if (missingDialogue.length && !STRICT) {
  const byFile = new Map();
  for (const item of missingDialogue) {
    const file = item.where.split(':')[0];
    byFile.set(file, (byFile.get(file) ?? 0) + 1);
  }
  console.log('missing dialogue by file:');
  for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(4)} ${file}`);
}
if (dynamicSites.length) {
  console.log('dynamic (runtime-composed) sites — these need a {param} template:');
  for (const site of dynamicSites.slice(0, 40)) console.log(`  ${site}`);
  if (dynamicSites.length > 40) console.log(`  … ${dynamicSites.length - 40} more`);
}

if (failures.length) {
  console.log(`\nFAIL (${failures.length})`);
  for (const failure of failures.slice(0, Number(process.env.FAIL_LIMIT ?? 60))) console.log(`  ${failure}`);
  if (failures.length > 60) console.log(`  … ${failures.length - 60} more`);
  process.exit(1);
}
console.log(`\nPASS${STRICT ? ' (strict)' : ''}`);

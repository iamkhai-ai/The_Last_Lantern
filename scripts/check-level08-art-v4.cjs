/** Read-only decoded-pixel and provenance audit of the Level 08 depth pack. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { raw, bounds } = require('./export-level08-art.cjs');
const ROOT = path.resolve(__dirname, '..');
const ART = 'assets/levels/08-ruins-of-two-halves/redesign-v4';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));

async function main() {
  const manifestBytes = await read(ART + '/production-manifest.json');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.exports.length, 32);
  const families = new Map();
  for (const e of manifest.exports) {
    const png = await read(ART + '/' + e.file);
    assert.equal(sha(png), e.sha256, e.file + ': export hash');
    assert.equal(png[25], 6, e.file + ': RGBA type 6');
    const { data, info } = await raw(png);
    assert.deepEqual([info.width, info.height], e.canvas);
    assert.deepEqual(bounds(data, info.width, info.height), e.opaque_box);
    const colours = new Set(), alpha = new Set();
    if (!families.has(e.family)) families.set(e.family, new Set());
    for (let i = 0; i < data.length; i += 4) {
      alpha.add(data[i + 3]);
      if (data[i + 3]) {
        const rgb = data.subarray(i, i + 3).toString('hex');
        colours.add(rgb); families.get(e.family).add(rgb);
      }
    }
    assert.deepEqual([...alpha].sort(), e.alpha, e.file + ': decoded alpha');
    assert.ok([...alpha].every(a => a === 0 || a === 255));
    assert.equal(alpha.has(0), !e.file.includes('temple-scene-base'));
    assert.equal(colours.size, e.colours);
    if (e.file.includes('mirror_')) {
      let occupied = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]) occupied++;
      assert.ok(occupied < info.width * info.height * 0.55, 'no opaque mirror backing card');
      assert.ok(e.opaque_box.left >= 2 && e.opaque_box.top >= 4);
      assert.ok(e.opaque_box.left + e.opaque_box.width <= 34);
      assert.equal(e.opaque_box.top + e.opaque_box.height, 48, 'mirror feet stay anchored');
    }
  }
  for (const e of manifest.exports) {
    const count = families.get(e.family).size;
    assert.equal(count, e.family_colours, e.family + ': measured shared palette');
    assert.ok(count <= 128, e.family + ': palette budget');
  }
  for (const e of [...manifest.sources, ...manifest.references, ...manifest.protected])
    assert.equal(sha(await read(e.file)), e.sha256, e.file + ': source/reference/protected hash');
  // Authoring scripts are hashed as text, so accept either line ending: git autocrlf checkouts write CRLF.
  for (const [file, hash] of Object.entries(manifest.authoring_sha256)) {
    const bytes = await read(file);
    const text = bytes.toString('utf8');
    const variants = [bytes, Buffer.from(text.replace(/\r\n/g, '\n')), Buffer.from(text.replace(/\r?\n/g, '\r\n'))];
    assert.ok(variants.some((v) => sha(v) === hash), file + ': authoring hash');
  }
  const browser = JSON.parse(await read(ART + '/browser-inspection.json'));
  assert.equal(browser.result, 'PASS');
  assert.equal(browser.production_manifest_sha256, sha(manifestBytes), 'browser uses the current manifest');
  for (const [file, hash] of Object.entries(browser.source_and_sprite_sha256))
    assert.equal(sha(await read(file)), hash, file + ': browser input hash');
  for (const study of browser.studies) {
    assert.deepEqual(study.browser_errors, []);
    assert.equal(sha(await read(ART + '/previews/' + study.id + '-640x360.png')), study.screenshot_sha256);
  }
  // RULE_GAMES §1: the left mirror is probed from four sides and two far points; the right mirror from three sides
  // and one far point (its east face is walled in by the altar).
  const approaches = browser.studies[0].approaches;
  assert.equal(approaches.filter(a => a.side === 'left' && !a.direction.startsWith('far')).length, 4, 'left mirror: four sides');
  assert.equal(approaches.filter(a => a.side === 'right' && !a.direction.startsWith('far')).length, 3, 'right mirror: three walkable sides');
  assert.equal(approaches.filter(a => a.direction.startsWith('far')).length, 3, 'far points outside the 8px gap');
  for (const a of approaches) {
    if (a.direction.startsWith('far')) assert.equal(a.after, a.before, `${a.side} ${a.direction}: no rotation`);
    else assert.equal(a.target, 'l7-mirror-' + a.side, `${a.side} ${a.direction}: prompt within 8px`);
  }
  console.log('PASS: decoded 32 PNGs, shared palettes, mirror transparency, all provenance hashes and current browser evidence.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Minimal PNG reader: size, colour type and the bounding box of every non-transparent pixel. */
export function readPng(path) {
  const data = readFileSync(path);
  assert.equal(data.subarray(1, 4).toString('latin1'), 'PNG', `${path} is a PNG`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  const idat = [];
  let palette = null; let trns = null;
  for (let offset = 8; offset < data.length;) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString('latin1');
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idat.push(body);
    else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  assert.ok(channels && bitDepth === 8, `${path}: supported PNG layout (colour type ${colorType}, depth ${bitDepth})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = [];
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let add = 0;
      if (filter === 1) add = left;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const dl = Math.abs(estimate - left); const du = Math.abs(estimate - up); const dul = Math.abs(estimate - upLeft);
        add = dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      }
      line[x] = (line[x] + add) & 255;
    }
    rows.push(line);
    previous = line;
  }
  const alphaAt = (x, y) => {
    const line = rows[y];
    if (colorType === 6) return line[x * 4 + 3];
    if (colorType === 4) return line[x * 2 + 1];
    if (colorType === 3) return trns ? (trns[line[x]] ?? 255) : 255;
    return 255;
  };
  let minX = width; let minY = height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alphaAt(x, y) <= 8) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  void palette;
  return { width, height, colorType, bbox: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}


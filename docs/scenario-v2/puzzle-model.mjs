#!/usr/bin/env node
/**
 * Design-time puzzle model for the Levels 05–10 redesign (docs/scenario-v2/).
 *
 * This is NOT a check of the shipped game. It models the puzzle rules abstractly so the proposed
 * scenarios can be compared with the current ones before any code changes:
 *
 *   1. Level 05, current rules (v1) versus the proposal (v2): reachable states, soft-lock search,
 *      shortest solution, and the legal non-optimal moves the player can make along that solution
 *      (a "mistake" here is a legal move that lengthens the remaining solution; the penalty is how
 *      many extra actions it costs).
 *   2. Levels 06, 08, 09, 10: configuration space of the light puzzles (from the truth tables in
 *      docs/implementation/0X-layout.md) — how many configurations exist and how many solve.
 *      Level 09 also compares all 512 modeled configurations with the current pure game function.
 *      Counts assume a lit, placed lamp; they do not measure player difficulty or solve distance.
 *
 * Run: node docs/scenario-v2/puzzle-model.mjs
 * Uses Node's TypeScript support, as do the repository's existing .mjs checks.
 * Exits nonzero if Level 05 v2 is unsolvable/soft-locked, a light table has no solution, or L09 drifts.
 */

import assert from 'node:assert/strict';
import { deriveObservatoryState } from '../../src/systems/ObservatoryPuzzle.ts';
import { OBSERVATORY_LUMO_WAYPOINTS } from '../../src/data/observatoryRooms.ts';

// ------------------------------------------------------------------------------------------------
// Level 05 — abstract model
// Rooms: E (Buồng Dẫn Nước), R (Buồng Chuyển Dòng), K (Hành Lang Mực).
// Lumo: 'F' (đi theo Nhinh) or holding plate 'A' | 'B' | 'C'.
// Lumo travels through pipes, never through doors, so his moves are independent of door state.
// A door is open while Lumo holds its plate or once it is latched. Walking within a room is free;
// counted actions are E presses, F presses and room transitions.
// The optional practice alcove is left out: it never changes main progress (decision D1).
// ------------------------------------------------------------------------------------------------

const key = (s) => `${s.room}|${s.lumo}|${+s.lA}${+s.lB}${+s.lC}|${+s.ink}|${+s.done}`;

function l05Actions(spec, s) {
  if (s.done) return [];
  const out = [];
  const push = (label, patch) => out.push([label, { ...s, ...patch }]);
  const latched = { A: s.lA, B: s.lB, C: s.lC };
  const open = { A: s.lA || s.lumo === 'A', B: s.lB || s.lumo === 'B' };

  for (const call of spec.calls[s.room]) {
    push(`E mốc ${call.label} (${s.room})`, spec.press(s, call.target, latched));
  }
  if (s.room === 'R' && !s.lA) push('E chốt A', s.lumo === 'A' ? { lA: true } : {});
  if (s.room === 'K' && !s.lB) push('E chốt B', s.lumo === 'B' ? { lB: true } : {});
  if (s.room === 'K' && !s.lC) push('E chốt C', spec.canLatchC(s) ? { lC: true } : {});
  if (s.room === 'K' && s.lC && s.lumo !== 'F') push('E tay C: gọi Lumo về', { lumo: 'F' });
  if (spec.needsInk && s.room === 'K' && !s.ink) push('F tắt đèn, đi qua hành lang', { ink: true });
  if (s.room === 'E' && open.A) push('qua cửa A → R', { room: 'R' });
  if (s.room === 'R' && open.A) push('qua cửa A → E', { room: 'E' });
  if (s.room === 'R' && open.B) push('qua cửa B → K', { room: 'K' });
  if (s.room === 'K' && open.B) push('qua cửa B → R', { room: 'R' });
  if (s.room === 'K' && s.lC && s.lumo === 'F') push('E cầu thang', { done: true });
  // Drop no-ops: a press that changes nothing is a refusal line, not a move.
  return out.filter(([label, next]) => key(next) !== key(s) && !(spec.forbid ?? []).includes(label));
}

/** v1 — the shipped controller (PathForTwoLevel.interact / choosePathCallAction). */
const L05_V1 = {
  name: 'Màn 05 hiện tại (v1)',
  needsInk: true,
  calls: {
    E: [{ label: 'A', target: 'A' }],
    R: [{ label: 'A (phía xa)', target: 'A' }, { label: 'B', target: 'B' }],
    K: [{ label: 'B (phía xa)', target: 'B' }, { label: 'C', target: 'C' }],
  },
  press(s, target, latched) {
    if (latched[target]) return {};                                   // LATCHED_CALL_LINES
    const eligible = target === 'A' || (target === 'B' && s.lA) || (target === 'C' && s.lB);
    if (s.lumo === target) return { lumo: 'F' };                       // recall
    if (s.lumo !== 'F' && !eligible) return { lumo: 'F' };             // choosePathCallAction → recall
    if (!eligible) return {};                                          // NEXT_MARK_UNLATCHED
    return { lumo: target };
  },
  canLatchC: (s) => s.lB && s.ink && s.lumo === 'C',                   // latchCBlockReason
};

/**
 * v2 — the proposal (docs/scenario-v2/05-a-path-for-two.md §4).
 * Each call is in the room BEFORE the room of its plate: the "··" call is in E, the "···" call is
 * in R. The far-side calls stay for recovery. No refusal: any call sends Lumo; a door left without
 * a latch simply closes once he leaves its plate. The ink is information (where the ··· call is),
 * not a gate, so it is not part of the state.
 */
const L05_V2 = {
  name: 'Màn 05 đề xuất (v2)',
  needsInk: false,
  calls: {
    E: [{ label: '· (A)', target: 'A' }, { label: '·· (B)', target: 'B' }],
    R: [{ label: '· phía xa (A)', target: 'A' }, { label: '··· (C)', target: 'C' }],
    K: [{ label: '·· phía xa (B)', target: 'B' }],
  },
  press(s, target, latched) {
    if (latched[target]) return {};
    if (s.lumo === target) return { lumo: 'F' };
    return { lumo: target };
  },
  canLatchC: (s) => s.lumo === 'C',
};

function analyseL05(spec) {
  const start = { room: 'E', lumo: 'F', lA: false, lB: false, lC: false, ink: false, done: false };
  const nodes = new Map();
  const edges = new Map();
  const queue = [start];
  nodes.set(key(start), start);
  while (queue.length) {
    const s = queue.shift();
    const list = l05Actions(spec, s);
    edges.set(key(s), list.map(([label, next]) => [label, key(next)]));
    for (const [, next] of list) {
      if (!nodes.has(key(next))) { nodes.set(key(next), next); queue.push(next); }
    }
  }
  // distance to goal (reverse BFS)
  const reverse = new Map([...nodes.keys()].map((k) => [k, []]));
  for (const [from, list] of edges) for (const [, to] of list) reverse.get(to).push(from);
  const dist = new Map();
  const goalQueue = [];
  for (const [k, s] of nodes) if (s.done) { dist.set(k, 0); goalQueue.push(k); }
  while (goalQueue.length) {
    const k = goalQueue.shift();
    for (const from of reverse.get(k)) if (!dist.has(from)) { dist.set(from, dist.get(k) + 1); goalQueue.push(from); }
  }
  const softLocks = [...nodes.keys()].filter((k) => !dist.has(k));
  // shortest solution
  const path = [];
  let current = key(start);
  while (dist.has(current) && dist.get(current) > 0) {
    const best = edges.get(current).find(([, to]) => dist.get(to) === dist.get(current) - 1);
    path.push(best[0]);
    current = best[1];
  }
  // A non-optimal move that one move undoes (walk back through the same door, re-call Lumo to the
  // plate he just left) is exploration. A trap is a non-optimal move that NO single move undoes —
  // typically a door closing behind Nhinh because Lumo left an unlatched plate.
  const traps = [];
  for (const [from, list] of edges) {
    if (!dist.has(from)) continue;
    for (const [label, to] of list) {
      const penalty = dist.get(to) + 1 - dist.get(from);
      if (penalty <= 0) continue;
      const undone = edges.get(to).some(([, back]) => back === from);
      if (!undone) traps.push({ from: nodes.get(from), label, penalty });
    }
  }
  traps.sort((a, b) => b.penalty - a.penalty);
  return { spec, states: nodes.size, softLocks, optimal: dist.get(key(start)), path, traps };
}

const describe = (s) => `ở ${s.room}, Lumo ${s.lumo === 'F' ? 'đi theo' : 'giữ ấn ' + s.lumo}, chốt ${['A', 'B', 'C'].filter((m) => s['l' + m]).join('') || '—'}`;

function reportL05(result) {
  const maxPenalty = result.traps.reduce((m, x) => Math.max(m, x.penalty), 0);
  console.log(`\n${result.spec.name}`);
  console.log(`  trạng thái tới được : ${result.states}`);
  console.log(`  trạng thái kẹt      : ${result.softLocks.length}${result.softLocks.length ? ' → ' + result.softLocks.join(', ') : ''}`);
  console.log(`  lời giải ngắn nhất  : ${result.optimal} hành động`);
  result.path.forEach((label, i) => console.log(`    ${String(i + 1).padStart(2)}. ${label}`));
  console.log(`  bước sai không đảo lại được bằng 1 bước: ${result.traps.length}, phạt lớn nhất +${maxPenalty}`);
  for (const t of result.traps) console.log(`    - ${describe(t.from)}: ${t.label} → +${t.penalty}`);
  return result.softLocks.length === 0 && Number.isFinite(result.optimal);
}

// ------------------------------------------------------------------------------------------------
// Levels 06, 08, 09, 10 — configuration space of the light puzzles
// Truth tables copied from docs/implementation/06-layout.md, 08-layout.md, 09-layout.md, 10-layout.md.
// ------------------------------------------------------------------------------------------------

function* product(...ranges) {
  if (!ranges.length) { yield []; return; }
  const [first, ...rest] = ranges;
  for (const v of first) for (const tail of product(...rest)) yield [v, ...tail];
}
const range = (n) => [...Array(n).keys()];

function configSpace(name, ranges, conditions, liveConditions) {
  let total = 0; let solved = 0; let twoOfThree = 0;
  for (const values of product(...ranges)) {
    total += 1;
    const modeled = conditions.map((c) => c(...values));
    if (liveConditions) {
      assert.deepEqual(modeled, liveConditions(...values), `${name}: model/live mismatch at ${JSON.stringify(values)}`);
    }
    const met = modeled.filter(Boolean).length;
    if (met === conditions.length) solved += 1;
    else if (met === conditions.length - 1) twoOfThree += 1;
  }
  assert.ok(solved > 0, `${name}: no solving configuration`);
  console.log(`  ${name.padEnd(28)} ${String(total).padStart(4)} cấu hình · ${solved} đúng · ${String(twoOfThree).padStart(3)} thỏa đúng ${conditions.length - 1}/${conditions.length} điều kiện · ${conditions.length} điều kiện đồng thời`);
}

function reportLightPuzzles() {
  console.log('\nKhông gian cấu hình ánh sáng (đèn đã đặt và đang bật; Lumo gồm cả giữ ấn và rời ấn)');
  // L06: G0 0 prism / 1 to A / 2 to B; G1 pose 2 aims A; G2 pose 1 aims B; C = Lumo on seal.
  configSpace('Màn 06 (G0,G1,G2,Lumo)', [range(3), range(3), range(3), range(2)], [
    (g0, g1) => g0 === 1 || (g0 === 0 && g1 === 2),
    (g0, g1, g2) => g0 === 2 || (g0 === 0 && g2 === 1),
    (g0, g1, g2, lumo) => lumo === 1,
  ]);
  // L08: statue 0 shades the Moon lock; statue 2 blocks the left branch, 3 the right; left mirror 1, right 0.
  configSpace('Màn 08 (tượng,gương T,gương P)', [range(4), range(4), range(4)], [
    (s, l) => l === 1 && s !== 2,
    (s, l, r) => r === 0 && s !== 3,
    (s) => s === 0,
  ]);
  // L09 bridge: Sun lock lit, root bed shadowed (split + statue 2), Lumo at the seal. Door A needs G0=0
  // first and a latch before G0 can turn to 1 — an ordering constraint on top of this table.
  configSpace('Màn 09 (G0,G1,G2,tượng,Lumo)', [range(4), range(4), range(4), range(4), range(2)], [
    (g0, g1, g2, st, lumo) => lumo === 1 && g0 === 1 && g1 === 2 && (g2 === 0 || g2 === 1),
    (g0, g1, g2, st, lumo) => lumo === 1 && g0 === 1 && g1 === 2 && g2 === 1 && st === 2,
    (g0, g1, g2, st, lumo) => lumo === 1,
  ], (g0, g1, g2, st, lumo) => {
    const live = deriveObservatoryState({
      mirrorRotations: { g0, g1, g2 },
      statueOrientation: st,
      lanternOn: true,
      lanternPlaced: true,
      doorALatched: true,
      lumoPosition: lumo === 1 ? OBSERVATORY_LUMO_WAYPOINTS['lumo-seal'] : null,
      lumoRoute: {
        destinationWaypointId: lumo === 1 ? 'lumo-seal' : null,
        arrivedAtWaypointId: lumo === 1 ? 'lumo-seal' : null,
      },
    });
    return [live.sunDoorUnlocked, live.rootBedShadowed, live.lumoAtSeal];
  });
  // L10: memory, hope, balance must hold together.
  configSpace('Màn 10 (G0,Ký Ức,Cân Bằng,tượng,Lumo)', [range(2), range(4), range(4), range(4), range(2)], [
    (g0, mem, bal, st, lumo) => lumo === 1 && (g0 === 1 || (g0 === 0 && mem === 1)),
    (g0, mem, bal, st, lumo) => lumo === 1,
    (g0, mem, bal, st) => g0 === 0 && bal === 2 && st !== 1 && st !== 3 && st === 2,
  ]);
}

/**
 * v1 with its text-only gates removed: every call sends Lumo, and latch C no longer refuses with
 * "Cửa B cần được gài trước" (latchCBlockReason). Isolates what the latches do physically.
 */
const L05_V1_NO_REFUSAL = {
  ...L05_V1,
  name: 'Màn 05 hiện tại, bỏ câu từ chối',
  press(s, target, latched) {
    if (latched[target]) return {};
    if (s.lumo === target) return { lumo: 'F' };
    return { lumo: target };
  },
  canLatchC: (s) => s.ink && s.lumo === 'C',
};

/** Is a latch logically required? Solve again with that latch action forbidden. */
function reportLatchNecessity() {
  console.log('\nChốt có thật sự cần không? (giải lại khi cấm gài chốt đó)');
  for (const spec of [L05_V1, L05_V1_NO_REFUSAL, L05_V2]) {
    const cells = ['A', 'B'].map((m) => {
      const r = analyseL05({ ...spec, forbid: [`E chốt ${m}`] });
      return `chốt ${m}: ${Number.isFinite(r.optimal) ? 'KHÔNG cần (vẫn giải được)' : 'cần'}`;
    });
    console.log(`  ${spec.name.padEnd(34)} ${cells.join(' · ')}`);
  }
}

const v1 = analyseL05(L05_V1);
const v2 = analyseL05(L05_V2);
reportL05(v1);
const v2ok = reportL05(v2);
reportLatchNecessity();
reportLightPuzzles();
if (!v2ok) { console.error('\nv2 model FAILED: soft-lock or unsolvable'); process.exit(1); }
console.log('\nv2 model OK: solvable from the start, no reachable soft-lock.');

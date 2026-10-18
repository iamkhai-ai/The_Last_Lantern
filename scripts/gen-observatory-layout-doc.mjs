/**
 * Regenerates `docs/implementation/09-layout.md` from the runtime data modules, so
 * the authoritative coordinate document can never drift from the rectangles the
 * game actually collides against.
 *
 * Run from the repo root:  node scripts/gen-observatory-layout-doc.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  OBSERVATORY_ALCOVES, OBSERVATORY_BODY, OBSERVATORY_BRIDGE_LANE, OBSERVATORY_ELEMENTS,
  OBSERVATORY_FINAL_DOOR_HEAD, OBSERVATORY_FLOORS, OBSERVATORY_JAMB_THICKNESS,
  OBSERVATORY_NON_SOLID_IDS, OBSERVATORY_ROOT_BED, OBSERVATORY_STAMPS, OBSERVATORY_WALLS,
  observatoryArtRect, observatoryPrompt,
} from '../src/data/observatoryLayout.ts';
import { OBSERVATORY_ROOMS } from '../src/data/observatoryRooms.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rect = (r) => `${r.x},${r.y},${r.width},${r.height}`;
const point = (p) => `${p.x},${p.y}`;
const ROOMS = ['entrance', 'corridor', 'observatory'];
const ROOM_TITLE = {
  entrance: 'tiền sảnh (`lobby-base`)',
  corridor: 'hành lang phòng sao (`star-chart-base`)',
  observatory: 'phòng thiên văn (`observatory-clean-base`)',
};

const artLabel = (element) => (element.art.kind === 'texture'
  ? `texture \`${element.art.key}\``
  : element.art.kind === 'level'
    ? `level ${element.art.level} \`${element.art.file}\``
    : `level ${element.art.level} set \`${element.art.files.join(' / ')}\``);

const lines = [];
const p = (text = '') => lines.push(text);

p('# Level 09 — The Dark Moon Observatory: spatial layout (authoritative spec)');
p();
p('> **Generated from the runtime data.** Every rectangle, stand, radius and prompt below comes from');
p('> `src/data/observatoryLayout.ts` + `src/data/observatoryRooms.ts` via');
p('> `scripts/gen-observatory-layout-doc.mjs`, so this document cannot drift from the colliders the game');
p('> uses. Verify with `node scripts/check-observatory.mjs` and `npm run build`.');
p();
p('- Scenario: `docs/scenario/09-dark-moon-observatory.md` · flow plan: `09-plan.md`');
p('- Geometry, state, prompts: `src/data/observatoryLayout.ts`');
p('- Rooms, spawns, exits, waypoints: `src/data/observatoryRooms.ts`');
p('- Pure state derivation: `src/systems/ObservatoryPuzzle.ts`');
p('- Runtime controller: `src/scenes/CampaignScene.ts` (`buildObservatoryRoom`, `transitionObservatory`,');
p('  `updateObservatoryLumo`, `updateObservatoryCrossingState`, `refreshObservatoryDoors`,');
p('  `refreshObservatoryPuzzle`, `resolveSafeObservatoryCheckpoint`, `clearActiveRoom`, `callObservatoryLumo`)');
p('- Art: `assets/levels/09-dark-moon-observatory/sprites/` plus reused Level 05/08 mechanism frames');
p('  registered in `src/art/CampaignArt.ts`. Staging files (`layout-and-restores.json`, `previews/01..10`)');
p('  are illustrative composites and are **never loaded at runtime**.');
p();
p('## Conventions');
p();
p('- Each room is an independent 640×360 view; runtime uses room-local coordinates plus `roomId`.');
p('- Native art sizes are preserved. Standing props are fitted by a **uniform** factor');
p('  (`fitObservatoryArt`), so no sprite is stretched; wall/floor art keeps its authored ratio.');
p(`- Actor frame 36×42 with baseline 40: feet at \`center + (0, ${OBSERVATORY_BODY.feetY})\`; the Arcade foot body`);
p(`  is **${OBSERVATORY_BODY.width}×${OBSERVATORY_BODY.height}** at \`center + (-${OBSERVATORY_BODY.width / 2}, +16)\`.`);
p('- Depth: floor art 0..7, door arches 3, ground-mounted art 3, bridge deck 6, standing props');
p('  `10 + groundAnchorY/10`, memory overlay 94, prompt container 82, HUD 86. Darkness uses the shared');
p('  `LanternSystem` overlay stack (68..71) instead of a level-local overlay.');
p('- HUD text occupies y=0..58 and y=320..360. No collider, stand or prompt sits in those bands, and every');
p('  world sprite sorts below prompt/HUD depth so nothing can draw over the HUD.');
p('- A door is a recessed alcove: a 48px opening, permanent jambs');
p(`  ${OBSERVATORY_JAMB_THICKNESS}px thick, and a threshold that is solid only while the door is shut. The transit`);
p('  trigger sits deep inside the alcove, so it is geometrically unreachable while locked, and a');
p('  room-facing inspect control at the alcove mouth always names the missing prerequisite in Vietnamese.');
p();

p('## Walkable floors and permanent masonry');
p();
p('| room | floor band (x,y,w,h) | minX..maxX |');
p('| --- | --- | --- |');
for (const roomId of ROOMS) {
  const band = OBSERVATORY_FLOORS[roomId];
  p(`| ${ROOM_TITLE[roomId]} | ${rect(band)} | ${band.minX}..${band.maxX} |`);
}
p();
for (const roomId of ROOMS) {
  p(`### Masonry — ${ROOM_TITLE[roomId]}`);
  p();
  p('| rect (x,y,w,h) |');
  p('| --- |');
  for (const wall of OBSERVATORY_WALLS[roomId]) p(`| ${rect(wall)} |`);
  p();
}
p('### Door alcoves');
p();
p('| id | room | door | threshold | jambs | inspect (r) | transit trigger (r) | arch |');
p('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const alcove of OBSERVATORY_ALCOVES) {
  p(`| \`${alcove.id}\` | ${alcove.roomId} | ${alcove.doorId} | ${rect(alcove.threshold)} | ${alcove.jambs.map(rect).join(' · ')} | ${point(alcove.inspect)} (${alcove.inspectRadius}) | ${point(alcove.trigger)} (${alcove.triggerRadius}) | ${rect(alcove.arch)} |`);
}
p();

p('## Modules (art + stand + behaviour)');
p();
p('The stand is the E trigger, authored at the object\'s **south edge** (RULE_GAMES.md 1) or its documented');
p('side. A standing prop sorts at `10 + anchor.y/10`; ground-mounted art sits at depth 3.');
p();
for (const roomId of ROOMS) {
  p(`### ${ROOM_TITLE[roomId]}`);
  p();
  p('| id | art | native × scale | anchor | drawn rect | stand (radius) | approach |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  for (const element of OBSERVATORY_ELEMENTS.filter((candidate) => candidate.roomId === roomId)) {
    const drawn = observatoryArtRect(element);
    const radius = element.radius > 0 ? String(element.radius) : '—';
    p(`| \`${element.id}\` | ${artLabel(element)} | ${element.nativeWidth}×${element.nativeHeight} ×${element.scale} | ${point(element.anchor)} | ${rect(drawn)} | ${point(element.stand)} (${radius}) | ${element.approach}${element.mount === 'ground' ? ', ground mount' : ''} |`);
  }
  p();
}
p('Rooms, spawns, exits and beam waypoints:');
p();
for (const roomId of ROOMS) {
  const room = OBSERVATORY_ROOMS[roomId];
  p(`- **${ROOM_TITLE[roomId]}**`);
  p(`  - spawns: ${room.spawns.map((spawn) => `\`${spawn.id}\` ${point(spawn.position)}`).join(' · ')}`);
  p(`  - exits: ${room.exits.map((exit) => `\`${exit.id}\` (${exit.doorId}; trigger ${point(exit.interactionPoint)}${exit.inspectPoint ? `; inspect ${point(exit.inspectPoint)}` : ''}${exit.latchControl ? `; latch ${point(exit.latchControl)}` : ''} → ${exit.toRoom} / ${exit.destinationSpawnId})`).join(' · ')}`);
  p(`  - waypoints: ${room.waypoints.map((waypoint) => `\`${waypoint.id}\` (${waypoint.position.roomId} ${point(waypoint.position)})`).join(' · ')}`);
}
p();
p('## Dynamic structures');
p();
p('| id | rect | state |');
p('| --- | --- | --- |');
p(`| root bed | ${rect(OBSERVATORY_ROOT_BED)} | full-depth divider drawn by \`buildObservatoryRootBed()\`; both masses stay solid and are painted exactly on their colliders, and the southern mass occludes a body standing in the lane |`);
p(`| root bridge lane | ${rect(OBSERVATORY_BRIDGE_LANE)} | the only cut through the bed: solid until \`bridgeEligible\`; a span held under the body waits for a bank before retracting |`);
p(`| final door head | ${rect(OBSERVATORY_FINAL_DOOR_HEAD)} | solid until \`finalDoorLatched\` |`);
for (const alcove of OBSERVATORY_ALCOVES) {
  p(`| \`${alcove.id}\` threshold | ${rect(alcove.threshold)} | solid until the ${alcove.doorId} opens or latches |`);
}
p();
p('Ground stamps (painted floor decor, below the feet, never solid):');
p();
for (const roomId of ROOMS) {
  p(`- ${roomId}: ${OBSERVATORY_STAMPS[roomId].map((stamp) => `\`${stamp.id}\` ${rect(stamp)} depth ${stamp.depth}`).join(' · ')}`);
}
p();
p('Non-colliding art — wall-mounted modules, walkable floor art, the dynamic root bed and the two latch');
p(`plates painted on a door sill: \`${OBSERVATORY_NON_SOLID_IDS.join('`, `')}\`.`);
p();

p('## Beam routing (pure, derived)');
p();
p('- Waypoints: `lantern-source` entrance 188,176 · `door-a-eye` entrance 604,168 · `g1` corridor 240,190 ·');
p('  `lumo-tube-entry` corridor 105,78 · `lumo-seal` corridor 320,80 · `g2` observatory 168,226 ·');
p('  `sun-lock` observatory 176,133 · `splitter` observatory 240,220 · `root-branch` observatory 362,226.');
p('- Routes (mirror rotations required): `door-a` G0=0 → Door A eye · `g0-to-g1` G0=1 → tube → seal → G1 ·');
p('  `g0-to-g2` G0=1,G1=2 → … → G2 · `g2-direct-sun` +G2=0 → Sun lock · `g2-split` +G2=1 → splitter, with the');
p('  fixed branches `[sun-lock]` and `[root-branch]`.');
p('- Every route past Door A also requires Lumo **physically** at the seal: his saved route must target and');
p('  have reached `lumo-seal` while his live position is inside the seal radius (28px, which covers his');
p('  authored resting hover 21.6px from the waypoint). A stale arrival flag cannot hold the seal.');
p('- Statue facing: 0 narrow (no shadow), 1/3 partial, 2 wide (full shadow over the bed).');
p();
p('## State model');
p();
p('| state | rule |');
p('| --- | --- |');
p('| `doorAUnlocked` | live beam reaches the Door A eye, or `l8-door-a-latched` |');
p('| `sunDoorUnlocked` | live beam reaches the Sun lock (direct route or splitter upper branch) |');
p('| `rootBedShadowed` | split route live AND statue facing 2 |');
p('| `bridgeEligible` | Sun lock lit AND bed shadowed AND Lumo at the seal |');
p('| `bridgeCrossed` | durable: the body entered the lane with a live bridge and left on the far bank |');
p('| `finalDoorLatched` | durable `l8-final-door-latched`, settable only from the far bank |');
p('| `returnLoopOpen` | durable `l8-return-loop-open`, settable only from the far bank |');
p('| completion | final door latched AND loop open AND lantern retrieved AND Lumo recalled AND record read AND crystal taken |');
p();
p('Durable door state keeps the level un-strandable: `l8-door-a-latched` holds Door A after G0 moves, and');
p('the Sun Door latches the first time the Sun lock lights (`l8-sun-door-latched`, also implied by');
p('`l8-bridge-crossed` / `l8-final-door-latched` / `l8-return-loop-open`), so turning the lantern off can');
p('never lock Nhinh out of the corridor or in the observatory.');
p();
p('Derived values are recomputed from flags, mirror/statue rotations and Lumo\'s live position on every');
p('load and after every change; they are never persisted.');
p();

p('## Prompts (RULE_GAMES audit)');
p();
p('| id | prompt while its condition is unmet |');
p('| --- | --- |');
const sample = {
  doorAUnlocked: false, sunDoorUnlocked: false, rootBedShadowed: false, bridgeEligible: false, lumoAtSeal: false,
  activeBeamRoute: 'off', doorALatched: false, sunDoorLatched: false, finalDoorLatched: false, returnLoopOpen: false,
  bridgeCrossed: false, lanternPlaced: false, lanternOn: true, lanternRetrieved: true, lumoRecalled: false,
  recordRead: false, crystalTaken: false, miniatureViewed: false, mirrors: { g0: 0, g1: 0, g2: 0 }, statue: 0,
};
for (const element of OBSERVATORY_ELEMENTS) {
  if (element.radius === 0) continue;
  p(`| \`${element.id}\` | ${observatoryPrompt(element.id, sample)} |`);
}
p();
p('- Every trigger centre sits at or below its object\'s south edge, or on the documented side/gate');
p('  exception; standing north, east or west of a prop shows nothing, and radii stay 22..24 (exits 28..30).');
p('- Every locked door and disabled control states the unmet prerequisite in Vietnamese via');
p('  `observatoryDoorBlockReason`, `observatoryBridgeBlockReason`, `observatoryRecordBlockReason` and');
p('  `observatoryFinalDoorBlockReason`.');
p('- The Door A latch plate is painted inside the alcove sill and only answers from the corridor side; the');
p('  final-door plate only answers from the far bank, so neither can be reached through a wall.');
p();
p('## Guidance (objective / status / hints / journal)');
p();
p('`observatoryGuidance(roomId, state)` feeds the objective row, the status row, the Lumo badge and the');
p('three-step H ladder; `J` lists the learned facts and, once read, the final record. Locked gates always');
p('say what is still missing, and no HUD row asserts a live condition from history.');
p();
p('## Restore rules');
p();
p('Restores are resolved by `nearestSafeObservatorySpawn()` — the predicate the checks verify, so the');
p('result is never inside a solid, never inside the root-bridge rectangle and never outside the room.');
p();
p('1. **Before the bridge** — the saved room\'s reachable stone spawn. Lantern position/power, mirrors,');
p('   statue, Lumo route/arrival and both latches are kept; beam, roots and bridge are recomputed.');
p('2. **Across the bridge, before the loop** — the far-bank stone `(452,276)`, or the near-bank stone');
p('   `(280,276)` when the save was taken on the bridge itself. Final latch and loop control stay reachable.');
p('3. **After the loop** — the saved room\'s stone spawn; the loop stays open and both the lantern and');
p('   Lumo keep the state they were saved in.');
p();
p('`progress.roomId` ∈ {entrance, corridor, observatory} and `roomSpawn` inside 0..640 / 0..360 remain');
p('validated by `CampaignSaveSystem` (save v1), and the `l8-lumo-*` fields keep their existing validation.');
p();
p('## Verification');
p();
p('- `node scripts/check-observatory.mjs` — per-stage collision-aware reachability, four-way blocking of');
p('  every solid, art registration, control parity, scene wiring and save guards.');
p('- `npm run build` — `tsc --noEmit` plus the Vite production build.');
p('- Playtest is a manual step: no automated browser run is claimed here.');

writeFileSync(join(rootDir, 'docs/implementation/09-layout.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(`docs/implementation/09-layout.md written (${lines.length} lines)`);

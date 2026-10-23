# V4 Foundation (Step 0) Implementation Plan

> **For agentic workers:** implement ONE task from this plan, the one you were assigned. Steps use checkbox (`- [ ]`) syntax. Read "Rules for every worker" first.

**Goal:** Replace the V2 campaign runtime with a V4 base that later levels plug into: a level-agnostic host scene, a V4 save, a pure (Phaser-free) library of the shared V4 mechanics, interaction reach that follows `RULE_GAMES.md`, a Vitest test runner, and one small test room that exercises all of it. No V4 story level is built in this step.

**Sources of truth:** `docs/scenario-v4/puzzle-contracts.md` (shared gameplay rules) and `RULE_GAMES.md` (interaction and space). V2 code and V1–V3 scenarios are NOT a reference for behaviour. The technical base (Phaser setup, player movement, lantern rendering, HUD, dialogue box, pause menu, sound, art loading, i18n) is kept and adapted.

**Tech stack:** TypeScript 5.4 (strict), Phaser 3.80, Vite 5, Vitest 2.1.9, Node 24.

**Branch:** `feat/v4-foundation` (from `develop-v4`).

## Rules for every worker

1. Do only your task. Do not edit files outside the task's file list unless the task says so; if you must, say which and why in your report.
2. Do not commit, push, or switch branches. Leave changes in the working tree.
3. Do not run `npm run build` or `npm run verify`: they rewrite the tracked `dist/index.html`. Use the checks below.
4. Before reporting, both must pass:
   - `npx tsc --noEmit`
   - `npm test` (from Task 1 onwards)
5. Pure modules under `src/v4/core/` and every `*Logic.ts` / `*Layout.ts` must not import Phaser, `window`, `document` or `localStorage`. They are tested in Node by Vitest.
6. Code style: match the surrounding code — 2-space indent, single quotes, semicolons, `import type` for types, short doc comments on exported symbols. No new runtime dependencies.
7. Copy shown to the player is Vietnamese and passes through `tr()` at the render boundary, as the existing code does. Code, identifiers and comments are English.
8. Report at the end: files added/changed/deleted, test count, anything you could not do, and any decision you had to make that this plan did not settle.

## Target layout

```
src/v4/
  core/                 pure, Phaser-free, fully unit-tested
    geometry.ts         Rect, Point, rect helpers
    body.ts             FOOT_BODY, footRectAt()
    reach.ts            REACH_GAP, Reach, isInReach(), reachGap(), pickTarget()
    reachAudit.ts       auditReach(), walkable grid, reachability
    lantern.ts          LanternState + operations
    latch.ts            fixed latch, portable latch, isDoorOpen()
    bridge.ts           stepBridge()
    rotary.ts           stepMod()
    lumo.ts             LumoMode + operations
    hints.ts            HintLadder, nextHint()
    journal.ts          addJournalEntry()
    pulse.ts            revealMarks()
    save.ts             V4Save, parseSave(), V4SaveStore
    level.ts            V4 level contract types (no Phaser)
  scene/
    V4Scene.ts          host scene (Phaser)
    LevelHost.ts        what the host offers a level runtime
  levels/
    index.ts            ordered level registry
    test-room/
      testRoomLayout.ts pure layout data
      testRoomLogic.ts  pure state + derivation
      TestRoomLevel.ts  Phaser runtime
src/ui/hudLayout.ts     HUD bands as pure data (moved out of CampaignHud.ts)
```

Tests live next to the module: `src/v4/core/reach.test.ts`, etc.

---

## Task 1 — Vitest test runner

**Files:** `package.json`, `package-lock.json`, `vitest.config.ts` (new), `scripts/verify-release.mjs`, `src/systems/interactionPromptLayout.test.ts` (new).

- [ ] `npm install -D vitest@2.1.9`.
- [ ] Add script `"test": "vitest run"` to `package.json`.
- [ ] Create `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  });
  ```
- [ ] Smoke test `src/systems/interactionPromptLayout.test.ts` for the existing pure `layoutInteractionPrompt()`: (a) with a target at `{x:300,y:200,width:20,height:20}` and the player far away, the returned rect lies inside the safe area `x≥8, y≥82, x+width≤632, y+height≤310`; (b) the returned rect does not overlap the player rect. Import with `import { describe, it, expect } from 'vitest';`.
- [ ] `scripts/verify-release.mjs`: add a stage right after TypeScript that runs `node node_modules/vitest/vitest.mjs run`, and renumber the stage banners (`== 1/4`, …). Change the "no scripts/check-*.mjs found" failure into a warning: after Task 2 there may be none.
- [ ] `npx tsc --noEmit` and `npm test` pass (1 test file, ≥2 tests).

## Task 2 — Remove the V2 level logic

Goal: the build contains only the technical base plus a placeholder V4 scene. Git history keeps the old code.

**Delete:**
- `src/levels/` (whole folder), `src/puzzles/` (whole folder), `src/world/` (whole folder), `src/data/` (whole folder).
- `src/scenes/CampaignScene.ts`, `ShatteredCreekController.ts`, `WorldScene.ts`, `PrologueScene.ts`, `EndingScene.ts`.
- `src/systems/CampaignEndingSequence.ts`, `CampaignSaveSystem.ts`, `ObservatoryAudio.ts`, `ObservatoryPuzzle.ts`, `QuestSystem.ts`, `SaveSystem.ts`, `levelSelect.ts`.
- Every file in `src/i18n/entries/` except `chrome.ts`; remove their imports and spreads from `src/i18n/catalog.ts`.
- Scripts that test deleted code: `scripts/check-campaign-*.mjs`, `check-dialogue-*.mjs`, `check-forest-edge*.mjs`, `check-heart-of-elaria.mjs`, `check-library-*.mjs`, `check-observatory.mjs`, `check-path-*.mjs`, `check-prologue.mjs`, `check-ruins-of-two-halves.mjs`, `check-shattered-creek.mjs`, `check-sleeping-garden.mjs`, `check-sleepless-tower.mjs`, `check-whispering-woods*.mjs`, `check-level-select.mjs`, `check-interaction-targets.mjs`, `level01-browser-regression.cjs`, `level02-browser.cjs`, `level02-geometry.cjs`, `campaign-hud-browser.cjs`, `browser-audit-interaction-reach.js`, `gen-observatory-layout-doc.mjs`, `check-observatory-audio-browser.py`.
- Keep art pipeline scripts (`export-*`, `prepare-*`, `inspect-*`, `check-level0*-art*`, `check-level05-*.py`, `check-level06-art.py`, `check-level08-art-v4.cjs`) and `scripts/lib/`.

**Add** `src/v4/scene/V4Scene.ts`, a placeholder:
```ts
export class V4Scene extends Phaser.Scene {
  constructor() { super({ key: 'V4Scene' }); }
  public create(): void { /* dark fill, centred text tr('The Last Lantern — bản V4 đang dựng'), and tr('ESC: về menu'); ESC starts 'MenuScene' */ }
}
```

**Change:**
- `src/config/gameConfig.ts`: `scene: [BootScene, MenuScene, V4Scene, ComingSoonScene]`.
- `src/scenes/MenuScene.ts`: remove `SaveSystem`, `CampaignSaveSystem`, `WorldFactory`. The menu-background fallback becomes a plain `#081d26` rectangle. "New Game" starts `'V4Scene'` with `{ newGame: true }` (keep the confirm dialog code but `hasAnySave()` returns `false` for now with a `// Task 6 wires the V4 save` comment). "Continue" is not offered for now. Remove the demo/completed/legacy branches of `continueGame()` that depended on deleted modules; keep the method as a stub that starts `'V4Scene'`.
- `src/types/gameTypes.ts`: keep only the types still imported by remaining files (expected: `DialogueLine`, `InteractableConfig`, `ZoneId` if `EffectsSystem` still needs it).
- Any other remaining file that imports a deleted module: remove only the import and the code path that needs it. Never re-create a deleted module.
- Remaining `scripts/check-*.mjs`: run each with `node scripts/<name>`. If one fails only because it imports or reads a deleted file, delete it and list it in the report. If it fails for another reason, do not fix it; report it.
- `npx tsc --noEmit` and `npm test` pass. `npx vite build --outDir %TEMP%\v4-build-check --emptyOutDir` succeeds (this writes outside the repo).

## Task 3 — Reach, foot body and the interaction system

Implements `RULE_GAMES.md` §1–5.

**Files:** `src/v4/core/geometry.ts`, `body.ts`, `reach.ts` (+ tests), `src/actors/Player.ts`, `src/systems/InteractionSystem.ts`, `src/types/gameTypes.ts`; delete `src/systems/interactionReach.ts` and `scripts/check-interaction-reach.mjs`.

- [ ] `geometry.ts`:
  ```ts
  export interface Point { readonly x: number; readonly y: number }
  export interface Rect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  export function rectsOverlap(a: Rect, b: Rect): boolean      // strict: touching edges do not overlap
  export function rectCenter(r: Rect): Point
  export function pointInRect(p: Point, r: Rect): boolean      // half-open: x in [r.x, r.x+w), y in [r.y, r.y+h)
  ```
- [ ] `body.ts`:
  ```ts
  /** The one foot body (RULE_GAMES §1), relative to the actor's centre. */
  export const FOOT_BODY = { offsetX: -7, offsetY: 16, width: 14, height: 6 } as const;
  /** Ground line used for depth sorting, relative to the actor's centre. */
  export const FOOT_DEPTH_OFFSET = 19;
  export function footRectAt(center: Point): Rect   // {x: cx-7, y: cy+16, width: 14, height: 6}
  ```
- [ ] `reach.ts`:
  ```ts
  export const REACH_GAP = 8;
  export type Face = 'north' | 'south' | 'east' | 'west';
  export type Reach =
    | { readonly kind: 'block'; readonly rect: Rect }
    | { readonly kind: 'floor'; readonly rect: Rect }
    | { readonly kind: 'faces'; readonly rect: Rect; readonly faces: readonly Face[] };
  export interface ReachException { readonly reason: string; readonly maxGap?: number }
  export function rectGap(a: Rect, b: Rect): number
  export function reachGap(foot: Rect, reach: Reach): number | null
  export function isInReach(foot: Rect, reach: Reach, exception?: ReachException): boolean
  export function pickTarget(foot: Rect, items: readonly { reach: Reach; exception?: ReachException }[]): number
  ```
  - `rectGap`: Euclidean gap between two rectangles; 0 when they touch or overlap.
  - `reachGap` returns the gap used for ranking, or `null` when out of reach. `maxGap = exception?.maxGap ?? REACH_GAP`.
    - `block`: `rectGap(foot, rect)`; in reach when `≤ maxGap`.
    - `floor`: in reach when `pointInRect(rectCenter(foot), rect)`; gap is `0`.
    - `faces`: the foot must lie wholly outside the rect on at least one listed face — south: `foot.y >= rect.y + rect.height`; north: `foot.y + foot.height <= rect.y`; east: `foot.x >= rect.x + rect.width`; west: `foot.x + foot.width <= rect.x` — and `rectGap ≤ maxGap`.
  - `isInReach` is `reachGap(...) !== null`.
  - `pickTarget` returns the index of the in-reach item with the smallest gap; ties go to the lower index; `-1` when none.
- [ ] `reach.test.ts` — at minimum, with a 20×20 block at (100,100):
  - foot touching each of the four sides → in reach; foot exactly 8px away on each side → in reach; 9px → out.
  - diagonal: foot whose corner is 6px right and 6px below the block's corner (gap ≈ 8.49) → out; 5px and 5px (≈7.07) → in.
  - foot overlapping the block → in, gap 0.
  - `floor`: foot centre inside → in; centre 1px outside → out, even when touching.
  - `faces: ['south']`: 4px below → in; 4px north → out; 4px east → out.
  - exception `maxGap: 12`: 10px away → in.
  - `pickTarget`: nearer wins; equal gaps → lower index; nothing in reach → -1.
  - `footRectAt({x:100,y:100})` equals `{x:93,y:116,width:14,height:6}`.
- [ ] `Player.ts`: the body is always `FOOT_BODY`. In the constructor, `body.setSize(14, 6)` and `body.setOffset(sprite.width / 2 + FOOT_BODY.offsetX, sprite.height / 2 + FOOT_BODY.offsetY)`; the depth offset is always `FOOT_DEPTH_OFFSET`. Remove `setFootPlacement()` and the `footDepthOffset === 0` branches. `getFootBody()` returns `footRectAt({ x: sprite.x, y: sprite.y })`.
- [ ] `gameTypes.ts`: replace `InteractableConfig` with
  ```ts
  export interface Interactable {
    readonly id: string;
    readonly reach: Reach;
    readonly exception?: ReachException;
    /** Null hides the control: it is not there right now. A control that is there but cannot act still returns a prompt and explains itself in onInteract (RULE_GAMES §7). */
    getPrompt(): string | null;
    onInteract(): void;
  }
  ```
- [ ] `InteractionSystem.ts`: `register(item: Interactable)`, `clear()`, `update(foot: Rect, canInteract: boolean, actorBounds: PromptRect, protectedBounds: PromptRect[])`, `tryInteract(now: number): boolean`, `getActiveTarget()`. Selection uses `pickTarget` over items whose `getPrompt()` is non-null. `tryInteract` re-validates prompt and reach against the last foot rect before calling `onInteract`, and keeps the 160 ms debounce. The prompt is positioned with `layoutInteractionPrompt(item.reach.rect, actorBounds, …)`. Remove `radius`, `isEnabled`, `ownsPosition`, `isInReach`, the padded-radius fallback and `INTERACTION_RADIUS_PADDING`.
- [ ] Delete `src/systems/interactionReach.ts` and `scripts/check-interaction-reach.mjs`.

## Task 4 — Shared mechanics (pure)

**Files:** `src/v4/core/lantern.ts`, `latch.ts`, `bridge.ts`, `rotary.ts`, `lumo.ts`, `hints.ts`, `journal.ts`, `pulse.ts`, each with a `.test.ts`; `src/systems/LanternSystem.ts`.

All functions are pure: they return new values and never mutate their inputs. "Refused" means the function returns `null`.

- [ ] `lantern.ts` (puzzle-contracts §1 "Đèn bảo trì"):
  ```ts
  export type LanternLocation = { readonly at: 'hand' } | { readonly at: 'pedestal'; readonly pedestalId: string };
  export interface LanternState { readonly location: LanternLocation; readonly on: boolean }
  export function initialLantern(): LanternState                        // in hand, on
  export function toggleLantern(s: LanternState): LanternState          // F: flips `on` wherever the lantern is
  export function placeLantern(s: LanternState, pedestalId: string): LanternState | null  // only from hand; keeps `on`
  export function pickUpLantern(s: LanternState, pedestalId: string): LanternState | null // only from that pedestal; keeps `on`
  export function lanternFeeds(s: LanternState, pedestalId: string): boolean             // on && on that pedestal
  export function canPulse(s: LanternState): boolean                    // in hand && on
  ```
  Tests: toggle in hand and on a pedestal; place refused when already placed; pick refused from another pedestal; place/pick keep `on`; `lanternFeeds` false when off.
- [ ] `latch.ts` (§1 "Chốt"):
  ```ts
  export function isDoorOpen(live: boolean, latched: boolean): boolean            // live || latched
  /** Fixed latch: engages only while its door is really open (live); always releases. */
  export function setFixedLatch(engaged: boolean, want: boolean, doorLiveNow: boolean): boolean | null
  export type PortableLatchLocation = { readonly at: 'belt' } | { readonly at: 'slot'; readonly slotId: string };
  export function attachPortableLatch(k: PortableLatchLocation, slotId: string, doorOpenNow: boolean): PortableLatchLocation | null // only from belt, only while that door is open
  export function detachPortableLatch(k: PortableLatchLocation, slotId: string): PortableLatchLocation | null                        // only from that slot
  ```
  `setFixedLatch(engaged, true, false)` → `null`; `setFixedLatch(true, false, any)` → `false`; setting the current value returns it unchanged.
- [ ] `bridge.ts` (§1 "Cầu"):
  ```ts
  export interface BridgeStep { readonly walkable: boolean; readonly holding: boolean }
  /** open: the bridge's condition this frame. onDeck: the foot body overlaps the deck. */
  export function stepBridge(prevWalkable: boolean, open: boolean, onDeck: boolean): BridgeStep
  ```
  `walkable = open || (prevWalkable && onDeck)`; `holding = walkable && !open`. Tests: opens with the condition; losing the condition mid-crossing keeps it walkable until the foot leaves the deck, then it closes; stepping onto a closed deck never opens it.
- [ ] `rotary.ts`: `export function stepMod(value: number, delta: number, steps: number): number` — `((value + delta) % steps + steps) % steps`; throws on `steps < 1` or non-integer input. Tests include negative deltas and the Level 02 check `(0 + 2) mod 3 = 2`.
- [ ] `lumo.ts` (§1 "Lumo"):
  ```ts
  export type LumoMode =
    | { readonly mode: 'follow' }
    | { readonly mode: 'travelling'; readonly sealId: string }
    | { readonly mode: 'holding'; readonly sealId: string };
  export function followLumo(): LumoMode
  export function callLumo(m: LumoMode, sealId: string): LumoMode      // → travelling, unless already travelling to or holding that seal (unchanged)
  export function lumoArrived(m: LumoMode): LumoMode                   // travelling → holding the same seal; otherwise unchanged
  export function recallLumo(m: LumoMode): LumoMode                    // always → follow
  export function lumoHolds(m: LumoMode, sealId: string): boolean      // only when holding that seal, never while travelling
  ```
- [ ] `hints.ts` (§3, H is three levels: observe → relation → concrete step for the current state):
  ```ts
  export interface HintLadder { readonly key: string; readonly steps: readonly [string, string, string] }
  export interface HintCursor { readonly key: string | null; readonly index: number }
  export const NO_HINT_CURSOR: HintCursor                               // { key: null, index: -1 }
  export function nextHint(cursor: HintCursor, ladder: HintLadder): { cursor: HintCursor; text: string }
  ```
  A new `ladder.key` restarts at step 0; the same key advances one step and stays on step 2.
- [ ] `journal.ts`: `export function addJournalEntry(entries: readonly string[], id: string): { entries: readonly string[]; added: boolean }` — appends once, keeps order.
- [ ] `pulse.ts` (§1 "Pulse": reveals marks; never powers anything):
  ```ts
  export interface PulseMark { readonly id: string; readonly x: number; readonly y: number }
  export function revealMarks(origin: Point, radius: number, marks: readonly PulseMark[], found: ReadonlySet<string>): string[]
  ```
  Returns ids within `radius` (inclusive) not already in `found`, in `marks` order.
- [ ] `LanternSystem.ts` becomes render-only. Remove the fields `lanternOn`, `lanternInHand`, `lanternPlaced`, `placedX`, `placedY`, `isDawnMode`, `isOverloadMode` and the methods `toggleLantern`, `placeLanternAt`, `retrieveLantern`, `setPlacedLightVisible`. New signatures:
  ```ts
  constructor(scene: Phaser.Scene, profile?: LanternLightingProfile)   // no profile = the generic lighting branch
  update(dt: number, player: Point, lantern: LanternState, placedAt: Point | null): void
  triggerPulse(origin: Point, lantern: LanternState): boolean          // refuses unless canPulse(lantern); keeps the cooldown
  ```
  Keep `FOREST_LIGHTING` and `LIBRARY_LIGHTING` as data, the falloff/halo/pulse drawing, `onPulse`, `clearPulseListeners`, `getCooldownRatio`, `PULSE_*` constants. Play `SoundSystem.playLanternToggle` from the caller, not here. The missing-texture error message becomes generic: `'Missing darkness falloff texture'`.

## Task 5 — V4 save (pure + storage adapter)

**Files:** `src/v4/core/save.ts`, `save.test.ts`. Depends on Task 4 types.

puzzle-contracts §4: save the configuration (mirrors, valves, latches, lantern position, Lumo position/mode, held items, discoveries, one-time events); recompute beams/bridges/doors from it; never restore a "was lit" flag as a live source; V4 flags are versioned and never read V2 saves.

- [ ] Types and constants:
  ```ts
  export const V4_SAVE_KEY = 'last-lantern-v4-save';
  export const V4_SAVE_BACKUP_KEY = 'last-lantern-v4-save-backup';
  export const V4_SAVE_VERSION = 4;
  export interface V4Save {
    readonly version: 4;
    readonly levelId: string;
    readonly reachedLevelIds: readonly string[];
    readonly checkpointId: string;              // '' = the level's first checkpoint
    readonly lantern: LanternState;
    readonly lumo: LumoMode;
    readonly journal: readonly string[];
    readonly events: readonly string[];         // one-time events already played
    readonly levels: Readonly<Record<string, unknown>>; // per-level state, validated by the level's parseState()
  }
  export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
  export function createDefaultSave(levelId: string): V4Save
  export function parseSave(raw: string): { save: V4Save; repaired: boolean } | null
  export function serializeSave(save: V4Save): string
  export class V4SaveStore {
    constructor(storage: StorageLike | null)    // null: storage unavailable, everything is a no-op / null
    hasSave(): boolean
    load(): V4Save | null
    save(save: V4Save): void
    clear(): void
  }
  ```
- [ ] `parseSave` returns `null` only when the text is not JSON, not a plain object, `version !== 4`, or `levelId` is not a non-empty string. Everything else is repaired and sets `repaired: true`: invalid `lantern` → `initialLantern()`; invalid `lumo` → `followLumo()`; non-string `checkpointId` → `''`; `reachedLevelIds`/`journal`/`events` keep only unique strings; `levels` that is not a plain object → `{}`; `reachedLevelIds` always contains `levelId`.
- [ ] `V4SaveStore.load()`: a stored value that parses to `null`, or that was repaired, is copied once to `V4_SAVE_BACKUP_KEY` (only while that key is empty) before returning (`null` or the repaired save). `save()` and `clear()` never touch the backup. Every storage call is wrapped in `try/catch`; a throwing storage behaves like an empty one.
- [ ] Tests with an in-memory `StorageLike`: round trip; each repair case; null cases; backup written once and never overwritten; a throwing storage.

## Task 6 — Level contract, test room and the host scene

**Files:** `src/v4/core/level.ts`, `reachAudit.ts` (+ test), `src/ui/hudLayout.ts`, `src/ui/CampaignHud.ts`, `src/v4/scene/LevelHost.ts`, `src/v4/scene/V4Scene.ts`, `src/v4/levels/index.ts`, `src/v4/levels/test-room/*` (+ tests), `src/scenes/MenuScene.ts`.

### 6a. Pure parts

- [ ] `src/ui/hudLayout.ts`: move the pure constants that `HUD_LAYOUT` is built from out of `CampaignHud.ts` and export `HUD_LAYOUT` from here (re-export from `CampaignHud.ts` so existing imports work). Add
  ```ts
  /** Screen bands no interactable, standing spot or prompt may occupy (RULE_GAMES §6). */
  export const HUD_BANDS: readonly Rect[] = [
    { x: TOP_X, y: TOP_Y, width: TOP_WIDTH, height: TOP_MAX_HEIGHT },   // the mission plate only (top-left), not the full width
    { x: 0, y: HUD_LAYOUT.keysY - 14, width: 640, height: 360 - (HUD_LAYOUT.keysY - 14) },
  ];
  ```
  Remove `PULSE_LEVELS` from `CampaignHud.ts`; the pulse chip is shown when the host says Pulse is available.
- [ ] `src/v4/core/level.ts`:
  ```ts
  export interface Checkpoint { readonly id: string; readonly spawn: Point; readonly zone: Rect }
  export interface LevelLayout {
    readonly world: Rect;                         // walkable bounds, normally {0,0,640,360}
    readonly walls: readonly Rect[];              // always solid
    readonly checkpoints: readonly Checkpoint[];  // first one is the default
  }
  export interface HudText { readonly objective: string; readonly status: string }
  ```
- [ ] `reachAudit.ts` (RULE_GAMES §6, §9):
  ```ts
  export interface AuditItem { readonly id: string; readonly reach: Reach; readonly exception?: ReachException }
  export interface AuditInput { readonly world: Rect; readonly solids: readonly Rect[]; readonly hudBands: readonly Rect[]; readonly items: readonly AuditItem[] }
  export function isFootWalkable(foot: Rect, input: Pick<AuditInput, 'world' | 'solids'>): boolean   // inside world, overlaps no solid
  export function auditReach(input: AuditInput): string[]   // human-readable problems; [] = clean
  export function reachableFeet(start: Point, input: Pick<AuditInput, 'world' | 'solids'>, step?: number): Set<string>  // BFS over actor centres on a `step` grid (default 2), keys "x,y"
  export function canReachItem(start: Point, item: AuditItem, input: Pick<AuditInput, 'world' | 'solids'>, step?: number): boolean
  ```
  `auditReach` reports: an item rect overlapping a HUD band; an item with no walkable foot position in reach (sample foot positions on a 1px grid in a 12px band around the rect); for `block`/`faces`, any sampled walkable foot position where `isInReach` disagrees with `gap ≤ maxGap` (this guards future changes to `reach.ts`). A solid's own rect is skipped when it is the item's rect. Tests: a clean room returns `[]`; an item under the top HUD band is reported; an item boxed in by solids is reported; `canReachItem` is false across a closed wall and true through a gap.
- [ ] `test-room/testRoomLayout.ts` — one 640×360 room, all rects in world pixels:
  - world `{x:16, y:96, width:608, height:232}` (below the HUD's top band, above the key row).
  - walls: west room / east room split by a wall at `x 316..324` from `y 96` to `y 328`, with a door gap at `y 190..230`; the door A leaf is the rect `{x:316, y:190, width:8, height:40}` and is solid while closed. An east wall at `x 592..600` with gate B gap `y 190..230`; gate B leaf `{x:592, y:190, width:8, height:40}`.
  - pedestal `s1`: block `{x:180, y:160, width:24, height:24}` (solid), lantern sits at its centre.
  - fixed latch A: block `{x:340, y:248, width:16, height:16}` (solid), east of the door.
  - Lumo marker `m`: block `{x:420, y:140, width:16, height:16}` (solid); it sends Lumo to seal `p` and recalls him.
  - seal `p`: Lumo's target point `{x:560, y:132}` (not interactive for Nhinh, not solid).
  - pulse mark `carving` at `{x:250, y:290}` (not solid, not interactive).
  - checkpoints: `start` spawn `{x:110, y:250}` zone `{x:60, y:200, width:100, height:100}`; `east` spawn `{x:380, y:210}` zone `{x:340, y:180, width:80, height:60}`.
  - exit zone east of gate B: `{x:600, y:190, width:24, height:40}`.
  Export it as one frozen object `TEST_ROOM` plus the ids as string constants.
- [ ] `test-room/testRoomLogic.ts`:
  ```ts
  export interface TestRoomState { readonly latchA: boolean }
  export function defaultTestRoomState(): TestRoomState                // { latchA: false }
  export function parseTestRoomState(raw: unknown): TestRoomState      // repairs to default
  export interface TestRoomView { readonly doorALive: boolean; readonly doorAOpen: boolean; readonly gateBOpen: boolean; readonly stage: 'door' | 'lumo' | 'done' }
  export function deriveTestRoom(s: TestRoomState, lantern: LanternState, lumo: LumoMode): TestRoomView
  //   doorALive = lanternFeeds(lantern, 's1'); doorAOpen = isDoorOpen(doorALive, s.latchA); gateBOpen = lumoHolds(lumo, 'p')
  //   stage = !s.latchA ? 'door' : !gateBOpen ? 'lumo' : 'done'
  export function testRoomHud(v: TestRoomView): HudText
  export function testRoomHint(v: TestRoomView): HintLadder | null     // one ladder per stage, none for 'done'
  export function testRoomSolids(v: TestRoomView): Rect[]              // walls + pedestal + latch + marker + closed leaves
  ```
  Copy (Vietnamese, short, describes cause and effect, never the solution order in the observe step):
  - HUD objective: door → `'Mở cửa A và giữ nó mở.'`; lumo → `'Nhờ Lumo mở cổng B.'`; done → `'Đi qua cổng B.'`. Status: `'Đèn: …(trong tay|trên bệ) (bật|tắt) · Cửa A: (mở|đóng)(, đã gài)? · Lumo: (theo Nhinh|đang bay|giữ ấn)'`.
  - Hints door: `['Cửa A có mắt nhận ở phía bệ đèn.', 'Đèn trên bệ mở cửa; chốt phía bên kia giữ cửa khi đèn đi nơi khác.', 'Đặt đèn lên bệ, bật đèn, qua cửa và gài chốt A.']`; lumo: `['Cổng B có một ấn ở trên cao.', 'Lumo giữ ấn thì cổng mở; gọi cậu về thì cổng đóng.', 'Dùng mốc gọi để gửi Lumo tới ấn, rồi đi qua cổng B.']`.
  - Journal text for `carving`: `'Nét khắc: cửa A nhận ánh sáng từ bệ, không từ đèn cầm tay.'`
- [ ] Tests (`testRoomLogic.test.ts`): the reference path (place on `s1` → door live → latch → pick up → door stays open → call Lumo → arrive → gate open → stage done); picking up before latching closes the door; latching refused while the door is closed (via `setFixedLatch`); turning the lantern off on the pedestal closes an unlatched door; recall closes gate B; `parseTestRoomState` repairs garbage. A layout test runs `auditReach` with `testRoomSolids` for the initial view and for the fully open view and expects `[]`; `canReachItem` from the `start` spawn reaches `s1` initially, does not reach latch A while door A is closed, and does once it is open; from the `east` spawn the marker is reachable.

### 6b. Phaser parts

- [ ] `src/v4/scene/LevelHost.ts`:
  ```ts
  export interface LevelHost {
    readonly scene: Phaser.Scene;
    getLantern(): LanternState;  setLantern(next: LanternState): void;   // setLantern plays the toggle sound when `on` changes and requests a save
    getLumo(): LumoMode;         setLumo(next: LumoMode): void;          // requests a save
    hasEvent(id: string): boolean; markEvent(id: string): void;
    say(lines: DialogueLine[], onDone?: () => void): void;
    toast(text: string): void;
    requestSave(): void;
  }
  export interface V4LevelRuntime<S> {
    readonly id: string;
    readonly title: string;
    readonly layout: LevelLayout;
    defaultState(): S;
    parseState(raw: unknown): S;
    /** Draws the room and creates its colliders. Called once per scene start. */
    build(host: LevelHost, state: S): void;
    interactables(): Interactable[];
    /** Per frame: recompute live doors/bridges from state + lantern + Lumo, update colliders and visuals. */
    update(dt: number, foot: Rect): void;
    getState(): S;
    hud(): HudText;
    hint(): HintLadder | null;
    pulseMarks(): readonly PulseMark[];
    journalText(id: string): string;
    /** Where Lumo flies for a seal id, or null if the level has no such seal. */
    sealPosition(sealId: string): Point | null;
    lanternLightProfile(): LanternLightingProfile | undefined;
    /** World point the placed lantern's light sits on, or null. */
    pedestalPosition(pedestalId: string): Point | null;
    /** True when the foot body is in the level's exit zone and the level is finished. */
    isExitReached(foot: Rect): boolean;
    destroy(): void;
  }
  ```
- [ ] `src/v4/levels/index.ts`: `export const V4_LEVELS: readonly (() => V4LevelRuntime<unknown>)[]` with the test room factory, and `findLevelFactory(id)`.
- [ ] `test-room/TestRoomLevel.ts` implements `V4LevelRuntime<TestRoomState>` with `testRoomLogic`/`testRoomLayout`. Art is drawn with `Phaser.GameObjects.Graphics` only (floor `0x14262b`, walls `0x2c3e40`, door/gate leaves `0x6b5a3a` when closed and hidden when open, pedestal `0x8a7a55`, latch `0xb08a4a` with a brighter fill when engaged, marker `0x4fb3a9`, seal a small ring at `p`, carving a faint line drawn only after it is in the journal). Colliders are static `Phaser.GameObjects.Zone`s with arcade static bodies; door/gate leaf bodies are enabled only while closed. Interactables:
  - `s1` (block): prompt `'E: đặt đèn'` when the lantern is in hand, `'E: lấy đèn'` when it is on `s1`; acts via `placeLantern`/`pickUpLantern`.
  - `latch-a` (block): prompt `'E: gài chốt A'` / `'E: mở chốt A'`. Engaging while the door is not live → toast `'Chốt chỉ gài được khi cửa đang mở.'` (RULE_GAMES §7).
  - `marker-m` (block): `'E: gửi Lumo tới ấn'` in follow mode, `'E: gọi Lumo về'` otherwise.
  The exit: when `isExitReached`, the host toasts `'Đã qua phòng thử.'` once (event `test-room-exit`).
- [ ] `src/v4/scene/V4Scene.ts` replaces the placeholder. Responsibilities, in this order in `create(data)`:
  1. `consumeCampaignNewGameIntent(data, this.sys.settings.data)`; store = `new V4SaveStore(safeLocalStorage())` where `safeLocalStorage()` returns `window.localStorage` or `null` inside `try/catch`. New game → `createDefaultSave(V4_LEVELS[0]().id)` and save it; otherwise `store.load() ?? createDefaultSave(...)`.
  2. Level = `findLevelFactory(save.levelId)` (fallback first level); state = `level.parseState(save.levels[level.id])`.
  3. Spawn at the checkpoint `save.checkpointId` (fallback the first). `Player`, `Lumo` (existing actors), `LanternSystem(level.lanternLightProfile())`, `InteractionSystem`, `DialogueSystem`, `CampaignHud`, `PauseMenu` (no level selector; restart = clear save and restart with `{ newGame: true }`; main menu; language toggle restarts the scene).
  4. `level.build(host, state)`, colliders between the player and the level's solids, register `level.interactables()`.
  5. Keys: E (pause select / dialogue advance / interact), F (toggle lantern unless input is locked), SPACE (pause select / dialogue advance / Pulse when `canPulse` and the level has marks; found ids → `addJournalEntry` + toast `'Đã ghi vào sổ tay.'`), H (hint: `nextHint` on `level.hint()`, shown with `hud.showToast`), J (journal: a dialogue listing `level.journalText(id)` for each entry, or `'Sổ tay chưa có ghi chép.'`), ESC (pause), arrows/WASD/ENTER for the pause menu as `CampaignScene` did.
  - `update(dt)`: player movement (locked during dialogue/pause); `level.update(dt, foot)`; Lumo: follow → `lumo.update(dt, player)`; travelling → fly toward `level.sealPosition(id)` at 90 px/s and call `lumoArrived` within 3px; holding → hover at the seal; the checkpoint id updates when the foot centre enters a checkpoint zone; `lanternSystem.update(...)` with `level.pedestalPosition(...)` when placed; `interactions.update(foot, !locked, …)`; HUD title `level.title`, objective/status from `level.hud()`, keys `{ move, run, interact, lantern: true, pulse: level.pulseMarks().length > 0, journal: true, hint: true, pause: true }`; exit check.
  - Saving: `requestSave()` marks dirty; at most one write per 300 ms, plus a write on shutdown. The save holds `levelId`, `checkpointId`, `lantern`, `lumo`, `journal`, `events`, and `levels[level.id] = level.getState()`. Player x/y are never saved.
  - On load with Lumo `travelling`, Lumo starts beside Nhinh and flies again; he is never placed on the seal as holding (puzzle-contracts §4).
- [ ] `MenuScene.ts`: `hasAnySave()` → `new V4SaveStore(safeLocalStorage()).hasSave()`; New Game clears only the V4 save, then starts `'V4Scene'` with `{ newGame: true }`; Continue appears when a V4 save exists and starts `'V4Scene'`. Old V2 save keys are neither read nor deleted.

## Task 7 — Review and verification (lead, not a worker)

- [ ] Review each task's diff against this plan before committing it (one commit per task).
- [ ] `npm run build` (then restore `dist/index.html` if the build should not be committed), `npm test`, remaining `scripts/check-*.mjs`.
- [ ] Play the test room in the browser preview: reference path, wrong-order recovery, F on the pedestal, Pulse + J, H three levels, reload mid-way (lantern on pedestal, latch engaged, Lumo travelling and holding), RULE_GAMES prompt behaviour around each control.

## Open questions for the user (not blocking Step 0)

- Is Pulse usable while the lantern sits on a pedestal? The base keeps "in hand and on" (`canPulse`).
- Is there a global key to recall Lumo, or only the markers V4 levels place? Step 0 uses a marker only.

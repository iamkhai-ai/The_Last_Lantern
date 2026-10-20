# Level 09 — The Dark Moon Observatory: implementation plan

Worktree: `codex/level-09-spatial-rebuild` (base `test-develop` @ `1928ae6`).
Scenario source: `docs/scenario/09-dark-moon-observatory.md`. Spatial spec: `docs/implementation/09-layout.md`.
Planned controller: `src/levels/ObservatoryLevel.ts`. Pure layout/state: `src/data/observatoryLayout.ts` (extracted from the existing `observatoryRooms.ts` + `ObservatoryPuzzle.ts`). Checks: `scripts/check-observatory.mjs`.
Scope: campaign index 8 only. Levels 05–08 are owned by other branches; do not touch them.

## Goal

Deliver a playable, readable Level 09 (Dark Moon Observatory) that closes the three-room puzzle: place the lantern on the lobby pedestal, latch Door A from inside the star-map corridor, call Lumo through the tube to hold seal C, aim G0→G1→G2, choose the splitter route that keeps the Sun lock lit while shadowing the root bed, grow the root bridge, cross to the observatory, latch the final door, open the return loop, retrieve the lantern, recall Lumo, read the final record beside The Shadow and take the Balance Crystal. Player flow and object collision are the priority; every guidance line states the next physical action in plain Vietnamese.

## World model (three packed rooms)

Three 640×360 rooms, not one: `entrance` (lobby), `corridor` (star-map corridor) and `observatory` (observatory). The authored room bases `lobby-base.png`, `star-chart-base.png`, `observatory-clean-base.png` (and `observatory-base.png` for the final memory) paint each room; the controller owns all index-8 building, updates, story, HUD text, hints, journal and save checkpoints inside the existing CampaignScene. Room transitions reuse the existing door/exit machinery (`roomDoors`, `transitionObservatory`).

Light model (matches scenario §4 and the task13 staging):
- A single lantern source (on the lobby pedestal) feeds G0. G0=0 aims at Door A eye (opens Door A); G0=1 sends the beam up the tube to Lumo's seal C, then on to G1.
- G1=2 reflects the beam on to G2. G2=0 aims directly at the Sun lock (opens the final door but lights the root bed, so no bridge). G2=1 aims at the fixed splitter.
- The fixed splitter has two fixed branches: upper → Sun lock, middle → root bed via the statue's position. Statue facing 2 (wide face) shadows the root bed while the upper branch keeps the Sun lock lit → root bridge grows.
- Bridge eligibility: Sun lock lit AND root bed shadowed AND Lumo holding seal C. Lumo's light never opens the Sun Flower / retracts roots by itself (scenario §3, level 07 rule reused).

Derived states (never persisted): door-a-open, sun-door-unlocked, root-bed-shadowed, bridge-eligible, bridge-deployed, root-bridge walkable, final-door-latched, return-loop-open, record-read, crystal-taken. All recomputed from flags + mirror/statue rotations + Lumo arrival on load.

## Player flow (shipped target)

1. Spawn in the lobby `(72,180)` (or the saved room/spawn). Opening 3-line exchange (scenario §2) plays once on first entry; Lumo flies to the tube inlet in the corridor but the player stays in the lobby.
2. **Lobby practice miniature** (south of spawn, `learned-marks-miniature` at 320,150): E inspects each learned mark (mirror, latch, Lumo pressure, broad statue, roots) — one-line captions, no new controls. Sets `l8-miniature-viewed`.
3. Place the lit lantern on the pedestal `(170,202)` stand: `l8-lantern-placed`, beam G0→Door A eye. G0 starts at 0 (Door A).
4. Walk to Door A `(555,190)` stand and E: enter the corridor (Door A opens while the beam holds it). Inside, E at the latch `(72,180)` sets `l8-door-a-latched` — Door A stays open after the beam moves.
5. Call Lumo: E at the tube inlet `(105,112)` sends Lumo through the tube to seal C `(320,112)`; sets `l8-lumo-arrived`, `l8-lumo-room='corridor'` at seal. While Lumo holds the seal, the beam can be re-aimed.
6. Re-aim G0 to 1 (E at G0, stand 448,184): beam G0→tube→seal→G1. Rotate G1 to 2 (E at G1, stand 235,176): beam G1→G2.
7. In the observatory, rotate G2 (E at G2, stand 144,158): 0 = direct Sun (opens final door but lights roots, no bridge) — plays the two-line "Cửa đã mở… rễ vẫn sáng" exchange once; 1 = splitter route.
8. Rotate the statue (E at statue, stand 314,192) to facing 2 (wide face) so the middle branch is shadowed while the upper branch lights the Sun lock. Bridge eligibility becomes true; root bridge deploys across the gap (star-chart x545..640 → observatory x0..150 at y≈240).
9. Cross the bridge to the far bank `(470,276)` stand. If roots retract underfoot while crossing, they wait until the player reaches a bank (held-span safety, level 07 rule).
10. Latch the final door `(552,260)` stand: `l8-final-door-latched` (permanent).
11. Open the return loop: E at the stone control `(520,316)` stand sets `l8-return-loop-open` — a continuous stone strip at y≈319 connects lobby (x96) → star-chart (x125) → observatory (x290).
12. Retrieve the lantern from the pedestal (E at pedestal stand 170,202 with lantern in hand? actually lantern on pedestal → take it): `l8-lantern-retrieved`, lantern back in hand. Beam goes dark; doors stay latched.
13. Recall Lumo (E at tube inlet or seal): Lumo returns to follow; sets `l8-lumo-recalled`.
14. Read the final record (E at record stand 488,204): plays the full memory exchange (scenario §5), sets `l8-record-read`.
15. Take the Balance Crystal (E at crystal stand 574,204): sets `l8-balance-crystal`, grants the crystal, advances to Level 10.
16. Return loop stays open for backtracking to the lobby/source/call point even with light off.

Failure/order recovery: intermediate states are retained; re-aiming G0 away while Lumo holds the seal only pauses the downstream beam (plays "Tôi vẫn giữ ấn…"), it does not reset the network. Roots retracting underfoot wait for a bank. Save/restore uses the three documented checkpoints (before bridge / across bridge before loop / after loop) and never places Nhinh on a retracting bridge or behind a closed door.

## Object placement, layering, occlusion

See `09-layout.md` for the full coordinate table. Summary of what is on top of what and what hides what:
- Base room art at depth 0 (`lobby-base`, `star-chart-base`, `observatory-base`/`observatory-clean-base`). Walkable floor art (stone paths, bridge deck, return-loop strip) at depth 4–5, below feet.
- Standing props (pedestal, G0/G1/G2, splitter frame, statue, Sun lock, final door, return-loop control, record, crystal, pillars, table, Lumo tube/seal) use `10 + groundAnchorY/10` so the player y-sorts against them.
- The beam graphics layer sits at depth 7, above floor decor but below standing props, so a beam reads as light on the floor rather than overwriting props.
- The root bed is a dynamic solid (solid while roots are up; walkable once bridged) and its art (`root-bridge` spans) y-sorts at `10 + bottomY/10`.
- Latched doors keep their brace art at depth 12 above the player only when the player is below the door's footprint; otherwise the player reads in front.
- The memory overlay (scenario §5) renders at depth 95 above the room but keeps the room visible underneath (transparent amber).
- Icons (16×16 state stickers) at depth 6 beside their prop, on floor pixels, never over the actor.
- HUD text occupies y=0..58 and y=320..360; nothing playable is authored inside those bands except the bottom control hint line.

## Collision contract

- Shared actor body: 14×6 at `center + (-7, +16)`; feet line `center + (0,19)`. Pure layout, Arcade bodies and safe-restore all consume the same rectangles (RULE_GAMES, level 04 pattern).
- Three rooms, each with its own solid set (pillars, furniture, statue, root bed, doors). Door bodies are solid until opened; latched doors stay solid as scenery but their interaction opens the transition.
- Root bridge strip (star-chart x545..640 and observatory x0..150 at y≈240, 20px tall) is walkable only while deployed or while a span is held under the player's body; otherwise solid.
- Return loop strip (y≈319, x per room) is walkable only after `l8-return-loop-open`.
- Sluice/stone crossings between rooms are permanent solid stone once their door is open.
- Every interaction trigger sits at the object's south edge with radius 22–30 and a `canApproach` guard where the object can be reached from more than one side (RULE_GAMES). Door transitions use the documented gate/arch exception (trigger under the arch/door, approached from inside the level).
- Backtracking stays open: latched doors and opened loop are permanent. A save inside a closed area restores to the nearest safe point with the same body/solid predicate.

## Guidance contract

- Objective line states the immediate physical action per stage: `Đặt đèn lên bệ (E) → gài chốt cửa A (E) → gọi Lumo tới ấn (E) → xoay G0/G1/G2 → che rễ bằng tượng → qua cầu → gài chốt cửa cuối → mở lối vòng → thu hồi đèn → gọi Lumo về → đọc bản ghi → nhận tinh thể.`
- H hints follow scenario §7 in three levels, then point at the record/crystal once the network is solved.
- J journal records the learned facts: one source feeds all three rooms; latches hold a change while the lantern flips; roots need dark + Lumo at C + Sun lock lit; the bridge waits for a bank before retracting.
- Prompt labels are action-first Vietnamese (`E · Đặt đèn lên bệ`, `E · Gài chốt cửa A`, `E · Gọi Lumo tới ấn`, `E · Xoay G0/G1/G2`, `E · Xoay tượng`, `E · Gài chốt cửa cuối`, `E · Mở lối vòng`, `E · Thu hồi đèn`, `E · Gọi Lumo về`, `E · Đọc bản ghi`, `E · Nhận Tinh thể Cân Bằng`).
- Controls bar lists WASD / E / F / H / J / ESC. Prompts protect the actor, Lumo and the active prop art via `getProtectedPromptBounds`.

## Dialogue beats (complete scenario text)

Opening 3 lines (§2); miniature captions (§3); Door A open + latch (§4); Lumo call (§4); G2 direct route 2 lines (§4, once); splitter/shadow success; bridge crossing; final door + loop; lantern retrieval + Lumo recall; record memory exchange (§5, full); Shadow identity exchange (§5); crystal grant (§6); ending 3 lines (§7). The Shadow stays beside the record until the memory plays; he does not vanish on crystal grant.

## Persistence

- Reuse v1 save key and existing flag names for compatibility: `l8-g0`, `l8-g1`, `l8-g2`, `l8-statue`, `l8-door-a-latched`, `l8-final-door-latched`, `l8-return-loop-open`, `l8-lantern-placed`, `l8-lantern-x/y`, `l8-lumo-room`, `l8-lumo-x/y`, `l8-lumo-destination`, `l8-lumo-arrived`, `l8-lumo-route-json`, `l8-lumo-route-index`, `l8-bridge-crossed`, `l8-record-read`, `l8-balance-crystal`, `l8-lumo-recalled`, `l8-miniature-viewed`, plus `progress.roomId`/`roomSpawn` and the counters `l8-g0/g1/g2`, `l8-statue`. Plant/beam states are always derived, never stored. Legacy saves load safely; unknown values ignored.
- Checkpoints: `player-level`/`player-x/y`, `lumo-x/y` saved on the existing cadence; restore uses `nearestSafeObservatorySpawn` with current crossing states and the three documented restore cases.
- `l8-lumo-route-json` stores the authored waypoint list so a save mid-flight continues from the stored index.

## Integration (CampaignScene, index 8 only)

- Construct `ObservatoryLevel` in `buildLevel` for `level === 8` (SleepingGarden/SleeplessTower pattern); skip generic `addNarrativeProps`, `registerLevel`, `buildCampaignBarriers`, generic spawn block and the generic `intro-8` dialogue for this level.
- Delegate `update`, H (`showHint`), J (`showJournal`), objective/status/controls text and protected prompt bounds to the controller. Remove the legacy index-8 routines so no second observatory barrier/visual pass runs.
- The playtest coming-soon gate is raised from `>= 4` to `>= 9` in this branch so index 8 is reachable; final gate value reconciles at integration (other branches own 05–07). Recorded in the report.
- The controller's `update` exclusively advances Level 08 Lumo and calls `lumo.update(dt, x, y, true)`; no second Lumo.update runs in the level 8 frame.

## Tasks

- [x] Write layout spec `09-layout.md` with zones, solids, crossings, module table, stands and depth rules (this commit).
- [ ] Register `lobby-base.png`, `star-chart-base.png`, `observatory-base.png` in `CampaignArt.ts` so the three room bases are available (this commit).
- [ ] Raise the coming-soon gate from `>= 4` to `>= 9` (this commit).
- [ ] Create `src/data/observatoryLayout.ts`: extract + harden the existing `observatoryRooms.ts` data (zones/solids/crossings/modules/stands), predicates (`doorAOpen`, `sunDoorUnlocked`, `rootBedShadowed`, `bridgeEligible`, `bridgeWalkable`, `heldSpan`, `isPositionSafe`, `nearestSafeSpawn`, `completionBlock`, save sanitize, legacy migration), and the three restore cases.
- [ ] Create `src/levels/ObservatoryLevel.ts`: render (room bases + overlays), physics solids, interactions (E/F/H/J), story beats, HUD/objective/status/controls, light→beam visuals, bridge occupancy holding, checkpoints, destroy.
- [ ] Integrate index 8 in `CampaignScene.ts`; remove legacy index-8 routines; keep every other level's behavior identical.
- [ ] Create `scripts/check-observatory.mjs`: geometry (solids vs stands, reachability flood-fill by stage), crossings by state, prompt side rules, state machine (beam routing, held moments, latch permanence), completion gating, restore safety, legacy-save migration.
- [ ] Verify: `node scripts/check-observatory.mjs`, `npx tsc --noEmit`, `npm run build`. Runtime smoke with a seeded `level:8` save.
- [ ] Write `docs/implementation/level-09-report.md` with exact commands/results and coordinate adjustments.
- [ ] Self-review the diff; no push, no merge, no save resets, no PNG/character edits.

## Risks and decisions

- Preview staging coordinates are illustrative, not collision-true; this plan's rects are authoritative (task13 README states previews are illustrative composites) and deviations are documented in `09-layout.md`.
- The task13 navigation proposal places G2/statue/splitter in the observatory; that placement is explicitly rejected (README: "The navigation proposal instead places G2/statue/splitter in observatory; that placement is not adopted because the scenario and task13 instruction take precedence"). This plan keeps G2/statue/splitter in the star-chart room per scenario §4.
- `observatory-base.png` already bakes the record + Shadow; `observatory-clean-base.png` is the empty version. Use clean-base while the record is unread and base while the memory overlay is active, to avoid double-drawing Shadow.
- Dark state must still be readable: darkness overlay keeps HUD and prompt depths untouched and the lantern glow stays lit.
- The legacy index-8 code remains in the tree until the controller lands; until then it is the runtime path. Do not delete it in the same commit as the controller (bypass first, delete later) to keep diffs reviewable.
- Multi-room restore is the highest-risk part: never restore onto a retracting bridge or behind a closed door; the three documented restore cases are the contract.

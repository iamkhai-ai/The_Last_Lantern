# Campaign layout rebuild

Date: 2026-10-16. Baseline: `origin/main` at `16e01e4`.

The long-term request is a deliberate rebuild of Levels 01–10 from the existing scenarios. The current authorized slice is **Level 01 only**, per the user's latest direction: finish levels one at a time. Plan the player route, object placement, overlap/occlusion and solid obstacles, then have `gpt-6-luna` at `high` implement. The user has authorized local implementation and delegated routine decisions; no further design confirmation is required. No push, merge, or public deployment is included.

## Documents

- [Design and common rules](campaign-layout-design.md)
- [Implementation plan](campaign-layout-plan.md)
- [Level 01 spatial layout](01-layout.md). Later levels are deferred.
- [Asset audit](asset-layout-audit.md), produced by a read-only Luna high task before the scope was narrowed. Its later-level notes are reference only.
- [Progress and decisions](progress.md)
- [Level 01 verification and review](level-01-verification.md)

`docs/scenario/*.md` remains the source of truth for dialogue, puzzle rules, story reveals, and completion. Layout documents specify spatial decisions absent from those scenarios. If a coordinate change is necessary, record the reason and update the layout before treating it as complete.

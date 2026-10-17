# Campaign layout rebuild

Date: 2026-10-17. Current slice baseline: `origin/main` at `0446554`.

The long-term request is a deliberate rebuild of Levels 01–10 from the existing scenarios, one level at a time. The current slice is **Level 04 only**, on `codex/level-04-spatial-rebuild`; Level 02 was accepted and integrated into main, while another chat owns Level 03. Plan the player route, object placement, overlap/occlusion and solid obstacles, then have `gpt-6-luna` at `high` implement. The user has authorized local implementation and delegated routine decisions; no further design confirmation is required. No push, merge, or public deployment is included in this Level 04 slice.

## Documents

- [Design and common rules](campaign-layout-design.md)
- [Implementation plan](campaign-layout-plan.md)
- [Level 01 spatial layout](01-layout.md), retained as context; ongoing work belongs to another chat.
- [Level 02 spatial layout](02-layout.md), [implementation plan](level-02-plan.md), [implementation report](level-02-report.md), and [final verification](level-02-verification.md).
- [Level 04 spatial layout](04-layout.md), [implementation plan](level-04-plan.md), and [implementation report](level-04-report.md). Levels 05–10 remain deferred.
- [Level 04 item art upgrade](level-04-prop-art.md):27 detailed mechanism states; local preview available, independent reviews blocked by the Luna usage limit.
- [Asset audit](asset-layout-audit.md), produced by a read-only Luna high task before the scope was narrowed. Its later-level notes are reference only.
- [Progress and decisions](progress.md)
- [Level 01 verification and review](level-01-verification.md)

`docs/scenario/*.md` remains the source of truth for dialogue, puzzle rules, story reveals, and completion. Layout documents specify spatial decisions absent from those scenarios. If a coordinate change is necessary, record the reason and update the layout before treating it as complete.

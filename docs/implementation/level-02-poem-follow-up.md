# Level 02 poem access correction

User feedback: the reading stone is too far from the start. Base `9c50579`. Narrow correction: relocate the poem to the entry path, immediately right of practice. Existing autonomous decisions and native Luna high delegation apply. Other levels and puzzle rules stay as authored.

## Implementation brief

- Poem ground anchor `(236,278)`, player stand/checkpoint `(236,284)`, base rectangle `[219,267,34,11]`. Native poem art remains 48×40, prompt remains anchorY-64 and radius24. Shared data supplies rendering, collider, cue, action, restore and route. No remote E reading.
- Replace every current-location guidance string in Level02 with a concise direction such as `Mẩu thơ ở bên phải bia tập, ngay trên lối vào.` Preserve poem text, existing durable flags, optional practice/poem behavior, rune order, saves, and the gate exit.
- Adjust only affected test positions, including post-open poem-to-gate route (go via safe southern/eastern lane, not through Moon/Star). Add pure direct entry-to-poem route/no-footprint-overlap/target-separation proof. Old saved positions near the old poem remain ordinary walkable floor; do not reset progress.
- Run focused pure contracts, nearest existing checks, browser script syntax, build and diff check; commit a narrow patch. Browser automation remains disabled in Work settings; NOT_RUN, do not bypass. Root gets two independent read-only reviewers on the frozen patch, records evidence and restarts human preview.

Ruling: move the clue closer rather than enlarge its interaction radius — makes the entry route coherent and keeps physical approach meaningful — cost if wrong: the clue may need a different entry position after user review.

Status: design recorded; implementation and final checks NOT_RUN. No image edits, dependencies, other-level behavior changes, remote publication or forced puzzle prerequisites.

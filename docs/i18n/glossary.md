# English localization — glossary and voice guide

Every translator (human or agent) works from this file. Runtime Vietnamese strings are the source of
truth; the catalogue key is the Vietnamese sentence, copied **byte for byte** from `src/`.

## Proper names — never translated

`Nhinh`, `Lumo`, `Elaria`, `The Last Lantern`.

## Terms — one English form, reused everywhere

| Vietnamese | English | Notes |
| --- | --- | --- |
| Cây Mẹ | Mother Tree | Always capitalised. |
| Tinh thể Ký Ức | Memory Crystal | |
| Tinh thể Hy Vọng | Hope Crystal | |
| Tinh thể Cân Bằng | Balance Crystal | |
| Ký Ức (speaker) | Memory | Speaker label only; the item is Memory Crystal. |
| Hệ thống (speaker) | System | |
| Lời dẫn (speaker) | Narrator | |
| Tiếng gọi (speaker) | A voice | |
| Người Bảo Vệ | The Guardian | Only from Level 09 onward; before that the character is `The Shadow`. Never merge the two labels. |
| The Shadow | The Shadow | Keep as-is. |
| Hoa Nhật | Sun Flower | |
| Rễ Nguyệt | Moon Roots | |
| Buồng Dẫn Nước | Inlet Chamber | |
| Buồng Chuyển Dòng | Relay Chamber | |
| Hành Lang Mực | Ink Corridor | |
| Khóa Nhật / Khóa Nguyệt | Sun Lock / Moon Lock | |
| Xung sáng | Light Pulse | Also `Pulse` in the HUD chip. |
| Sổ tay | Journal | |

## Voice

- **Nhinh** — grounded, observant, practical. Says what is visible before what is felt. No contractions
  (`do not`, `I am`). Second person to Lumo is `you`, never a title.
- **Lumo** — warm, earnest, a little self-doubting; light contractions (`don't`, `I'm`). Never snarky,
  never exposition-heavy; asks small honest questions.
- **The Shadow / The Guardian** — older and formal: `I shall`, `you will`, no contractions. Speaks in
  complete, deliberate sentences.
- **Narration (`Lời dẫn`)** — past tense, close third person on Nhinh, no gendered pronoun. Prefer
  `Nhinh` as the subject over inventing a pronoun.
- **System / Memory** — declarative, no personality.

## Mechanics of a line

- Copy the Vietnamese key exactly, including `…`, `—`, `“ ”`, and `\n`.
- Keep `{placeholders}` identical to the Vietnamese template.
- Keep line breaks used by puzzle cards (the Level 02 poem is two lines per card).
- English may be longer than Vietnamese, but a line is shown in a fixed box: aim for ≤ 1.25× the
  Vietnamese length where the line is a dialogue body.
- No solution spoilers that the Vietnamese line does not already give.

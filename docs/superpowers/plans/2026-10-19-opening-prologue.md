# Opening Prologue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox syntax. User-selected roles override defaults: Sol owns plan/art, DeepSeek implements, Luna reviews; no silent model fallback.

**Goal:** Thêm Tiếng gọi trong sương bằng bốn tranh và lời thoại trước New Game, nối an toàn vào Level 01 mà không đổi Continue hay puzzle.

**Architecture:** Một PrologueScene sở hữu cursor, thoại, ảnh, input và hiệu ứng của nó; data tĩnh ở một module riêng. Chỉ các lựa chọn bắt đầu campaign mới đi qua scene này, còn CampaignScene tiếp tục tiêu thụ newGame intent như trước. Không thêm state machine framework, storage flag, dependency, hoặc sửa bố cục campaign.

**Tech Stack:** Phaser 3, TypeScript, Vite single-file; Node assert scripts theo repo; Pillow chỉ ở bước chuẩn bị art do Sol làm.

**Spec:** Người dùng đã duyệt thiết kế ngày 2026-10-19. Bản gốc bị mất khi checkout chính đổi nhánh trong lúc làm; bản khôi phục kèm ghi chú provenance, không phải bản sao byte-exact, nằm ở [../specs/2026-10-19-opening-prologue-design.md](../specs/2026-10-19-opening-prologue-design.md). Bản khôi phục giữ nguyên cốt truyện, bốn panel/tám dòng thoại và các ràng buộc đã duyệt từ approved design summary và plan này.

## Global Constraints

- Người dùng đã duyệt plan và workspace cô lập ngày 2026-10-19; implement bắt đầu sau phê duyệt đó.
- Baseline: test-develop 4280fc92a5f60f438c3c78d1bdee153e5e3d0a81. Làm trong worktree feature mới, không ở checkout chính đang có việc dở hoặc worktree opening-prologue đang có việc dở. Tại thời điểm lập plan, checkout chính ở fix/levels-01-04-bugs, khác nhánh character khi bắt đầu; không nhập các sửa đổi đó vào feature.
- Không push/deploy, không di chuyển nhánh test-develop, không ghi đè thay đổi có sẵn. Chỉ stage file có tên trong từng task.
- Bốn PNG runtime 1280×720, tối đa 1 MiB/ảnh và 4 MiB/tổng trước base64; không import master vào Vite. Không thêm sprite Nhinh.
- Nhinh tay không; cảnh cuối có đèn tắt trên đất, không lộ mặt Lumo, không cấp item/flag hoặc spoiler puzzle.
- Lời thoại lấy nguyên văn phần 4 của spec khôi phục; không phát lại hai câu OPENING[0] trong prologue.
- Mỗi New Game/restart campaign được xem hoặc skip prologue; Continue/direct debug không phát. Không thêm localStorage hoặc thay schema save.
- Không chỉnh DialogueSystem chung: nó có layout cố định từ y=256 và tick SoundSystem không hủy được. Prologue dùng vài text object và bộ gõ chữ scene-local, không tạo hệ thống thoại tổng quát thứ hai.
- Bản đầu không tạo âm thanh mới. SoundSystem/mute hiện có giữ nguyên. Không xóa cờ/save thêm tại finish.
- Lát cắt demo 01–04 có plan/duyệt riêng sau prologue; không đổi guard campaign 10 màn để ép pass.

## Review Focus

1. Giữ Enter/Space/E khi chọn New Game: dòng đầu không được tua trước khi thả và nhấn lại, kể cả scene đã chạy trước đó. Task 2–3 kiểm tra bằng event thật trong harness và browser.
2. Skip ngay trong fade/typing hoặc double-click: chỉ một scene start, không callback/timer cũ. Task 2 kiểm tra.
3. Continue save thường/completed/legacy và restart bị hủy: không xóa sai save hoặc phát prologue. Task 3 kiểm tra.
4. Một hoặc bốn texture thiếu: nền dự phòng cho đúng panel, thoại và skip vẫn tới Level 01. Task 2 kiểm tra.
5. HTML single-file và viewport 640×360: ảnh không làm bundle kéo cả master; tiếng Việt/UI không che mặt/đạo cụ và pan không shimmer. Task 1 và 4 đo/xem trực tiếp.

## File map

- Create src/data/prologue.ts: dữ liệu bốn panel, texture key và thoại, không import ảnh hay Phaser.
- Create src/scenes/PrologueScene.ts: preload ảnh runtime tường minh, trình chiếu/input/cleanup, duy nhất một finish path.
- Create assets/prologue/runtime/{01-road-home,02-voice-in-trees,03-path-disappears,04-waiting-for-morning}.png: bản xuất do Sol bàn giao.
- Create assets/prologue/README.md: provenance/tóm tắt export; master giữ ngoài runtime glob, không đưa master vào app.
- Modify src/config/gameConfig.ts: đăng ký scene, không thay ordering Boot/Menu hiện có.
- Modify src/scenes/MenuScene.ts: chỉ New Game route và guard activation/cleanup listener cần cho route này; Continue giữ nguyên.
- Modify src/scenes/CampaignScene.ts: callback onRestart đã xác nhận ở create (baseline dòng 184), không sửa puzzle/update/collision.
- Modify src/scenes/EndingScene.ts: campaign Play Again sau xác nhận cũng là campaign mới, qua prologue; legacy Play Again giữ WorldScene.
- Create scripts/check-prologue.mjs: harness thực thi methods shipped thật, fake Phaser boundary cho unit/integration nhẹ.
- Modify scripts/check-campaign-ending.mjs: expectation route campaign mới qua prologue; giữ toàn bộ assertion xác nhận/reset/legacy/listener.
- Keep CampaignStartIntent.ts, CampaignSaveSystem.ts, DialogueSystem.ts, SoundSystem.ts, campaignLevels.ts và các layout nguyên trạng trừ khi tìm thấy bug thực sự và được Sol duyệt phạm vi.

### Task 1: Chuẩn bị bàn giao art và baseline cô lập

**Owner:** Sol; DeepSeek chỉ kiểm chứng/copy asset đã bàn giao, không tạo/thay tranh.
**Consumes:** artifacts/prologue/runtime/*.png và runtime-manifest.json tại checkout chính; spec và art-direction doc.
**Produces:** bốn runtime PNG trong assets/prologue/runtime, SHA-256 và báo cáo baseline; không thay master.

- [x] Worktree feature `feat/opening-prologue` đã được tạo từ đúng baseline `4280fc9`; path/branch đã kiểm tra và người dùng đã đồng ý isolation. Copy chỉ spec/plan/art đã xác định, không copy cả working tree dirty.
- [ ] Chuẩn bị node dependencies bằng lockfile tại worktree mới; chạy build ra thư mục task ngoài repo, rồi mọi scripts/check-*.mjs. Dừng và báo nếu baseline fail; không sửa test để giấu lỗi. Ghi Node version vì repo import .ts trực tiếp từ scripts.
- [ ] Xác minh bốn file được copy có cùng hash trong runtime-manifest, decode được, size=1280×720, mỗi file <=1048576 bytes, tổng <=4194304 bytes. Master không xuất hiện trong import runtime.
- [ ] Ghi provenance: ảnh tạo bằng công cụ image generation trong session Sol, requested size 1280×720 nhưng master thực tế 1672×941; centered crop 1664×936, nearest resize, palette 256 màu/no dithering; master cảnh cuối dùng v2 đã bỏ biểu tượng trên bia.
- [ ] Commit riêng docs/art sau kiểm tra, không stage dist hay file khác.

### Task 2: Trình chiếu prologue có test

**Files:** data/prologue.ts, scenes/PrologueScene.ts, scripts/check-prologue.mjs.
**Interfaces:**
- export interface ProloguePanel { readonly id: string; readonly textureKey: string; readonly lines: readonly { readonly speaker: string; readonly text: string }[] }
- export const PROLOGUE_PANELS: readonly ProloguePanel[]: ids tương ứng bốn tên file; textureKey='prologue-'+id; đúng 4 panel và 8 dòng thoại (1+3+2+2) theo spec.
- PrologueScene extends Phaser.Scene với key='PrologueScene'; init(): void, preload(): void, create(): void, update(time: number, delta: number): void.
- Scene-local methods showPanel(index: number): void, showLine(index: number): void, advance(): void, finish(): void, cleanup(): void. init reset tất cả state mỗi lần sử dụng. Không nhận/tự lưu campaign progress.

- [ ] Viết test đỏ: đúng 4 panel/8 dòng, thứ tự và copy; advance lần đầu hoàn tất chữ, lần sau sang dòng; chỉ hết dòng mới đổi panel; finish/skip gọi scene.start('CampaignScene', {newGame:true}) đúng một lần, kể cả skip trong fade và gọi finish hai lần.
- [ ] Thêm test đỏ: init sau lần chạy trước reset cursor và finishing guard; nhập repeat bị bỏ; mỗi Enter/Space/E đang giữ tại entry không advance cho tới keyup rồi keydown mới; pointerdown chọn menu không advance panel, và double-click bị debounce tối thiểu 140ms.
- [ ] Thêm test đỏ: textures.exists false cho 1 hoặc 4 ảnh dùng nền dự phòng, panel khác vẫn dùng ảnh; hết/skip vẫn finish; cleanup sau shutdown bỏ listener/tween/effect của scene, không gọi off/removeAllListeners toàn cục và không phát âm mới.
- [ ] Run node scripts/check-prologue.mjs; xác nhận FAIL vì module/method chưa có, không vì test import setup bị sai.
- [ ] Implement data và scene tối giản. Import bốn URL PNG tường minh trong scene; preload bằng textureKey; bỏ qua queue nếu texture đã nạp. Show nền #081d26 khi texture thiếu, vẫn vẽ thoại và skip.
- [ ] UI: ảnh full viewport 640×360; panel thoại đáy khoảng x=24,y=274,w=592,h=78, font Segoe UI 12px, speaker y=282, body y=300, wrap width 552, tối đa hai dòng; hint 9px y=344. Nút '[Esc] Bỏ qua' góc phải trên, bàn phím E/Enter/Space và click chỉ trong vùng thoại; skip không bubble thành advance.
- [ ] Typewriter scene-local trong update với 24ms/ký tự; đang gõ thì advance hiện đầy đủ; full rồi advance sang dòng tiếp. Crossfade 450ms khi đổi panel, finish fade 350ms. Không auto-progress; bỏ input advance trong fade, nhưng skip hoạt động.
- [ ] Dùng named handlers và KeyboardEvent.repeat; gate held entry bằng release thực tế, không chỉ delay 140ms. Click repeat dùng debounce và guard. Reset gate mỗi create; không trông chờ keyboard.disableGlobalCapture hoặc event.stopPropagation để thay logic.
- [ ] Chỉ dùng hiệu ứng ảnh/sương nhẹ nếu không làm shimmer/che chữ; tranh tĩnh là fallback hợp lệ. Scene shutdown dọn các thứ scene tự sở hữu. Không gọi SoundSystem trong prologue.
- [ ] Run check-prologue và build; PASS trước commit feat: add illustrated prologue scene.

### Task 3: Nối các entry campaign mới, giữ save lifecycle

**Files:** gameConfig.ts, MenuScene.ts, CampaignScene.ts, EndingScene.ts, check-prologue.mjs, check-campaign-ending.mjs.
**Consumes:** PrologueScene key và finish contract ở Task 2; consumeCampaignNewGameIntent giữ nguyên.
**Produces:** menu/restart/credits campaign mới → PrologueScene → CampaignScene(newGame:true), không route direct/debug/Continue.

- [ ] Viết test đỏ qua methods/callbacks thật: Menu New Game clear CampaignSaveSystem và SaveSystem đúng một lần rồi start PrologueScene; repeated activation không clear/start lặp. Test cả Enter/Space/E/click qua emitter, không chỉ gọi startNewGame trực tiếp.
- [ ] Viết test đỏ: Continue campaign thường không clear và vào CampaignScene; completed vào EndingScene; legacy giữ WorldScene/EndingScene cũ. Direct CampaignScene không bị intercept.
- [ ] Viết test đỏ: pause restart đã confirm clear campaign một lần rồi start PrologueScene; cancel không clear/start. Credits campaign Play Again giữ bước xác nhận, Cancel là lựa chọn an toàn, confirm clear đúng như baseline rồi qua PrologueScene; legacy credits không đổi.
- [ ] Run focused checks để chứng minh đỏ rồi sửa các route đúng nơi gọi. Đăng ký PrologueScene trong gameConfig. Không đưa prologue vào CampaignScene.create theo newGame vì sẽ gây vòng lặp khi finish truyền newGame trở lại.
- [ ] Nếu Menu cần teardown để tránh listener lặp, chỉ chuyển các handler đang có sang named handlers và gỡ đúng chúng ở shutdown; giữ các menu actions. Không refactor menu layout hoặc các scene khác.
- [ ] Update check-campaign-ending expectation từ CampaignScene sang PrologueScene chỉ ở campaign Play Again và thêm test hậu prologue vào campaign với newGame intent. Không bỏ assertion confirmation/clear/legacy.
- [ ] Run node scripts/check-prologue.mjs; node scripts/check-campaign-start-intent.mjs; node scripts/check-campaign-ending.mjs; node scripts/check-campaign-levels.mjs; toàn bộ check-*.mjs và build. Các guard 10 màn phải tiếp tục PASS nguyên ý nghĩa. Commit fix: route fresh campaigns through prologue.

### Task 4: Kiểm chứng, review Luna và handoff

**Files:** docs/implementation/opening-prologue-report.md; sửa source đúng findings đã xác minh nếu cần.
**Consumes:** revision/tree hoặc snapshot diff đã đóng băng, spec/plan, asset manifest và log test.
**Produces:** báo cáo evidence, findings resolved/deferred, trạng thái nghiệm thu; không tự deploy.

- [ ] Build với npm run build -- --outDir <task-output-absolute-path>; ghi module count, byte size HTML và so baseline cùng lệnh. Xác nhận không có master/storyboard/contact sheet trong payload. Không ghi đè tracked dist/index.html.
- [ ] Browser theo công cụ có sẵn: New Game từ từng Enter/Space/E và click, xem hết 4 cảnh, skip đầu/giữa/cuối, thử held input/double click, Continue, restart/cancel, menu đi lại hai lần, mute và console. Dùng origin/profile save thử riêng, không chạm save người dùng.
- [ ] Xem ở logic 640×360 và viewport desktop: chữ tiếng Việt đủ dòng, mặt/đèn/bia không bị UI che, Nhinh nhất quán, pan không shimmer. Chú ý cảnh 02 bàn chân gần mép panel; nếu bị che đáng kể thì báo Sol để chỉnh art/UI, DeepSeek không tự vẽ lại hoặc kéo méo ảnh.
- [ ] Nếu browser không khả dụng ghi NOT_RUN, không thay bằng HTTP200 hoặc fake renderer rồi gọi playthrough PASS. Full campaign 01–04 và human acceptance là các mục riêng chưa được suy ra từ prologue check.
- [ ] Giao Luna review read-only diff đóng băng + spec/plan/evidence. Ghi requested target gpt-6-luna; không ghi effort High/Xhigh nếu tool không xác nhận. Sol xác minh findings, giao DeepSeek sửa có phạm vi rồi chạy lại checks liên quan và cả suite trước kết luận.
- [ ] Báo người dùng: file/commit nào thay đổi, PASS/NOT_RUN, giới hạn còn lại, cách xem preview nếu đã được yêu cầu và chuẩn bị lát cắt demo riêng. Không tuyên bố cả mục tiêu release hoàn thành chỉ vì prologue đã xong.

## Trạng thái lúc viết plan

Sol đã tạo bốn cảnh và sửa bia cảnh 04 để bỏ biểu tượng không đúng. Bốn runtime PNG đã decode/check đúng 1280×720 và có hash khác nhau, tổng 2,515,034 bytes (~2.40 MiB), mỗi ảnh dưới 1 MiB. Master giữ nguyên. Đã xem trực tiếp bốn runtime qua image tool; chưa xác minh cùng UI thật hoặc browser.

Worktree implement `feat/opening-prologue` đã được tạo từ baseline `4280fc9` sau khi người dùng duyệt plan và workspace cô lập ngày 2026-10-19. Bước chuẩn bị baseline/art không sửa product source; implement bắt đầu từ Task 2. Mô hình làm việc đã chốt, không cần chọn lại vai.

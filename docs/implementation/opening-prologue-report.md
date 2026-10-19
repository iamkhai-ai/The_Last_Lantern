# Tiếng gọi trong sương — báo cáo triển khai và kiểm chứng

Ngày: 2026-10-19 (Asia/Saigon).
Báo cáo lịch sử của giai đoạn prologue trước khi thêm demo/menu mới. Trạng thái kiểm chứng và bàn giao cập nhật: [demo-menu-integration-report.md](demo-menu-integration-report.md). Các mục bên dưới giữ nguyên bằng chứng tại thời điểm giai đoạn đầu.

## Revision và vai trò

- Branch: feat/opening-prologue, worktree D:/Z_PROJECT/The_Last_Lantern/the-last-lantern-prologue-sol.
- Baseline campaign: 4280fc92a5f60f438c3c78d1bdee153e5e3d0a81.
- Docs/art: 442ca6a2d25b65558331ae7f0019d042ab42941e.
- Frozen source reviewed/tested: 08a70b36ebde8c8447a1976c2082f31ce2d0c853; tree039e60162a440c9cb13c8af715b472907a9dcba3.
- Sol: thiết kế, ảnh, điều phối và kiểm chứng browser; DeepSeek implement; Luna review toàn bộ diff. Requested targets deepseek-account/deepseek-flash và openai-codex/gpt-6-luna. Không có tham số effort nên không khẳng định High/Xhigh hoặc DeepSeek V4.1 đã được áp dụng. Claude không được dùng.
- Runtime restart làm mất original workflow job trước khi code được lưu. Đã kiểm tra worktree sạch ở docs/art commit và không có job/agent chạy trước khi resume chính child DeepSeek cũ; không dispatch trùng.

## Thay đổi

- Bốn tranh pixel-art minh họa riêng, runtime PNG1280×720, tổng2515034bytes (~2.40MiB), mỗi file dưới1MiB; master không import vào Vite.
- PrologueScene và data bốn panel/tám câu thoại: manual advance, typewriter, crossfade450ms, finishfade350ms, Esc/nút bỏ qua, nền dự phòng theo từng ảnh, named input handlers và cleanup.
- Menu NewGame, confirmed campaign restart và campaign credits PlayAgain đi qua prologue. Continue, legacy flow, direct/debug CampaignScene giữ hành vi; không thêm save flag/schema/audio/item.
- CampaignScene chỉ đổi callback restart, không sửa puzzle/update/collision/layout. Bộ character đang dở và các worktree khác không bị feature sửa.

## Bằng chứng kiểm chứng

| Gate | Kết quả | Phạm vi |
|---|---|---|
| Export art | PASS | decode4 PNG, kích thước, hash, palette256, ngân sách; master không đổi |
| Test-first | RECORDED | test mới fail vì module prologue chưa có trước implement; sau đó28/28 PASS |
| Focused prologue | PASS | 28/28cases, thực thi shipped methods với fake Phaser boundary, không phải bằng chứng renderer |
| Full suite | PASS | tất cả17 scripts/check-*.mjs; Sol chạy độc lập lại cùng frozen source |
| Build | PASS | tsc --noEmit + Vite,632modules; Sol build lại ra verified-build ngoài tracked dist |
| Whole-feature Luna | PASS | Spec compliance và quality/correctness PASS, không actionable finding; static review không tự nhận browser PASS |
| Production-browser regression | PASS |15checks bằng Chrome headless/profile thử riêng trên build single-file |
| Human acceptance / full01–04 playthrough | NOT_RUN | Không suy ra từ prologue regression |

Lệnh kiểm chứng source: chạy từng node scripts/check-*.mjs rồi npm run build -- --outDir <task-artifact>/verified-build từ feature worktree. Tất cả exit0; git diff --check và status source sạch trước ghi report.

Build HTML14131826bytes, baseline10770032bytes, delta+3361794bytes phù hợp ảnh nhúng base64. Không kéo master/storyboard vào payload. Cảnh báo outDir nằm ngoài project là chủ đích để không ghi đè dist. Five pre-existing npm audit findings (1moderate,4high) còn nguyên; chưa được xử lý trong feature.

## Browser: hành vi đã đi thật

External browser script: D:/Z_PROJECT/The_Last_Lantern/the-last-lantern/artifacts/prologue/execution/browser-regression.cjs.
Evidence: cùng thư mục browser-evidence/report.json và panel-1.png tới panel-4.png, last-line.png, campaign-opening.png.
Browser dùng Playwright/Chrome headless, context tách biệt, viewport1280×720 với canvas logic640×360. Không dùng profile/save người dùng. Thao tác bằng keyboard/pointer; evaluate chỉ đọc state/định vị controls.

- NewGame bằng Enter, Space và E giữ tại entry: không nhảy panel/dòng đầu; release rồi fresh press sang cảnh sau; Esc skip vào Level01, không cấp sẵn đèn.
- Click NewGame, đọc đủ tám câu tiếng Việt đúng copy qua đủ bốn ảnh, kết thúc vào Level01 thường, lanternPickedUp=false.
- Reload rồi Continue: đi thẳng campaign, không prologue.
- Cùng runtime: từ game qua Pause→MainMenu→NewGame lần nữa, cursor reset ở panel01/dòng01; click Skip hoạt động.
- Không game page exception hoặc unexpected resource error trong các case trên.

Lượt browser đầu đã pass hành vi nhưng fail assertion console vì static server không có /favicon.ico. Log HTTP xác nhận tất cả sáu404 đều là request favicon tự động. Đã sửa phân loại bằng exact console source URL, giữ các cảnh báo trong report.hostingWarnings và lưu first-run-report.json; lượt sau exit0 với errors=[]. KHÔNG tuyên bố console hoàn toàn trống; không sửa source game, bỏ assertion hành vi hoặc bỏ qua lỗi tài nguyên khác để đạt PASS.

## Xem hình thực tế và giới hạn

Sol đã xem bốn screenshot browser. Mặt Nhinh, đốm sáng và đèn/bia đọc được; thoại tiếng Việt nằm trong panel, không tràn. Cảnh02 vẫn có mũi giày sát/bị panel đáy che một phần; không che mặt, tay hoặc đốm sáng. Đây là điểm thẩm mỹ để người dùng duyệt, không được gọi hoàn hảo. Hint nhỏ nằm sát mép dưới panel; chưa có review accessibility toàn diện.

Không thêm pan/sương động hoặc voice-over. Tranh tĩnh và crossfade là bản tối giản đã chọn để tránh shimmer và asset nặng. Mốc45–60giây chỉ là nhịp đọc dự kiến, không ép người chơi theo đồng hồ.

Fallback missing-texture, double-click/repeat, confirmed pause/credits restart/cancel, completed/legacy saves và cleanup có focused harness coverage; không phải tất cả được tái hiện ở browser. Chưa chơi liên tục toàn bộ campaign01–04. Chưa audit mobile/keyboard accessibility/hiệu năng diện rộng. Không tuyên bố production-ready deployment.

## Rulings của Sol

1. Worktree sibling riêng thay vì đổi .gitignore/nhánh checkout chung: tránh đụng việc đang dở; nếu cần phải đổi vị trí worktree sau này.
2. Spec khôi phục có ghi provenance từ nội dung người dùng đã duyệt, không byte-exact: bản gốc biến mất khi checkout chung đổi nhánh; nếu summary lệch phải sửa spec trước scope tiếp theo.
3. Brief/report/ledger để ngoài product worktree thay bash-only SDD helpers trên Windows: dễ giữ source sạch; phải tự kiểm tra đủ artifact.
4. Gộp Tasks2+3 thành một slice scene+routing để giảm vòng điều phối theo phản hồi người dùng; giữ full test suite và Luna review toàn feature; đánh đổi diff/rework lớn hơn.

## Tiếp theo

Preview local kiểm tra tại http://127.0.0.1:5198/ khi managed preview còn chạy; đây không phải deploy public. Chọn Trò chơi mới để xem.

Campaign vẫn có10màn và guard gốc còn nguyên. Bản demo01–04 cần lát cắt riêng (release configuration, điểm kết demo, label và xử lý save cấp cao không mất dữ liệu), plan/duyệt riêng trước implement. Không tự merge/push/live deploy. Phần mở đầu đạt gate kỹ thuật nêu trên; toàn bộ mục tiêu phát hành chưa được đánh dấu complete.

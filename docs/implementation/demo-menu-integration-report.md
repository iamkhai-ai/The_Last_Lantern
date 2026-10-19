# Prologue + demo 01–04 + menu mới — kiểm chứng tích hợp

Ngày: 2026-10-19 (Asia/Saigon).

## Phạm vi và quyết định

- Tiếp quản phiên Story theo yêu cầu người dùng, không làm lại prologue/art đã hoàn thành.
- Người dùng cho phép giữ và tích hợp bản thiết kế menu chưa commit cùng prologue/demo, rồi merge vào `test-develop`. Không push/deploy.
- Baseline `test-develop`: `ccf59b8`; feature nguồn: `2edbc37`. Merge baseline vào feature tại `04b14cb` giữ nguyên bộ forest sprite drafts.
- Menu mới giữ nền rừng tĩnh, typography/nhãn tiếng Việt, dấu chọn không dịch chữ, hiệu ứng nhẹ và reduced-motion. Luồng New Game mới/đã xác nhận đi qua prologue; Continue bỏ qua prologue.
- Cả full và demo đều hỏi xác nhận khi có campaign/legacy save. Mặc định Quay lại; hover không đổi lựa chọn xóa; phải nhả đúng phím đã mở hộp thoại trước khi xác nhận bằng bàn phím. Save được kiểm tra tại lúc kích hoạt, không dùng cache menu để quyết định xóa.
- Demo vẫn chỉ chơi index 0–3; save ngoài phạm vi/completed/legacy bị chặn nhưng không ghi lại/xóa. Kết màn 4 không tạo save index 4 hay kết thúc campaign đầy đủ.

## Cách build

Mặc định không đặt biến là **full 10 màn**. Bản demo cần đặt flavor rõ ràng:

```powershell
$env:VITE_BUILD_FLAVOR='demo'
npm run build
Remove-Item Env:VITE_BUILD_FLAVOR
```

`full` giữ campaign đủ 10 màn. Giá trị flavor không hợp lệ bị từ chối khi game nạp module; đây không phải kiểm tra lỗi ở bước build. Demo không loại bỏ tài nguyên/mã các màn sau khỏi bundle và không phải security boundary.

## Bằng chứng lần tiếp quản

- Test-first: menu full với save xóa ngay trước tích hợp (RED: 2 clears, expected 0); sau tích hợp phải xác nhận (GREEN).
- Regression nhả sai phím: giữ Enter, chọn xóa rồi nhả E từng cho phép xác nhận (RED); guard so đúng activation key code sửa lỗi, test GREEN.
- `node scripts/check-menu-scene.mjs`: PASS, gồm giao diện, modal isolation, hover an toàn, chuột/bàn phím, full/legacy Continue, demo guard và shutdown named listeners.
- Tất cả **19** `scripts/check-*.mjs`: PASS; demo **28/28**, prologue **28/28**. TypeScript `tsc --noEmit`: exit 0.
- Vite build full và demo: exit 0, mỗi build 633 modules. Build ra thư mục artifact ngoài worktree để không đổi tracked `dist`.
- SHA256 full HTML: `7A2FE9E80683C2E55249A6F9EEC20D19E6A381A039BCA3FE06B47F5442FB7AAC`.
- SHA256 demo HTML: `EF94B098C5676F81B33C3E1F073B9CF8601BAB8A96013BF862CC59D04A1A3F94`.
- Review độc lập read-only: không còn actionable finding; reviewer tự chạy menu và demo focused checks.
- Chrome headless trên chính hai HTML single-file bằng `file://`, profile thử riêng: **15 full + 8 demo checks PASS**, errors/hostingWarnings đều rỗng. Full đọc đủ bốn tranh/tám câu, thử held Enter/Space/E, Continue, menu revisit, xác nhận full New Game và Skip. Demo thử blocked higher/completed saves, direct-entry guard, Cancel/Confirm, late save và kết demo qua transition hook.
- Đã xem screenshot menu và hộp xác nhận: chữ nằm trong khung, nút Quay lại được chọn mặc định.
- Script, JSON và screenshot: `D:/Z_PROJECT/The_Last_Lantern/the-last-lantern/artifacts/prologue/execution/takeover-verification/` (`full-browser.cjs`, `demo-browser.cjs`, `integrated-full-browser/`, `integrated-demo-browser/`).

## Bảo toàn công việc và giới hạn

Worktree menu cũ được chuyển sang `feat/menu-redesign-takeover-20261019`, giữ nguyên các thay đổi chưa commit (kể cả tracked `dist`) và file chưa track. Bản sao menu/test ban đầu giữ tại artifact `menu-original/`. Không reset/stash/ghi đè các worktree khác; checkout chính vẫn giữ nhánh art ban đầu.

Chưa chơi liên tục toàn bộ màn 1→4 và chưa thực hiện public deployment. Browser demo dùng prepared saves và gọi transition hook có chủ đích, không chứng minh đã giải hết puzzle. Không claim kiểm chứng mobile/accessibility toàn diện. Các báo cáo prologue/demo trước đó là lịch sử; bản này cập nhật trạng thái sau ghép menu.

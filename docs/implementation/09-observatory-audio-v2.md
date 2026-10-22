# Level 09 — âm thanh kịch bản v2

Ngày: 2026-10-22 (Asia/Saigon). Nhánh: `feat/level09-scenario-v2`.
Base: `5a1cf74`. Revision code: `195f212aa4c227b71f30c0fe5e902e28fc939a78`.

## Phạm vi và thiết kế

Theo danh sách âm thanh do người dùng cung cấp và `docs/scenario-v2/09-dark-moon-observatory.md`.
Toàn bộ âm thanh dùng Web Audio trong bộ tổng hợp hiện có; không thêm tài nguyên âm thanh hay dependency runtime.
Các nhóm dưới đây đối chiếu với số thứ tự trong yêu cầu.

| Mục | Triển khai |
| --- | --- |
| 1–3 | Theme `observatory`: gió đêm nhẹ, drone thấp, nhạc chung. Nhạc có gain riêng; giảm còn 0.2 khi đọc ký ức, xuống 0 trong 3.2 giây sau câu cuối của The Shadow rồi trở lại 1. Nền phòng vẫn chạy. |
| 4–5 | `wheelMemory` ở lời mở đầu; `observatoryRain` 2.5 giây tại lần Lumo thực sự tới ấn đầu tiên. Cờ nhớ có sẵn ngăn phát lại khi tải save. |
| 6–11 | Giữ tiếng gương và đèn; thêm `statueRotate`, `tubeOn`, `tubeOff`; nối `lightPulse` khi bộ chia bắt đầu nhận tia. |
| 12–14 | `lumoFly` khi gọi bay; `lumoLeave` khi thực sự rời ấn. Đứng bên Nhinh không thêm cue. |
| 15–19 | Nối latch cửa A/cửa cuối, tiếng mở/đóng cửa đá, `stoneRing` cho lối vòng, và cue từ chối cửa khóa. Cửa cuối có cả tiếng gài chốt và mở cửa. |
| 20–23 | `rootsWarm` khi luống chuyển sang hổ phách; `rootBridgeGrow`/`rootBridgeRetract`; bước chân `stone`/`root` theo vị trí thân bàn chân và trạng thái cầu đang triển khai. |
| 24–29 | `memoryImpact`, `memoryWaterFade` kèm giọt giảm dần, `memoryCracks` ba tiếng, `memoryFlash`, `memoryMerge`; `memoryWeather` là lớp mưa/gió xa có bus và scheduler dừng được. |
| 30–34 | `marginInk` khi dòng mực hiện lần đầu; giữ tick thoại; nối pickup tinh thể một lần, pickup đèn, hợp âm bình minh khi chọn rời đài. |

`ObservatoryAudio.ts` lấy snapshot của nguồn, bộ chia, rễ, cầu và cửa rồi so sánh hai lần cập nhật.
Snapshot đầu tiên không phát cue; qua phòng giữ snapshot để không phát lại cơ chế đang mở.
Cửa đã gài không phát tiếng đóng khi nguồn tắt. Khi cầu đang giữ an toàn dưới chân Nhinh,
nguồn có thể tắt trước nhưng tiếng co chờ tới lúc cầu thực sự rút.

Trong bản ghi, sau đoạn thoại Người Bảo Vệ: va bánh xe ở 0 ms, nước cạn ở 650 ms,
ba tiếng rạn ở 2500 ms, flash ở 3700 ms, đoạn Lumo ở 5200 ms.
Hai nốt nhập vào nhau lúc hai hình chồng lên nhau. Weather dừng tại flash.
Các khoảng không có thoại giữ khóa di chuyển/tương tác để cue và khoảng lặng chạy đủ nhịp.
Timer, callback cũ và weather được hủy khi dọn phòng hoặc shutdown; mức nhạc được phục hồi.
Văn bản thoại, cờ tiến trình và luật câu đố vẫn dùng nguồn hiện có.

## Công thức, mức âm và vòng đời

18 công thức mới và hai bề mặt nằm trong `src/audio/effects.ts`.
`EFFECT_CATALOG` ghi thời lượng và mức đỉnh mục tiêu để kiểm tra bằng `OfflineAudioContext`.
Gain được cân chỉnh cố định từ kết quả render, không chuẩn hóa tự động trong game.
Mỗi gain cân chỉnh được một buffer source im lặng hữu hạn dọn bằng `onended` theo đồng hồ audio;
cách này cũng chạy khi render offline và không phụ thuộc timer tường khi AudioContext suspend.

Đo mono 48 kHz, đầu ra công thức trước master/compressor, `Math.random = 0.5`:

- Sự kiện chính mới: khoảng −14.01 đến −13.99 dBFS đỉnh.
- Stone: đi −24.88, chạy −23.77 dBFS; root: đi −25.18, chạy −23.65 dBFS.
- Mưa/bánh xe nhớ: −24; nước/weather ký ức: −22; rời ấn: −20; mực: −26 dBFS.
- Đây là mức đỉnh của từng cue, không phải loudness LUFS hay mức của toàn bộ bản mix chồng nhiều cue.

## Kiểm chứng

Kết quả browser và SHA256 của từng file nguồn nằm ở
[`level09-audio-browser-evidence.json`](level09-audio-browser-evidence.json).
Script browser tạo save kiểm tra trong Chromium headless riêng, gọi các control và phương thức runtime thật
tại các checkpoint đã dựng; đây không phải lượt chơi toàn tuyến bằng bàn phím của người chơi.

| Kiểm tra | Revision/scope | Kết quả |
| --- | --- | --- |
| Toàn bộ 38 `scripts/check-*.mjs` | Nội dung nguồn được commit thành `836c5e6` | PASS |
| `npm run build` | Nội dung nguồn được commit thành `195f212` | PASS |
| `node scripts/check-sound.mjs` | `195f212`, 18 case | PASS |
| `node scripts/check-audio-feedback.mjs` | `195f212`, 13 case | PASS |
| `node scripts/check-campaign-runtime.mjs` | `195f212`, 31 case | PASS |
| `node scripts/check-observatory.mjs` | `195f212`, hình học, trạng thái, save, H ladder và v2 | PASS |
| Chromium OfflineAudioContext | 22 render: 18 cue và 4 kiểu bước chân | PASS |
| Chromium scene runtime | 47 assertion/control checkpoint; không có page error | PASS |
| Người nghe đánh giá phối âm/tính chất âm | Chưa thực hiện | NOT_RUN |
| Playthrough thủ công toàn bộ 10 màn | Ngoài kiểm tra này | NOT_RUN |

Hai lỗi kiểm tra trung gian đã xử lý: bảng theme của test chưa biết `observatory`, và spy browser import
khác instance `SoundSystem` khi Vite dùng URL có timestamp sau hot reload. Test hiện lấy đúng URL dependency
từ module scene đã transform. Các lỗi này không được ghi thành PASS cho lượt chạy thất bại.

Chạy lại browser khi Vite đang phục vụ worktree này ở `127.0.0.1:5209`:

```powershell
python scripts/check-observatory-audio-browser.py --report docs/implementation/level09-audio-browser-evidence.json
```

## Review và finding

Hai reviewer mỗi vòng nhận brief riêng, cùng revision đông cứng; chỉ đọc theo hướng dẫn, không có sandbox
cưỡng chế riêng. Các cặp yêu cầu `gpt-6-luna`/`high` hoặc `xhigh` được metadata Codex hỗ trợ và dispatch chấp nhận;
runtime không trả danh tính model đã resolve. Cùng họ model vẫn có thể có điểm mù tương quan.

- Vòng 1, `836c5e6`: reviewer A có hai finding P2; reviewer B không có finding.
  - Gain cân chỉnh chưa dọn kết nối sau cue: đã sửa tại `195f212`, thêm kiểm tra cleanup.
  - Cửa cuối mở hình nhưng chỉ có tiếng latch: đã thêm cạnh mở cửa tại `195f212`, thêm kiểm tra.
- Vòng 2, `195f212`: reviewer A (`xhigh`) và reviewer B (`high`) đều không có finding cần xử lý.
  Cả hai xác nhận đã đọc source và hai sửa đổi của vòng 1; không tự chạy kiểm chứng runtime.
  Hai finding P2 vòng 1 được đóng bằng sửa đổi và re-review trên revision này, không dùng waiver.

Các commit là thay đổi local. Tình trạng kiểm chứng kỹ thuật không cấp quyền merge, release hay deploy.

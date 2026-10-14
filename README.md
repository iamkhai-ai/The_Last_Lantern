# The Last Lantern — Khu Rừng Ánh Sáng

Trò chơi **2D Top-Down Pixel Art Cozy Mystery & Light Puzzle Adventure** xây dựng bằng **Phaser 3 + TypeScript + Vite**.

## 1. Cách cài đặt & chạy dự án

```bash
npm install
npm run dev      # Khởi chạy máy chủ phát triển Vite (http://localhost:5173)
npm run build    # Kiểm tra kiểu TypeScript & đóng gói bản dựng production vào dist/
npm run preview  # Xem thử bản dựng production
```

> Ngoài ra, bản dựng tự chứa `dist/index.html` (và file `the-last-lantern-playable.html`) có thể mở trực tiếp trên trình duyệt desktop mà không cần cài đặt thêm công cụ.

## 2. Điều khiển (Controls)

| Phím | Hành động | Chi tiết |
| :--- | :--- | :--- |
| `WASD` / `Mũi tên` | Di chuyển 8 hướng | Chuẩn hóa vận tốc đường chéo (`105 px/s`) |
| `Shift` (giữ) | Chạy nhanh | Tăng tốc độ lên `150 px/s` |
| `E` | Tương tác / Tiếp tục thoại | Kích hoạt bia đá, xoay gương, đặt/lấy đèn, nhặt tinh thể, chuyển vùng |
| `F` | Bật / Tắt đèn lồng | Thắp/tắt đèn trên tay; tắt đèn để trả lại cân bằng ở cảnh kết thúc |
| `Space` | Phát xung `Light Pulse` | Sóng ánh sáng lan tỏa `1s`, làm lộ cổ tự ẩn trong `5s` (hồi chiêu `3s`) |
| `H` | Gợi ý từ Lumo | Hiển thị lời khuyên ngữ cảnh của đom đóm Lumo |
| `Esc` | Menu tạm dừng | Tiếp tục, Chơi lại từ đầu (có xác nhận), Bật/Tắt âm thanh, Màn hình chính |

## 3. Cấu trúc mã nguồn

```text
src/
  main.ts                        # Điểm khởi đầu khởi tạo Phaser.Game
  config/gameConfig.ts           # Cấu hình Phaser 3 (640x360, pixelArt, Scale.FIT, Arcade Physics)
  types/gameTypes.ts             # Kiểu dữ liệu GameProgress (v1), ZoneId, QuestStage, CrystalId
  art/ProceduralTextures.ts      # Sinh toàn bộ sprite 2D pixel-art & hạt hiệu ứng bằng Canvas
  actors/Player.ts               # Nhân vật Linh (4 hướng, bobbing bước chân, trạng thái cầm đèn)
  actors/Lumo.ts                 # Đom đóm đồng hành Lumo bay lượn kèm vệt hạt sáng
  systems/LanternSystem.ts       # Quản lý vùng sáng ấm nhấp nháy, màn đêm, Light Pulse & Overload
  systems/InteractionSystem.ts   # Phát hiện vật thể gần nhất & hiển thị nhãn [E] chống double-trigger
  systems/DialogueSystem.ts      # Hộp thoại có hiệu ứng gõ chữ và khóa ưu tiên input
  systems/QuestSystem.ts         # Máy trạng thái nhiệm vụ & kiểm tra mở khóa từng khu vực
  systems/SaveSystem.ts          # Lưu/tải tiến trình an toàn vào localStorage (last-lantern-save-v1)
  systems/EffectsSystem.ts       # Đom đóm, sương mù trôi, gợn nước suối và pháo sáng hạt
  systems/SoundSystem.ts         # Bộ tổng hợp âm thanh WebAudio không phụ thuộc file âm thanh ngoài
  world/zoneDefinitions.ts       # Định nghĩa bảng màu, điểm xuất hiện và cổng chuyển vùng của 4 khu
  world/WorldFactory.ts          # Dựng địa hình, đường mòn, dòng suối, cây cối và vật cản vật lý
  puzzles/WoodsRunePuzzle.ts     # Chương 1: Soi Light Pulse & kích hoạt cổ tự Trăng -> Lá -> Sao
  puzzles/CreekMirrorPuzzle.ts   # Chương 2: Đặt đèn lên bệ & xoay 2 gương dẫn tia sáng mở cầu đá
  puzzles/RuinsBalancePuzzle.ts  # Chương 3: Mở khóa Nhật (Bật đèn) -> Nguyệt (Tắt đèn) -> Nhật (Bật đèn)
  ui/HUD.ts                      # Giao diện hiển thị đèn, 3 tinh thể, thanh hồi Pulse và mục tiêu
  ui/PauseMenu.ts                # Menu tạm dừng (Esc)
  scenes/BootScene.ts            # Khởi tạo tài nguyên
  scenes/MenuScene.ts            # Màn hình chính (New Game, Continue, Sound)
  scenes/WorldScene.ts           # Vòng lặp gameplay chính qua 4 khu vực & cảnh kết thúc
  scenes/EndingScene.ts          # Màn hình kết thúc The Last Dawn & Credits
```

## 4. Hướng dẫn giải 3 câu đố & Finale

1. **Mở đầu (Rìa Rừng & Heart Tree Hub):** Tiến tới bia đá cổ nhấn `E` gặp Lumo và nhận đèn lồng -> nhấn `F` thắp đèn -> nhấn `Space` phát xung sáng soi dấu chân -> tiến lên gốc **Cây Mẹ** nhấn `E` để mở lối Bắc.
2. **Chương 1 — Whispering Woods (`Tinh thể Ký Ức` - Vàng):** Bật đèn và nhấn `Space` để làm lộ 3 cổ tự ẩn trong 5 giây. Kích hoạt bằng `E` theo thứ tự: **Trăng (Trái) → Lá (Giữa-trên) → Sao (Phải)** rồi nhặt Tinh thể Ký Ức trước cổng.
3. **Chương 2 — Moonlit Creek (`Tinh thể Hy Vọng` - Xanh lam):** Nhấn `E` đặt đèn lồng lên bệ đá. Nhấn `E` tại **Gương 1 (dưới)** xoay về hướng `Đông - Bắc (↗)`, và tại **Gương 2 (trên)** xoay về hướng `Đông - Nam (↘)` để nối tia sáng sang viên đá bên kia suối. Đi qua cầu đá vừa hiện ra để đọc phù điêu và nhặt Tinh thể Hy Vọng.
4. **Chương 3 — Silent Ruins (`Tinh thể Cân Bằng` - Tím):** Phối hợp phím `F` và `E` theo thứ tự: **Khóa Nhật I (Trái, Đèn BẬT) → Khóa Nguyệt II (Giữa, nhấn F TẮT đèn) → Khóa Nhật III (Phải, nhấn F BẬT đèn)**. Trò chuyện với **The Shadow** tại điện thờ rồi nhặt Tinh thể Cân Bằng.
5. **Finale — The Last Dawn:** Quay về gốc **Cây Mẹ** nhấn `E` đặt đủ 3 tinh thể. Khi ánh sáng quá tải bùng lên, nhấn phím **`F`** một lần để tắt đèn lồng, khôi phục bình minh cho rừng Elaria.

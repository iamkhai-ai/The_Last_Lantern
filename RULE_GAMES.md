# RULE_GAMES.md — Luật thiết kế màn chơi (bắt buộc cho mọi agent)

Áp dụng cho toàn bộ The Last Lantern. Mọi session/agent khi thêm hoặc sửa vật thể tương tác phải theo các luật dưới đây. Nếu buộc phải vi phạm, ghi rõ lý do ngay trong code/data.

## 1. Prompt tương tác CHỈ hiện khi đứng ở MÉP NAM (phía trước) của vật thể

- Tâm vùng trigger (`x, y` truyền vào `interactions.register`) phải nằm ở mép nam / cạnh trước của vật thể — thường là `vật.y + nửa chiều cao visible + khe hở nhỏ`, bán kính nhỏ (≈22–24px). KHÔNG đặt trigger trùng tâm vật thể và KHÔNG dùng bán kính lớn chạm tới được phía bắc.
- Hệ quả bắt buộc: đứng phía sau lưng / phía bắc / đông / tây sát vật thể → KHÔNG được hiện prompt; chỉ khi vòng xuống phía trước (nam) mới hiện.
- Ví dụ chuẩn: `LIBRARY_LAYOUT.confirm = (320, 224)` — mép nam bệ giữa giếng màn 3, radius 22; bàn sách màn 3 đứng `(66, 278)`; các `stand` của creek nằm sát chân vật.

## 2. Vật phẳng trên nền (hốc, ô, phiến đá): trong ô + mép nam

- Với hốc/ô đặt phiến (4 hốc quanh giếng màn 3): prompt chỉ hiện khi người chơi đứng TRONG ô (`LibraryLevel.isPlayerInCell`, nửa ô 26px). Đứng ngoài ô (trên vành giếng, hành lang) → ẩn.
- Với bệ/trụ có khối: theo Luật 1 — đứng ở mép nam, không được hiện từ mọi mép.

## 3. Ngoại lệ hợp lệ (phải ghi lý do trong data)

- Cổng/vòm chuyển màn: trigger đặt ngay dưới vòm theo hướng đi vào (đi từ phía trong màn) — ví dụ `FOREST_EDGE.objects.gate.exit = (486, 151)`, `SHATTERED_CREEK.objects.exit.stand = (568, 286)`.
- Vật ven nước/chướng ngại không thể tiếp cận từ nam: đặt `stand` ở cạnh tiếp cận hợp lệ — ví dụ `SHATTERED_CREEK.objects.latchA/B.stand` nằm phía đường đi + khóa bằng `canApproach` theo bờ.
- Cả 10 màn đều mở trong chiến dịch. Mỗi màn có controller/layout riêng (màn 01–02 inline trong `CampaignScene`); mọi trigger phải theo luật này và được kiểm bằng script `scripts/check-*.mjs` của màn đó. Điều khiển đứng (có chân đế) chỉ trả lời E từ mặt nam của chân đế (`towerCanApproachFront` ở màn 06 là ví dụ); điều khiển tường/cửa dùng ngoại lệ ở mục này và ghi lý do trong data.

## 4. Quy trình kiểm tra

- Sau mọi thay đổi vùng tương tác: chạy `npm run build`, các script `scripts/check-*.mjs`, và playtest đứng ở 4 phía quanh vật thể (chỉ phía nam mới hiện prompt).
- Lỗi tham chiếu đã từng xảy ra: `library-confirm` / `library-crystal` từng bị đặt tại tâm ô giếng (đứng ở bất kì mép nào cũng hiện) — đã sửa về `LIBRARY_LAYOUT.confirm` (mép nam, radius 22).

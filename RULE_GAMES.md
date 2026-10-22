# RULE_GAMES.md — Luật thiết kế màn chơi (bắt buộc cho mọi agent)

Áp dụng cho toàn bộ The Last Lantern. Mọi session/agent khi thêm hoặc sửa vật thể tương tác phải theo các luật dưới đây. Nếu buộc phải vi phạm, ghi rõ lý do ngay trong code/data.

## 1. Prompt tương tác hiện khi chân đứng trong 8px tính từ MÉP NGOÀI của vật thể, ở mọi hướng

- Tầm với đo bằng khoảng cách giữa thân bàn chân (14×6, phần Arcade body chạm đồ vật) và khối va chạm của vật thể (`reach` với `face: 'any'`, `maxGap: 8`; xem `src/systems/interactionReach.ts`). Khoảng cách tính từ MÉP NGOÀI CÙNG của khối va chạm, không phải từ tâm sprite hay điểm `stand`: phía bắc, nam, đông, tây và các góc đều tính, góc đo theo đường chéo (`rectGap`). Khoảng cách ≤ 8px → hiện prompt; > 8px → ẩn.
- Vật mới khai báo `reach` (hoặc `isInReach` cùng định nghĩa, như `isPathElementInReach` ở màn 05) với `maxGap` 8. KHÔNG dùng bán kính quanh tâm vật để quyết định hiện prompt; `x, y` truyền vào `interactions.register` chỉ dùng để neo prompt và phân xử.
- Khi vùng 8px của hai vật chồng nhau, vật có khoảng cách nhỏ hơn thắng (qua `ownsPosition`); hòa thì giữ thứ tự đăng ký. Nên đặt vật cách nhau hơn 16px để không phải phân xử.
- Vị trí phải đi được: chỗ đứng nằm trong tường hoặc khối va chạm không bao giờ hiện prompt.
- Lý do đổi (2026-10-22): playtest màn 05 — đi quanh, sát hông hoặc phía sau cột gọi vẫn phải thấy `[E]`; luật cũ (chỉ mép nam, phải lùi xuống cách một đoạn) khiến prompt biến mất khi đi sát cột. Luật này thay luật "chỉ mép nam" cũ và bao gồm cả quyết định riêng của màn 02 (2026-10-20).
- Ví dụ chuẩn: `isPathElementInReach` (màn 05, `src/data/pathForTwoLayout.ts`) với hằng `PATH_REACH_GAP = 8`. Vật ở các màn khác còn theo luật cũ (mép nam, radius 22–24px) là nợ kỹ thuật: chuyển sang luật này khi được chạm tới, và ghi rõ trong data nếu tạm giữ.

## 2. Vật phẳng trên nền (hốc, ô, phiến đá): trong ô + mép nam

- Với hốc/ô đặt phiến (4 hốc quanh giếng màn 3): prompt chỉ hiện khi người chơi đứng TRONG ô (`LibraryLevel.isPlayerInCell`, nửa ô 26px). Đứng ngoài ô (trên vành giếng, hành lang) → ẩn.
- Với bệ/trụ có khối: theo Luật 1 — hiện từ mọi hướng trong 8px tính từ mép ngoài của khối.

## 3. Ngoại lệ hợp lệ (phải ghi lý do trong data)

- Cổng/vòm chuyển màn: trigger đặt ngay dưới vòm theo hướng đi vào (đi từ phía trong màn) — ví dụ `FOREST_EDGE.objects.gate.exit = (486, 151)`, `SHATTERED_CREEK.objects.exit.stand = (568, 286)`.
- Vật ven nước/chướng ngại không thể tiếp cận từ nam: đặt `stand` ở cạnh tiếp cận hợp lệ — ví dụ `SHATTERED_CREEK.objects.latchA/B.stand` nằm phía đường đi + khóa bằng `canApproach` theo bờ.
- **Màn 02 (Whispering Woods) — bia thơ và ba bia cổ tự: prompt hiện từ CẢ BỐN PHÍA (`isInReach`), theo quyết định thiết kế 2026-10-20.** Lý do: người chơi playtest đứng sau/sát hông bia vẫn phải thấy `[E]`, không chỉ khi vòng xuống mép nam. `isInReach` (`src/data/whisperingWoodsLayout.ts`, dùng chung với `isWoodsCenterWalkable` qua `woodsFootBody`) thay cho bán kính: thân bàn chân 14×6 nằm trong ~11px quanh footprint của bia ở bất kì phía nào. Mỗi bia vẫn giữ "lối vào nam" đã đặt (`WOODS_STONE_APPROACH_RADIUS` = 24 quanh `stands[id]`) vì đó là nơi màn chơi đặt người chơi — spawn màn (136,286) nằm 10px dưới `stands.poem`, và các `stand` của cổ tự là chỗ chơi thật. Bán kính 24px nhỏ hơn vùng chạm của bia bên cạnh nên không bia nào giật prompt của bia khác; `x`/`y` vẫn là `stand` để neo prompt và phân xử tie-break. Từ 2026-10-22 đây là một ca của Luật 1; hằng ~11px riêng của màn 02 đổi về 8px khi màn được chạm tới.
- Cả 10 màn đều mở trong chiến dịch. Mỗi màn có controller/layout riêng (màn 01–02 inline trong `CampaignScene`); mọi trigger phải theo luật này và được kiểm bằng script `scripts/check-*.mjs` của màn đó. Điều khiển đứng (có chân đế) trả lời E trong 8px tính từ mép ngoài của chân đế, mọi hướng (Luật 1); `towerCanApproachFront` ở màn 06 còn là bản mép-nam cũ, cần chuyển khi chạm tới. Điều khiển tường/cửa dùng ngoại lệ ở mục này và ghi lý do trong data.

## 4. Quy trình kiểm tra

- Sau mọi thay đổi vùng tương tác: chạy `npm run build`, các script `scripts/check-*.mjs`, và playtest đứng ở 4 phía quanh vật thể (prompt hiện ở cả 4 phía trong 8px, ẩn khi xa hơn 8px).
- Lỗi tham chiếu đã từng xảy ra: `library-confirm` / `library-crystal` từng bị đặt tại tâm ô giếng (đứng ở bất kì mép nào cũng hiện) — đã sửa về `LIBRARY_LAYOUT.confirm` (mép nam, radius 22).

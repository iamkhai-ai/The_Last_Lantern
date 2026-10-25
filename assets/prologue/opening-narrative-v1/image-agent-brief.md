# Brief cho agent tạo ảnh — 11 tranh mở đầu “The Last Lantern”

Bạn là agent tạo ảnh cho game 2D **The Last Lantern** (Phaser 3, khung hình 640×360). Nhiệm vụ: tạo **đúng 11 tranh minh họa riêng biệt** cho phần dẫn nhập trước màn chơi đầu tiên. Mỗi tranh đi kèm một trang lời dẫn; **lời dẫn do game tự hiển thị**, không vẽ chữ vào ảnh.

Chỉ tạo ảnh. Không sửa code, không tạo thêm biến thể ngoài số lượng yêu cầu (trừ khi một ảnh bị lỗi rõ ràng và cần tạo lại — ghi lý do).

---

## 1. Bối cảnh câu chuyện (để hiểu đúng tinh thần, không cần vẽ hết)

- **Bến Sương**: thị trấn nhỏ bên sông, có bến thuyền, chợ sớm, các xưởng sửa chữa và nhà dựng sát mép nước. Ban ngày sinh hoạt bình thường; mặt trời mọc và lặn bình thường.
- Ban đêm, **dãy đèn dọc bờ dẫn thuyền qua sương**; cùng nguồn năng lượng ấy giữ cho **các trạm bơm** chạy.
- Nguồn sáng đến từ **Elaria**, khu rừng ở đầu nguồn, đi xuống qua các tuyến dẫn và trạm bảo trì. Người dân được dạy rằng **khu rừng tích ánh mặt trời rồi chia một phần cho con người**.
- Truyền thuyết công khai: **Người Bảo Vệ** từng thắp sáng dòng sông trong một trận bão lớn và cứu hàng trăm người.
- Gần đây mất sáng thường xuyên hơn: bơm yếu, thuyền phải chờ, thợ chưa tìm ra nguyên nhân.
- **Nhinh** (~17 tuổi) là thợ học việc, sống cùng **mẹ** ở tầng trên xưởng sửa đèn. Mẹ bảo trì các trạm quanh bến. Nhinh khéo tay, tò mò, hơi nóng vội, mong được mẹ tin giao việc lớn.
- **Bác lái đò** quen thuộc từng chở Nhinh qua sông miễn phí khi cô còn bé.

**Bí mật phải giữ — tuyệt đối không vẽ:** nguyên nhân thật của các đợt mất sáng; khu rừng đang suy kiệt/héo úa; bóng ma “The Shadow”; cỗ máy trung tâm; cây khổng lồ phát sáng ở tâm rừng; tinh thể năng lượng; đom đóm Lumo; bất kỳ cảnh kết thúc nào.

---

## 2. Ảnh tham chiếu bắt buộc

Hãy dùng các file sau làm tham chiếu phong cách và tạo hình (đính kèm vào công cụ tạo ảnh nếu hỗ trợ ảnh tham chiếu/chỉnh sửa). Đường dẫn gốc:

`D:\Z_PROJECT\The_Last_Lantern\the-last-lantern\.claude\worktrees\opening-level00-v4\`

| Vai trò | File |
|---|---|
| Phong cách chủ đạo + kiến trúc bến | `assets\levels\00-workshop\illustrations\01-ben-suong.png` |
| Phong cách + Nhinh trong tranh | `assets\levels\00-workshop\illustrations\02-leaving-ben-suong.png` |
| Tạo hình Nhinh | `assets\character\source_sheets\nhinh_down_generated.png` |
| Tạo hình mẹ | `assets\levels\00-workshop\sprites\mother-front.png` |
| Tạo hình bác lái đò | `assets\levels\00-workshop\sprites\boatman-front.png` |
| Nội thất xưởng, chất liệu | `assets\levels\00-workshop\sprites\workshop-bg.png` |

Nếu công cụ của bạn không nhận ảnh tham chiếu, hãy bám thật sát mô tả khóa phong cách và nhân vật bên dưới.

---

## 3. Khóa phong cách chung (áp dụng cho cả 11 ảnh)

- Tranh minh họa game **pixel-edged painted** (cạnh pixel bậc thang, mảng màu rõ), mật độ chi tiết giống tranh tham chiếu; đọc rõ khi thu về 640×360.
- Không photoreal, không 3D render, không anime mượt, không vector phẳng.
- Bảng màu: gỗ ấm và đồng thau, tường vữa kem, sông và rừng màu teal; đèn là điểm sáng hổ phách ấm.
- Tỷ lệ **16:9 ngang, tràn viền**, không khung, không viền.
- **22% chiều cao phía dưới phải yên tĩnh** (mặt nước, sàn, bóng tối, ít chi tiết, không mặt người, không chủ thể quan trọng) vì game đặt dải lời dẫn ở đó.
- **Không có bất kỳ chữ nào**: không chữ trên biển hiệu, không caption, tiêu đề, bong bóng thoại, logo, watermark, mũi tên, sơ đồ, nhãn, giao diện.
- Ánh sáng và đèn mang tính đời thường, hữu ích; không tia laser, không hiệu ứng phép thuật rực rỡ.

## 4. Khóa nhân vật

- **Nhinh**: cô gái ~17 tuổi, mũ trùm đầu màu be/kem ôm khuôn mặt, tóc sẫm, **khăn quàng đỏ**, áo nâu, quần teal sẫm, ủng nâu. Trong 11 tranh này cô **không cầm đèn bảo trì** và không có năng lực phát sáng.
- **Mẹ**: phụ nữ trung niên, tóc nâu búi, có vệt tóc bạc, áo kem xắn tay, váy/tạp dề làm việc teal sẫm, tạp dề da nâu đựng dụng cụ.
- **Bác lái đò**: ông lão, mũ rộng vành nâu, râu bạc, áo sơ mi kem, gi-lê xám xanh, quần ô-liu có miếng vá, ủng nâu.
- Giữ nhất quán khuôn mặt, tỷ lệ, trang phục giữa các tranh.

---

## 5. Quy trình đề xuất

1. Tạo **Ảnh 01** trước, đối chiếu với tranh `01-ben-suong.png`. Đây là neo phong cách cho cả bộ.
2. Tạo **Ảnh 02–06** dùng Ảnh 01 + tranh tham chiếu làm tham chiếu.
3. Tạo **Ảnh 07** (lần đầu có Nhinh và mẹ cùng xưởng) làm neo cho nhân vật/nội thất.
4. Tạo **Ảnh 08–11** dùng Ảnh 07 + sprite nhân vật làm tham chiếu.
5. Sau mỗi ảnh, tự kiểm theo mục 8. Chỉ tạo lại ảnh lỗi; ghi lại lý do.

---

## 6. Prompt từng ảnh

Mỗi prompt dưới đây = **[STYLE BLOCK] + [SCENE]**. Dán STYLE BLOCK vào đầu mọi prompt.

### STYLE BLOCK (dùng chung)

```text
Production illustration for a cozy 2D adventure game, one page of an eleven-page opening sequence.
Match the supplied reference illustrations exactly in style: pixel-edged painted game art with stepped edges and crisp readable color clusters, rich but legible detail at 640x360, warm aged timber and brass, muted cream plaster, teal river and forest tones, amber practical lantern light. Not photorealistic, not 3D, not smooth anime, not flat vector.
Landscape 16:9, full bleed, no border or frame. Keep the bottom 22 percent of the image calm and low-detail (water, floor, shadow) with no faces or key subjects there, because the game draws its own narration band over it.
Absolutely no text of any kind: no lettering, signage writing, captions, titles, speech bubbles, logos, watermarks, arrows, labels, diagrams or user interface.
Character locks when present — Nhinh: girl about 17, cream/tan hood framing dark hair, red scarf, brown tunic, dark teal trousers, brown boots, no lantern in hand, no glowing powers. Mother: middle-aged woman, brown hair in a bun with a grey streak, cream rolled-sleeve blouse, dark teal work dress, brown leather tool apron. Boatman: elderly man, brown wide-brim hat, grey beard, cream shirt, slate-blue waistcoat, patched olive trousers, brown boots.
Do not depict: a dying or withered forest, a giant glowing central tree, energy crystals, central machinery, a shadow spirit, fireflies or a firefly companion, monsters, villains.
```

### Ảnh 01 — `intro-01-town.png` — Bến Sương ban ngày

Lời dẫn (để hiểu ngữ cảnh): *“Bến Sương là một thị trấn nhỏ bên sông, có bến thuyền, chợ sớm, những xưởng sửa chữa và các ngôi nhà dựng sát mép nước.”*

```text
SCENE: Wide daylight establishing shot of Ben Suong, a small lived-in riverside town in soft golden morning light. Early market stalls with modest cloth awnings, a few small working boats at timber landings, repair workshops, close-set waterfront houses on stilts and stone quays, distant wooded hills under a clear sky. A few small anonymous townspeople going about ordinary morning work. Humble and warm, not a castle or grand fantasy city. Slightly elevated riverbank viewpoint. New composition, not a copy of the reference.
```

### Ảnh 02 — `intro-02-night-lights.png` — Đèn dẫn thuyền, trạm bơm

Lời dẫn: *“Ban ngày, nơi này khá bình thường. Khi đêm xuống và sương phủ mặt sông, dãy đèn dọc bờ dẫn thuyền về bến; cũng nguồn ấy giữ cho các trạm bơm chạy.”*

```text
SCENE: The same harbor at blue-hour night with soft mist over the river. A clear row of warm amber lamps on posts along the bank guides a small ferry with a few passengers safely toward the landing. On the near bank, a modest timber-and-brass pumping station with a small lit lamp and a steady stream of water pouring from its outlet into a channel. Calm, safe, useful everyday infrastructure. No magical beams.
```

### Ảnh 03 — `intro-03-elaria-source.png` — Nguồn từ Elaria

Lời dẫn: *“Nguồn sáng ấy không sinh ra ở Bến Sương. Nó đi xuống từ Elaria, khu rừng ở đầu nguồn, qua những tuyến dẫn và các trạm bảo trì dọc đường.”*

```text
SCENE: Wide landscape at late afternoon following the river upstream. The small town of Ben Suong sits in the near distance; the river winds back toward a large, healthy, deep-green forest called Elaria on the far hills. Along the riverbank path, two or three small old stone-and-timber maintenance stations stand at intervals, each with a small warm lamp, forming a gentle line of lights from the forest edge down to the town. Show the geographic link only: no visible cables, pipes, batteries, crystals, maps, arrows or diagrams.
```

### Ảnh 04 — `intro-04-stored-sunlight.png` — Rừng tích ánh mặt trời

Lời dẫn: *“Người dân được dạy rằng rừng Elaria có thể tích ánh mặt trời rồi chia một phần cho con người. Nhờ nguồn sáng ấy, đèn ở bến vẫn sáng khi đêm xuống.”*

```text
SCENE: A gentle, slightly storybook view of a healthy sunlit forest canopy. Shafts of golden daylight fall onto the leaves, and a soft warm amber glow seems to gather and rest within the foliage and the shaded forest floor, as if the forest is holding the sunlight. In the lower distance a faint, modest warm glimmer continues toward a tiny riverside settlement at dusk. Peaceful and reverent, like a lesson told to children. Lush and alive. No single giant tree as focal point, no machinery, no crystals, no explosions of light, no withered plants.
```

### Ảnh 05 — `intro-05-storm-rescue.png` — Truyền thuyết cứu hộ trong bão

Lời dẫn: *“Trẻ con ở bến lớn lên cùng câu chuyện về Người Bảo Vệ: trong một trận bão lớn năm xưa, ông đã thắp sáng dòng sông và cứu hàng trăm người.”*

```text
SCENE: A remembered historical rescue during a great storm long ago. Heavy rain, dark rolling clouds and a rough river. On a timber quay, a lone cloaked human keeper seen from behind, face not visible, raises his hand as a long line of bright warm lamps along the river blazes to life, cutting through the storm. Several crowded small boats and ferries follow the lights safely toward shore, where people wait. Mood: courage and relief, slightly painterly like a legend. No monster, no villain, no crown, no battle, no ghostly or shadow figure.
```

### Ảnh 06 — `intro-06-failing-lights.png` — Những đợt mất sáng

Lời dẫn: *“Nhưng nhiều năm gần đây, những đợt mất sáng đến thường hơn. Nước ở trạm bơm yếu đi, thuyền phải chờ ngoài bến, còn thợ sửa mãi chưa tìm ra nguyên nhân.”*

```text
SCENE: The same harbor in the present day at early evening. Some lamps along the bank are dim and flickering, others are dark. Two or three small boats wait out on the river, unable to come in. At the near pumping station, only a weak trickle of water comes from the outlet. Two ordinary workers with a toolbox kneel and inspect an opened station panel with a small hand lamp, puzzled. Mood: worry and practical frustration, not disaster: no fire, no flood, no ruin, no supernatural cause shown, no forest visible.
```

### Ảnh 07 — `intro-07-home-workshop.png` — Nhà và xưởng của hai mẹ con

Lời dẫn: *“Mẹ của Nhinh lo bảo trì các trạm quanh bến. Hai mẹ con sống ở tầng trên xưởng sửa đèn, giữa những hộp linh kiện và tiếng khách gọi cửa.”*

```text
SCENE: Cozy riverside lamp-repair workshop shown in a cutaway or open-front three-quarter view. Ground floor: workbench, shelves of boxes of small brass parts, hanging lanterns and tools. A wooden staircase leads to a small, lived-in upstairs home with a window, a bed and a potted plant. Through the open front, the familiar waterfront in warm afternoon light. The mother sits at the bench repairing an ordinary brass lantern; Nhinh nearby sorts small parts from a box. Same timber-and-brass materials as the reference workshop.
```

### Ảnh 08 — `intro-08-mothers-lesson.png` — “Ngoài kia còn người đợi đèn để về”

Lời dẫn: *“Từ nhỏ, Nhinh đã quen nghe mẹ nói: ‘Ngoài kia còn người đợi đèn để về.’ Với mẹ, sửa một chiếc đèn cũng là giúp ai đó trở về an toàn.”*

```text
SCENE: An intimate moment in the workshop at dusk. The mother and Nhinh stand side by side at the workbench beside an ordinary repaired brass lantern glowing softly. The mother gently points through the open window toward small ferry lights moving on the misty teal river outside. Nhinh looks out, attentive. Warm amber light on their faces, cool teal outside. Feeling of care for people returning home. No speech bubbles, no text.
```

### Ảnh 09 — `intro-09-apprentice.png` — Nhinh, cô thợ học việc

Lời dẫn: *“Giờ Nhinh chừng mười bảy tuổi, đang học nghề của mẹ. Cô khéo tay, tò mò, hơi nóng vội, và hay giữ đồ hỏng vì tin rằng mình sẽ sửa được.”*

```text
SCENE: Character-focused medium shot of Nhinh at her own small corner of the workbench, leaning in eagerly to examine a small dismantled brass lamp and a tiny retaining ring held up in her fingers, with a magnifier and small tools around. Beside her, a little crate full of saved broken trinkets: a cracked lantern, a bent gear, an old clock, a pulley. Curious, determined, slightly impatient expression. Keep her youthful face and outfit exactly per character lock. Warm workshop light.
```

### Ảnh 10 — `intro-10-earned-trust.png` — Mong được tin tưởng

Lời dẫn: *“Điều cô mong rất đời thường: được mẹ tin giao một việc lớn, được người trong thị trấn nhìn nhận như một người thợ thực thụ.”*

```text
SCENE: Quiet two-character workshop composition. In the foreground, Nhinh has neatly laid out a small finished repair on a cloth and glances hopefully toward her mother. In the mid-ground, the mother is absorbed in servicing a larger, more complex brass station component on a heavy bench, with a rolled maintenance map nearby. The gap between the small task and the big one should read clearly. Mood: hope and quiet ambition, not sadness, conflict or rejection. No thought bubbles, no award, no crowd.
```

### Ảnh 11 — `intro-11-boatmans-visit.png` — Bác lái đò mang đèn tới

Lời dẫn: *“Chiều hôm ấy, bác lái đò quen mang tới xưởng một chiếc đèn hỏng. Hồi Nhinh còn bé, bác vẫn chở cô qua sông mà không lấy tiền.”*

```text
SCENE: Late-afternoon golden light at the open workshop doorway facing the river. The elderly boatman, exactly per character lock, steps in smiling warmly and holds out a small unlit, slightly damaged brass lantern with its little door hanging open. Nhinh stands by the repair bench, turning to greet him happily. The mother works further back in the shop. His small wooden ferry is moored at the landing just outside. Friendly, familiar neighborhood moment. The lantern must be dark, not glowing; no money exchanged.
```

---

## 7. Đặc tả kỹ thuật đầu ra

- Định dạng **PNG**, **không trong suốt** (opaque), hệ màu sRGB.
- **Bản giao chính:** đúng **1280×720 px**. Nếu công cụ trả kích thước khác (ví dụ 1536×864, 1672×941), hãy giữ nguyên bản gốc và tạo thêm bản 1280×720 bằng crop giữa theo tỷ lệ 16:9 rồi resize. Không kéo méo ảnh.
- Thư mục giao (tạo nếu chưa có), tính từ gốc worktree ở mục 2:
  - Bản chính: `assets\levels\00-workshop\illustrations\intro\`
  - Bản gốc chưa chỉnh: `assets\prologue\opening-narrative-v1\sources\` với hậu tố `-raw.png` (ví dụ `intro-01-town-raw.png`).
- Tên file chính, đúng chính tả và đúng thứ tự:
  1. `intro-01-town.png`
  2. `intro-02-night-lights.png`
  3. `intro-03-elaria-source.png`
  4. `intro-04-stored-sunlight.png`
  5. `intro-05-storm-rescue.png`
  6. `intro-06-failing-lights.png`
  7. `intro-07-home-workshop.png`
  8. `intro-08-mothers-lesson.png`
  9. `intro-09-apprentice.png`
  10. `intro-10-earned-trust.png`
  11. `intro-11-boatmans-visit.png`
- Không ghi đè bất kỳ file có sẵn nào trong project.

---

## 8. Tự kiểm trước khi giao

Với từng ảnh, kiểm và ghi kết quả đạt/không đạt:

1. Đúng 1280×720, PNG, không trong suốt.
2. Không có chữ, ký tự giả, logo, watermark hay khung.
3. 22% dưới cùng đủ yên tĩnh để đặt lời dẫn.
4. Phong cách khớp tranh tham chiếu; không lệch sang 3D/photoreal/anime.
5. Nhân vật (nếu có) đúng khóa trang phục; Nhinh không cầm đèn bảo trì.
6. Không xuất hiện yếu tố bí mật ở mục 1.
7. Thu nhỏ về 640×360 vẫn đọc rõ chủ thể chính.
8. Nội dung khớp lời dẫn của trang đó.

Nên tạo thêm một **contact sheet** 11 ảnh xếp theo thứ tự, lưu tại `assets\prologue\opening-narrative-v1\contact-sheet.png`, để duyệt cả bộ.

---

## 9. Báo cáo khi xong

Trả lời bằng tiếng Việt, gồm:

- Danh sách 11 file đã giao (đường dẫn đầy đủ) và kích thước thực tế.
- Công cụ/model tạo ảnh đã dùng và prompt cuối cùng của từng ảnh, nếu khác prompt trong brief.
- Bảng tự kiểm mục 8 cho từng ảnh.
- Ảnh nào tạo lại, bao nhiêu lần, vì sao.
- Những điểm còn chưa đạt hoặc cần người duyệt quyết định.

Ghi chú quyền sử dụng: đây là ảnh do AI tạo cho project; không khẳng định giấy phép stock hay public domain.

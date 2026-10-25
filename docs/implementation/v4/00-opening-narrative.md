# Báo cáo: phần kể chuyện mở đầu (level 00 → level 01)

Nhánh: `feat/opening-level00-v4`, gốc `develop-v4` @ `134ad40`. Ngày: 2026-10-25.
Phạm vi: chữ và hành vi kể chuyện của xưởng (level 00) và đoạn mở level 01. Không đổi puzzle, collision, art, save schema
hay `saveVersion`; không thêm town map/quest/inventory; không sửa `docs/scenario-v4/00-original-*-verbatim.md`.

## 1. Xưởng — lời thoại cuối

`opening` (2 câu; câu 1 giữ nguyên):

> **Lái đò:** “Cô thợ ơi, chiếc đèn bác để trên bàn rồi đấy. Xem giúp bác với.”
>
> **Lái đò:** “Tối nay bác có chuyến qua sương; đèn sáng thì bác nhìn ra lối vào bến.”

`mother-work` (mới, tùy chọn; E vào Mẹ khi còn ở bước sửa/giao đèn):

> **Mẹ:** “Chiếc đèn nhỏ trên bàn này con thử giúp mẹ nhé.”
>
> **Nhinh:** “Mẹ cho con thử việc ở trạm một lần. Con đọc được mốc bảo trì rồi.”
>
> **Mẹ:** “Làm kỹ vào. Ngoài kia còn người cần đèn để về.”

`diagnosis` (5 câu gốc nguyên văn/thứ tự + 3 câu chen, tổng 8):

> Nhinh: “Đường trong xưởng thông rồi. Nhánh này vẫn yếu.”
> Mẹ: “Từ Elaria. Lâu lắm trạm ấy mới gửi tín hiệu.”
> **Mẹ (mới):** “Nguồn của bến đi từ rừng Elaria xuống, qua tuyến bảo trì cũ và trạm ở bìa rừng.”
> Nhinh: “Con biết đọc mốc bảo trì. Con tới trạm ngoài rừng xem.”
> **Mẹ (mới):** “Mẹ phải ở lại giữ bơm và đón thuyền. Ngoài kia còn người đợi đèn để về.”
> Mẹ: “Mang bản đồ. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.”
> Nhinh: “Lần này mẹ cứ để con sửa.”
> **Mẹ (mới):** “Cầm đèn bảo trì. Nó chỉ cấp nguồn thử cho máy, không thay được nguồn của bến.”

`payment` (3 câu trao đèn) và `inspect` giữ nguyên. Đổi tên: “trạm cửa sổ” → “bảng kiểm” ở lời gọi Mẹ
(`incident`) và HUD mục tiêu bước panel. Không còn câu nào hứa cứu thế giới, không nhắc Guardian/Cây Mẹ/thủ phạm/
nhịp nghỉ của rừng; rừng chỉ “chạng vạng” ở tranh 05, Bến Sương có ngày đêm bình thường.

## 2. Xưởng — sổ tay, HUD, H, focus

- J: `elaria-signal` giữ nguyên; `assignment` viết lại ngắn, đủ nhiệm vụ + lý do + giới hạn đèn, vừa hai dòng body
  trong hộp sổ tay (129 ký tự, nhãn “Tiếp” không còn chồng chữ): “Mẹ giữ bến, Nhinh kiểm tra trạm bìa rừng.
  Đường hỏng thì quay về, không đi đêm. Đèn bảo trì chỉ thử máy, không cấp nguồn cho bến.”
  Bản tiếng Anh 164 ký tự: “Mother keeps the harbour; Nhinh checks the forest-edge station. Broken road: turn back,
  no night walking. The lamp only tests machines; it cannot power the harbour.”
  Không thêm id journal thứ ba (tránh đổi ngữ nghĩa save); save cũ đã nhận nhiệm vụ đọc lại ý chính qua mục này.
  `completeAssignment` vẫn idempotent: không nhân đôi item/J.
- HUD: sau khi sửa đường trong xưởng mà chưa nhận nhiệm vụ → “Nghe mẹ dặn ở bảng kiểm.” (thay vì mục tiêu panel).
- H: bước giao việc có ba bậc riêng `workshop:assignment`; bảng kiểm vẫn được đánh dấu (focus) và vẫn có prompt cho
  tới khi nhận nhiệm vụ, kể cả khi tải lại giữa lúc chẩn đoán.
- Bác lái đò không biến mất giữa lúc trả tiền: `boatmanReturned` vẫn được ghi và lưu ngay, nhưng sprite còn đứng ở cửa
  trong suốt ba câu `payment` bằng cờ trình bày tạm `paying` (không lưu, không đổi đường đi, không đổi state).
- Mục `elaria-signal` được ghi TRƯỚC khi thoại chẩn đoán bắt đầu (không phải sau), và mỗi lần E lại bảng kiểm lúc chưa
  nhận nhiệm vụ đều phát lại effect journal đó — `host.addJournal` bỏ qua id đã có, nên tải lại giữa lúc chẩn đoán không
  còn làm mất ghi chép; nhiệm vụ vẫn chỉ được cấp sau khi thoại kết thúc (`completeAssignment`).

## 3. Năm dòng dưới tranh (level 00)

1. “Chiều xuống Bến Sương, đèn ven sông dẫn thuyền qua sương. Trong xưởng của mẹ, Nhinh vẫn là cô thợ học việc đang mong được giao việc lớn hơn.”
2. “Được mẹ giao việc, Nhinh mang bản đồ và đèn bảo trì theo đường ven sông. Sau lưng cô, mẹ còn giữ đèn cho thuyền và trạm bơm.”
3. “Trạm bìa rừng hiện ra lúc nhá nhem. Dấu bảo trì giống ở xưởng, nhưng những dòng hướng dẫn trên bia đã cũ.”
4. “Nhinh muốn kiểm tra tiếp, rồi nhớ lời mẹ dặn đừng đi khi trời tối. Cô đặt đèn cạnh bia, tựa vào gốc cây và chờ sáng.”
5. “Giờ này Bến Sương đã sáng. Đồng hồ của Nhinh cũng sang ngày mới, nhưng sương trong rừng không tan — buổi sáng ở Elaria vẫn như chiều tối.”

Mỗi dòng hai câu, không thêm chi tiết hình ảnh chưa có trong tranh. Chữ Việt nằm trong
`src/v4/levels/prologue-workshop/WorkshopLevel.ts` (khoá tra cứu) và bản dịch VI+EN trong
`src/i18n/entries/workshop.ts` (`v4.workshop.caption01..05`). Đã đo trên browser, xem mục 6.

## 4. Level 01 — thỏa thuận với Lumo

Cue mới `agreement` (`forest-edge:agreement`), bốn câu, phát một lần:

> **Nhinh:** “Tôi là Nhinh, thợ sửa đèn ở Bến Sương.”
>
> **Lumo:** “Còn tôi là Lumo. Tôi muốn về vườn của mình, nhưng cổng bảo trì đóng cả rồi.”
>
> **Lumo:** “Tôi biết đường qua thư viện và trung tâm trạm. Cậu giúp tôi mở lối vào vườn nhé?”
>
> **Nhinh:** “Cậu dẫn đường, tôi giúp mở lối vào vườn. Nhưng tôi phải kiểm tra nguồn của bến trước.”

- Điều kiện: `!played('agreement') && (played('opening') || live.doorAOpen)`. Ai soi mầm nghe tiếp ngay sau hai câu mở
  cảnh; ai bỏ qua mầm vẫn gặp thỏa thuận khi cửa A mở, trước câu Lumo nhận xét về cửa. Câu “đừng soi” vẫn chỉ phát khi
  mầm thật sự bị soi.
- Không phải cổng tiến trình: `forestExitReady` và các cue puzzle không đọc sự kiện này.
- J: khi thoại bắt đầu, ghi `agreement` → “Lumo muốn về vườn nhưng cổng bảo trì đóng. Cậu biết đường qua thư viện và
  trung tâm trạm; đổi lại, Nhinh giúp cậu mở lối vào vườn. Nhinh kiểm tra trạm trước.” Bỏ qua thoại hay tải lại vẫn giữ.
- Nhặt đèn (bản dựa trên slice trước): bước `take-lantern` cho HUD “Nhặt đèn cạnh bia để kiểm tra trạm.”, ba bậc H riêng,
  focus trên chiếc đèn; E nhặt xong trả về thang gợi ý cũ và giữ nguyên trạng thái F người chơi chọn.

## 5. i18n

- `src/i18n/entries/workshop.ts`: caption 01–05, câu mở thứ hai, ba câu chẩn đoán mới, ba câu `mother-work`, journal
  `assignment` mới, HUD “Nghe mẹ dặn ở bảng kiểm.”, ba bậc `workshop:assignment`, tên mới “bảng kiểm” (lời gọi + mục tiêu).
  Bỏ mục `toastMotherBusy` vì không còn dùng.
- `src/i18n/entries/forestEdge.ts` (mới): hai câu mở cảnh, bốn câu thỏa thuận, journal `agreement`, mục tiêu + ba bậc gợi ý
  bước nhặt đèn. Phần còn lại của màn 01 vẫn tiếng Việt (ngoài phạm vi).
- `scripts/check-i18n.mjs` (không `--strict`) PASS: `tr()` literal thiếu 0; dialogue coverage 45.5% → 61.1% (21 dòng còn
  thiếu thuộc moonlit-creek/forest-edge, ngoài phạm vi). Chế độ `--strict` vốn đã fail từ trước nhánh này.

## 6. Kiểm chứng cuối — 2026-10-26

- `npm test`: **30 file, 602 test passed** (baseline 569). Bao gồm test phục hồi khi tải lại giữa chẩn đoán,
  không nhân đôi ghi chép, J đọc xuyên màn nhưng không lộ mục chưa thu, và agreement không khóa câu đố/lối ra.
- `npm run build`: **PASS**, gồm TypeScript và Vite. Không thêm dependency hay thay lockfile.
- `node scripts/check-i18n.mjs`: **PASS** ở chế độ non-strict; các thiếu sót dịch ngoài phạm vi vẫn được in ra.
- `node scripts/check-i18n-runtime.mjs`: **9/9 PASS**.
- `git diff --check`: không có lỗi khoảng trắng.

### Trình duyệt thực — bản kiểm tra localhost:5175

- Đi bằng phím qua tranh đầu → xưởng → E kiểm tra đèn → khay/chọn vòng → sửa → trả đèn → bảng kiểm → bốn tranh
  chuyển cảnh → màn 01. Không đặt cờ nhiệm vụ hay dịch chuyển nhân vật để bỏ qua chuỗi thao tác.
- Đã kiểm tra `mother-work` tùy chọn. Bác lái đò còn hiện suốt cả ba câu trả tiền, rồi mới đi khỏi cửa.
- Tải lại ngay trong chẩn đoán: `elaria-signal` đã lưu, assignment chưa cấp; Tiếp tục vẫn có focus bảng kiểm,
  HUD và H đúng bước. E tiếp tục rồi hoàn tất cho đúng hai ghi chép `elaria-signal`, `assignment`, không lặp.
- Sang màn 01, mở J đọc được cả tín hiệu và nhiệm vụ của mẹ. Nhặt đèn bằng E giữ đèn tắt; HUD/H/focus đổi đúng.
- Bật F, đi qua vùng mầm: hai câu gặp đầu rồi bốn câu agreement; Nhinh chấp thuận rõ. Đặt đèn lên S1 vẫn mở A,
  các câu phản ứng sau phép thử tiếp tục bình thường. Đường dự phòng gặp Lumo khi A mở được kiểm bằng unit test.
- Đo bằng Phaser Text: cả năm caption VI và năm bản EN đều cao **34px**, nằm trong dải 74px. Ghi chép assignment
  VI/EN đều **34px**; trong J thực, đáy chữ ở y=320, không chồng nhãn Tiếp tại y=330. Các thoại đã đi qua cao 15–34px.
- Console lần tải cuối chỉ có log Vite/Phaser và thông tin 12 sprite dùng hình thay thế có sẵn; không thấy error/warning.

## 7. Bàn giao và giới hạn

- Implementer: DeepSeek V4.1 Flash theo yêu cầu người dùng. Task cho chọn model nhưng không có tham số ép mức
  reasoning High; không khẳng định đã thiết lập High. Thiết kế tham khảo Opus 5.5, lead tự kiểm diff/test/browser.
- Nhánh riêng `feat/opening-level00-v4`, gốc `develop-v4` @ `134ad40`; chưa merge/push/deploy.
- Bản build đã kiểm tra được giữ trong scratch; `dist/index.html` của worktree được trả về HEAD để không lẫn
  build output lớn vào commit source. Chạy `npm run build` trong worktree để tạo lại bản HTML tương ứng source.
- Hai bản nguyên văn, art, collision, luật nguồn/cửa/chốt và phiên bản save không đổi.
- Chưa có playtest với 3–5 người mới, chưa đo thời lượng đọc tự nhiên và chưa chơi hết chiến dịch. Không dùng test
  tự động để tuyên bố người mới đã hiểu cốt truyện. Cần lượt chơi của người dùng để đánh giá nhịp và độ rõ.

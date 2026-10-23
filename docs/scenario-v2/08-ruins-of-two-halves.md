# Level 08 — Ruins of Two Halves (v2)

**Tên màn:** Tàn Tích Của Hai Nửa.\
**Chặng:** Cân Bằng — bố trí ánh sáng và bóng tối trong cùng không gian. **Đỉnh thứ hai** của đường cong.\
**Nhân vật:** Nhinh, Lumo, The Shadow.\
**Đầu vào:** Đã cứu vườn ươm và biết Rễ Nguyệt cần bóng tối.\
**Mục tiêu:** Mở điện thờ Nhật–Nguyệt, tiếp cận The Shadow.\
**Kỹ năng mới:** Bóng như một công cụ, đặt đúng chỗ. Màn 7 dạy tắt đèn; màn này dạy **không tắt hết**.

**Trạng thái:** đã triển khai vào game trên `test-develop` (`883d589`: tên dưới tượng, The Shadow làm mẫu theo yêu cầu, giọng ba khóa). Bản này là nguồn chuẩn của Màn 08; [docs/scenario/08-ruins-of-two-halves.md](../scenario/08-ruins-of-two-halves.md) được giữ làm lịch sử. Chưa chơi thử thật.

> **Thay đổi so với bản hiện tại**
>
> - **The Shadow làm mẫu theo yêu cầu.** Người chơi có cơ hội thử tượng và các khóa trước. Chỉ khi họ chủ động xin gợi ý bằng E với The Shadow hoặc H đạt mức 2 trở lên, một lần duy nhất, ông mới minh họa việc che luồng giữa. Tắt đèn chỉ nhận phản hồi ngắn; nó không tự khởi chạy cảnh.
> - **Bẫy của màn 7 được gọi tên:** tắt đèn làm Nguyệt đủ tối nhưng hai Nhật tắt theo. Lumo nói ra điều vừa xảy ra.
> - **Âm thanh của ba khóa:** hai giọng sáng cho hai Nhật, một giọng trầm cho Nguyệt khi đủ tối. Ba giọng cùng lúc là hợp âm.
> - **Mạch phụ “Những dấu nhỏ” (4/5):** một cái tên mòn dưới chân tượng, chỉ hiện bằng Pulse.
> - HUD chỉ nêu mục tiêu.
> - Giữ nguyên: bố cục, tượng bốn nấc, gương, bộ chia cố định, bảng chân trị, cảnh trong điện thờ và lời cảnh báo chưa trọn.

## 1. Không gian và nhịp cảm xúc

Điện thờ có hai khóa Nhật hai bên và khóa Nguyệt giữa sân. Một tượng đá cao đứng trên đế xoay, sau tượng là luống mầm nhỏ. The Shadow liên tục chuyển vị trí để che những vệt sáng trắng còn rò từ mạch cổ.

Ban đầu người chơi có thể nghi ngại hình bóng. Cảnh không có truy đuổi, đánh nhau hay âm thanh dọa bất ngờ. Sự thật hiện ra khi người chơi làm đúng điều The Shadow đang làm: giữ một vùng tối cho cây.

Ở bản v2, The Shadow không chỉ là người được gặp ở cuối màn. Ông là người giải đố đầu tiên của điện thờ, và ông đã giải nó bằng cách tự đứng chắn suốt nhiều năm. Câu đố của người chơi là tìm cách để ông được thôi. Nó vang lại Lumo ở trạm nước và Người Bảo Vệ ở ngọn tháp: cả ba đều là những người giữ.

## 2. Mở cảnh — người đứng chắn sáng

**Lumo:** “Hình bóng đó lại ở kia.”\
**Nhinh:** “Nó không tiến về phía mình. Nó đang nhìn xuống đất.”

*Nhinh bước tới mép sân. The Shadow giơ tay che mầm cây khỏi đèn.*

**The Shadow:** “Hạ ánh sáng xuống.”\
**Lumo:** “Chúng tôi đến để cứu Cây Mẹ!”\
**The Shadow:** “Vậy hãy nhìn thứ đang ở dưới chân ngươi.”

*Máy quay nhẹ xuống luống cây, rồi trả quyền điều khiển.*

**Nhinh:** “Cây non. Giống trong khu vườn.”\
**Lumo:** “Chúng ta sẽ giữ đèn cách xa.”

## 3. Khu thử an toàn — bóng của một vật thể

Một bệ thử, cột đá xoay và phiến Nguyệt nhỏ nằm ở tiền sảnh. Khi đèn bật, xoay mặt rộng của cột chắn đường sáng làm phiến Nguyệt ngân lên. Xoay sang mặt hẹp, ánh sáng lọt qua và âm tắt.

**Nhinh:** “Không cần tắt cả chiếc đèn. Chỉ cần che đúng chỗ.”\
**Lumo:** “Phía ngoài vẫn sáng, còn sau cột thì tối.”

Mặt đất thể hiện vùng bóng với viền rõ. Ký hiệu trên phiến đổi từ khép sang mở khi đủ tối, giúp người chơi hiểu điều kiện thay vì đoán theo độ tối màn hình. Phiến thử dùng đúng giọng trầm của khóa Nguyệt chính, để tai người chơi nhận ra nó khi gặp lại.

## 4. Câu đố chính — hai Nhật, một Nguyệt

Bệ chính có bộ chia tia cố định đã hiện rõ đường nhánh. Hai gương bên dẫn tia tới khóa Nhật trái và phải. Luồng sáng giữa bệ hướng thẳng qua tượng tới khóa Nguyệt. Đế tượng có bốn nấc; chỉ nấc mặt rộng vuông góc với luồng giữa tạo bóng che trọn khóa Nguyệt mà không chắn hai nhánh bên. Bố cục giữ đúng [08-layout.md](../implementation/08-layout.md).

1. Đặt đèn đang bật lên bệ chính.
2. Xoay gương trái tới khóa Nhật trái và gương phải tới khóa Nhật phải.
3. Xoay tượng để bóng phủ khóa Nguyệt giữa. Hai tia bên vẫn phải tới khóa Nhật.
4. Khi hai Nhật sáng và Nguyệt đủ tối cùng lúc, vòng trên bệ xác nhận sáng đều. Dùng E với bệ xác nhận để gài điện thờ.
5. Cửa điện thờ và màn che luống cây được giữ bằng chốt. Thu hồi đèn rồi bước tới The Shadow.

Tắt đèn làm Nguyệt đạt điều kiện nhưng hai Nhật mất sáng; không giải được. Xoay tượng chắn nhánh trái hoặc phải cũng không giải được. Các khóa không ghi nhớ trạng thái sáng trước đó.

### Người giữ bóng (nhịp trợ giúp tùy chọn)

Người chơi có thể thử câu đố mà không bị ngắt. Chỉ một yêu cầu trực tiếp bằng E với The Shadow hoặc H ở mức 2 trở lên mới xin phép xem minh họa. Cả hai yêu cầu dùng cùng điều kiện đủ: đèn đang bật và đặt trên bệ, cả hai Nhật đang sáng, còn Nguyệt chưa đủ tối. Nếu điều kiện chưa đạt, phản hồi bằng lời gợi ý hiện hành; không khóa điều khiển và không ghi cờ đã xem.

Khi đủ điều kiện, khóa điều khiển trong cảnh. The Shadow đi từ luống cây tới chắn luồng giữa bằng thân mình (tư thế `shielding` đã có). Cảnh không đổi tượng, gương, đèn hay tiến trình câu đố; không thực hiện tương tác xác nhận và không lưu một trạng thái giải. Khi ông lùi về luống cây, dựng lại bóng và âm thanh theo cấu hình thật hiện tại. Chỉ ghi `l7-shadow-demo` sau khi cảnh chạy hết. Nếu người chơi đã tự giải, không phát minh họa hồi tố.

Khi người chơi chỉ tắt đèn, không có cảnh bóng che. Lumo nói ngắn gọn: **“Tối hết thì hai bên cũng ngủ.”** Tắt đèn không thể làm khóa Nguyệt sáng lên bởi The Shadow; khóa chỉ phản ánh cấu hình thực.

**Lumo:** “Hai bên đã đáp lại. Khóa giữa vẫn im.”

*Trong phần minh họa được yêu cầu:*

*The Shadow bước vào luồng giữa. Khóa Nguyệt lặng đi.*

**The Shadow:** “Chỉ cần chỗ này tối.” *(mới)*\
**Lumo:** “Ông ấy đang che luồng giữa bằng chính mình.” *(mới)*\
**The Shadow:** “Ta đã đứng như thế này rất lâu. Tay ta không giữ được nữa.” *(mới)*

*The Shadow lui về luống cây. Khóa Nguyệt chỉ trở lại trạng thái do đèn, tượng và gương hiện tại tạo ra.*

**Nhinh:** “Vậy mình tìm thứ có thể đứng đó thay ông.” *(sửa: thay “Ánh từ bệ vẫn rọi vào nó. Bức tượng có thể chắn luồng giữa.”)*\
**Lumo:** “Giống chốt ở trạm nước. Có thứ giữ thay thì người giữ mới được nghỉ.” *(mới)*

Câu cũ của Nhinh gọi thẳng tên bức tượng. Câu mới chỉ nêu điều cần tìm, còn khu thử đã dạy cột đá làm được việc ấy.

### Âm thanh của ba khóa

| Khóa | Khi đạt điều kiện |
| --- | --- |
| Nhật trái | Một giọng sáng, cao |
| Nhật phải | Một giọng sáng, thấp hơn một quãng |
| Nguyệt | Giọng trầm, cùng giọng với phiến thử |
| Cả ba cùng lúc | Ba giọng khớp thành hợp âm, vòng trên bệ sáng đều |

Mỗi giọng tắt ngay khi khóa của nó mất điều kiện. Ký hiệu khép/mở và vòng xác nhận vẫn là nguồn chính, nên tắt tiếng vẫn giải được.

### Khi bóng che đúng Nguyệt

**The Shadow:** “Giữ khoảng tối ấy.”\
**Nhinh:** “Tôi thấy rồi. Hai nửa có thể cùng tồn tại.”

### Độ khó

Mô hình ([puzzle-model.mjs](puzzle-model.mjs)): 64 cấu hình (tượng, gương trái, gương phải, mỗi thứ 4 nấc), **1** cấu hình đúng, 7 cấu hình thỏa đúng hai trong ba điều kiện. Đây là mô tả không gian cấu hình theo ý đồ, không chứng minh độ khó thực tế. Cái khó dự kiến nằm ở không gian, không ở số lượng; cần chơi thử để kiểm tra.

Rubric (xem [README](README.md)): Thông tin 1 · Kế hoạch 1 · Đồng thời 3 · Không gian 3 · Đảo luật 1 = **9**. Thời gian giải mục tiêu: 10–15 phút.

## 5. Trong điện thờ — lời cảnh báo chưa trọn

*Sau khi gài bệ, màn đá trượt tới che luống cây. The Shadow thôi dùng tay chắn sáng. Dưới chân ông, lá nhỏ ngẩng lên.*

**Nhinh:** “Ông đã bảo vệ chúng suốt thời gian này?”\
**The Shadow:** “Chúng là những mầm cuối cùng còn biết chờ đêm.”\
**Lumo:** “Tôi tưởng ông muốn giữ rừng trong bóng tối.”\
**The Shadow:** “Ta chỉ còn nhớ cách che cho chúng. Có quá nhiều điều ta đã đánh mất.”\
**Nhinh:** “Chúng tôi tìm được hai tinh thể. Mảnh cuối ở đâu?”\
**The Shadow:** “Trên đài nhìn trăng. Nơi ta đã dừng vòng trời.”\
**Lumo:** “Ông nói… ta?”\
**The Shadow:** “Hãy đọc bản ghi. Đừng chỉ nghe điều ta còn có thể nói.”

*The Shadow chạm vào một dấu vòng xoắn trên cửa Bắc. Lumo nhìn lại vết tương tự đã chép trong sổ.*

**Lumo:** “Dấu này ở đường hầm dẫn nước.”\
**Nhinh:** “Mình mang ký ức tới đài thiên văn. Có lẽ chúng sẽ ghép lại ở đó.”

Chưa gọi The Shadow là Người Bảo Vệ trong lời thoại của Nhinh hay Lumo. Câu “ta đã dừng vòng trời” là manh mối; xác nhận danh tính thuộc màn sau.

### Mạch phụ — cái tên dưới chân tượng (tùy chọn, “Những dấu nhỏ” 4/5)

Dùng Pulse gần đế tượng (khi đèn đang cầm trên tay), một dòng chữ khắc nhỏ hiện ra, mòn tới mức không đọc được.

**Nhinh:** “Có ai đó khắc một cái tên ở đây. Mòn hết rồi.” *(mới)*

*Nếu The Shadow đang ở gần, ông đứng yên (tư thế `stillness`) và không nói gì.*

Ghi vào trang sổ “Những dấu nhỏ” (4/5). Không đọc được tên, và không ai nói đó là tên ai.

## 6. Gợi ý H và lời thoại bổ sung

- **Mức 1 — quan sát:** “Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.”
- **Mức 2 — quan hệ:** “Hai khóa Nhật cần sáng cùng lúc. Khóa Nguyệt cần bóng của tượng, trong khi đèn vẫn bật.”
- **Mức 3 — bước tiếp:** “Đặt đèn, hướng hai gương vào hai Nhật. Xoay mặt rộng của tượng chắn luồng giữa tới Nguyệt, rồi xác nhận ở bệ.”

H nêu điều kiện đang thiếu nếu đã có một phần đúng. Nếu người chơi xin mức 2 hoặc 3 khi đèn đã bật và đặt, cả hai Nhật sáng, còn Nguyệt chưa đạt, họ đủ điều kiện xem minh họa tùy chọn. Sau khi điện thờ gài, H nhắc lấy lại đèn và nói chuyện với The Shadow.

Đọc lại bia điện thờ: **Bia đá:** “Mặt trời giữ đường đi. Mặt trăng giữ giờ nghỉ. Đừng đặt một bên vào chỗ của cả hai.”

**HUD:** “Mở điện thờ mà không làm hại luống cây.” → “Lấy lại đèn và nói chuyện với The Shadow.” *(mới)* Dòng trạng thái: ký hiệu khép/mở của ba khóa, không nêu tên điều khiển.

**Phản hồi ở cửa Bắc (giữ như bản hiện tại):** chỉ nêu bước còn thiếu kế tiếp và điều khiển của nó, theo `ruinsNextStep`.

## 7. Kết màn và trạng thái giữ lại

*The Shadow đi trước trên cầu thang Bắc. Ông không quay đầu, nhưng dừng lại mỗi khi Nhinh và Lumo chưa theo kịp.*

**Lumo:** “Tôi sợ điều mình sắp nhớ ra.”\
**Nhinh:** “Mình sẽ đọc cùng nhau.”

Hoàn thành sau khi gài điện thờ, thu hồi đèn và kết thúc cuộc trò chuyện. Giữ cấu hình tượng, gương, màn che và cửa Bắc. The Shadow chờ ở lối ra, không tự biến mất trước khi người chơi tới. Nhịp “Người giữ bóng” đã phát được lưu (`l7-shadow-demo`) và không phát lại khi tải lại.

**Ghi chép nhận được:** bóng đổ có thể bảo vệ một vùng; không cần tắt hết để có bóng; ba khóa đồng thời; dấu vòng xoắn nối điện thờ với trạm nước.\
**Chuyển tiếp:** [Level 09 — Dark Moon Observatory](09-dark-moon-observatory.md).

## 8. Tác động triển khai

- **Logic:** không đổi `deriveRuinsPuzzleState`. Cảnh minh họa chỉ chạy theo yêu cầu E với The Shadow hoặc H>=2, khi đèn bật+đặt, hai Nhật sáng và Nguyệt chưa đạt. Cờ `l7-shadow-demo` chỉ ghi sau khi cảnh đủ thời lượng; điều kiện không hợp lệ không tiêu hao lượt xem.
- **The Shadow:** thêm một điểm đứng tạm trên luồng giữa và đường đi tới đó, dùng tư thế đã đăng ký (`walk-right`, `shielding`, `turn`). Khối va chạm của ông theo cách hiện tại (theo vị trí sống, tắt khi sắp chạm người chơi). Cần kiểm lại rằng điểm đứng tạm không chặn điểm đứng nào và người chơi không bị kẹt, vì nhịp phát trong lúc khóa điều khiển.
- **Bóng tạm thời:** cảnh có thể trình bày bóng do thân The Shadow tạo, nhưng không thay đổi trạng thái câu đố hay đáp ứng bệ xác nhận. Khi cảnh kết thúc, hình ảnh và âm thanh trở về cấu hình thật.
- **Âm thanh:** ba giọng, điều khiển từ trạng thái sống của ba khóa.
- **Mạch phụ:** một decal chữ khắc dưới đế tượng, hiện bằng Pulse; cờ mới `l7-name-seen`.
- **Kiểm tra ở đợt tích hợp:** cập nhật `scripts/check-ruins-of-two-halves.mjs` để đối chiếu thang H cuối và kiểm: cảnh không tự chạy khi tắt đèn hoặc khi người chơi tự giải; yêu cầu không hợp lệ không ghi cờ; yêu cầu hợp lệ khóa điều khiển nhưng không xác nhận và không đổi trạng thái; sau cảnh hình, âm và trạng thái câu đố khớp cấu hình thật. Những kiểm tra gameplay này chưa chạy.

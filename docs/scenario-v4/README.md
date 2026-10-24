# Kịch bản V4 — Ánh sáng bên kia dòng sông

Ngày biên soạn: **2026-10-24**. Đây là bộ thiết kế cốt truyện và câu đố để người dùng đọc, góp ý và làm nguồn cho lần triển khai tiếp theo. Hướng truyện Bến Sương, mở đầu chơi được và các chỉnh sửa câu đố/ánh sáng trong phạm vi đã được người dùng duyệt. Tài liệu mô tả trải nghiệm, footprint nguồn và đường phục hồi; chưa thay code, art, save hay nguồn thoại đang chạy. V2 và V3 được giữ nguyên.

## Mục tiêu và phạm vi

- Lưu đầy đủ câu chuyện Nhinh học nghề sửa đèn, Lumo bảo vệ vườn, Bến Sương phụ thuộc đầu nguồn và Người Bảo Vệ đã kéo dài chế độ cứu hộ.
- Viết prologue chơi được và đủ 10 màn: diễn biến, bố cục theo khu, luật, manh mối, lời giải tham khảo, trạng thái sai/phục hồi, thoại, H, art và trạng thái lưu.
- Phản hồi người dùng cung cấp: người chơi demo 01–04 thấy quá dễ. Chưa có log lượt chơi để định lượng. Chẩn đoán từ kịch bản: màn 01 gần như làm theo chỉ dẫn; màn 02 thơ, đường bay và thoại cùng tiết lộ một chuỗi; các gợi ý tự động có thể thay phần suy luận của người chơi.
- Tăng chiều sâu suy luận và sự liên kết giữa các khu. Cho phép mở rộng phòng, tạo art mới, giữ các vật liệu/nhân vật/cơ cấu có thể dùng tiếp. Không dùng số bước hoặc số cấu hình làm bằng chứng về độ khó.
- Tách ánh nền dẫn đường khỏi nguồn động/cố định kích cảm biến; ánh sáng và bóng có phạm vi vẽ rõ. Khi tắt F, đường đi vẫn thấy; thông tin tối chỉ lộ khi một vệt nguồn thật không chiếu lên dấu. Pulse ghi liên kết tĩnh vào J, không cấp nguồn, tự giải hay trở thành cờ bắt buộc.
- Phần 2 chỉ được lưu làm hướng phát triển, chưa thiết kế chi tiết hay triển khai trong đợt này.

## Đọc theo thứ tự

| Tài liệu | Nội dung |
| --- | --- |
| [Bản đọc liền mạch demo 01–04](demo-01-04-rewrite.md) | Bản kịch bản do người điều phối viết theo hướng đã thống nhất; đọc liền mạch trước tài liệu từng màn |
| [Cốt truyện nguyên văn](00-original-story-verbatim.md) | Giữ nguyên lời đề xuất trong cuộc trò chuyện, gồm nguồn tin nhắn |
| [Mở đầu nguyên văn](00-original-prologue-verbatim.md) | Giữ nguyên câu trả lời về cảnh xưởng chơi được |
| [Cốt truyện](00-story-bible.md) | Thế giới, nhân vật, nguyên nhân và kết thúc |
| [Luật chung và nhịp chiến dịch](puzzle-contracts.md) | Thuật ngữ, đường học, khó nhưng công bằng, trạng thái và giới hạn |
| [00 — Xưởng bên sông](00-prologue.md) | Prologue chơi được, đã được đồng ý về hướng |
| [01 — Bìa rừng](01-forgotten-forest-edge.md) | Thử nguồn xác nhận cơ cấu cửa còn tốt; giữ A/B độc lập trước khi chuyển đèn |
| [02 — Rừng đom đóm](02-whispering-woods.md) | Pulse hiện liên kết trục; tối chỉ hướng đích; hiệu chỉnh cả cụm liên động |
| [03 — Thư viện dưới rễ](03-library-beneath-the-roots.md) | Ghép phiến hai lớp rồi kiểm quy trình hồi–cấp–hồi–hồi trên mô hình |
| [04 — Con suối](04-shattered-moonlit-creek.md) | Dùng phép thử có kiểm soát đối chiếu chỉ báo Bến/Rễ; kết điểm demo sau khi máy an toàn |
| [05 — Lối đi cho hai người](05-a-path-for-two.md) | Một chốt rời phải được chuyển giữa những cửa khác nhau |
| [06 — Tháp không ngủ](06-the-sleepless-tower.md) | Chia một nguồn hữu hạn và phối hợp giảm nhu cầu ở bến |
| [07 — Khu vườn ngủ](07-the-sleeping-garden.md) | Chiếu hoa A bằng đèn cầm, chốt cửa, che W để rễ cầu nối |
| [08 — Phế tích hai nửa](08-ruins-of-two-halves.md) | Qua cầu tối, mở đường hồi rồi giữ Nhật sáng và Nguyệt trong bóng |
| [09 — Đài quan sát](09-dark-moon-observatory.md) | Đọc sơ đồ tối tại H, cấp mạng lại, giữ lối rút và mang đèn/tinh thể |
| [10 — Trái tim Elaria](10-the-heart-of-elaria.md) | Dấu cơ khí chứng minh hệ tự giữ trước khi thu/tắt đèn |
| [Art và tác động sản xuất](art-and-production.md) | Giữ, chỉnh, bổ sung; không coi concept là asset đã dựng |
| [Rà soát thiết kế](design-review.md) | Bằng chứng đọc/rà logic, giới hạn, việc cần xác nhận khi dựng |
| [Phần 2](phase-2-outline.md) | Outline Hạ Lưu, Duy, màn 11–18 |

Hai bản **nguyên văn** là hồ sơ lưu trữ, không sửa câu chữ để khớp các quyết định sản xuất về sau. Khi dựng, đọc bản biên soạn cốt truyện, luật chung và từng màn: chúng làm rõ nguồn chính/nguồn thử, đường hồi, quy mô prologue và cấu hình câu đố. Các chi tiết bổ sung không được chèn ngược vào lời đề xuất gốc.

## Các thay đổi có chủ đích so với V2

Đây là nhánh thiết kế mới theo yêu cầu hiện tại, nên các giới hạn bố cục/thoại đã chốt cho việc tích hợp V2 không khóa V4. Các quy tắc trải nghiệm vẫn được giữ: không đếm ngược, không chết/rơi/mất tiến trình; trạng thái sống phải thật sự còn được cấp nguồn; có đường phục hồi; âm thanh luôn có hình ảnh tương ứng; hướng dẫn không nói sẵn lời giải.

Màn 01 dùng một nguồn thử để xác nhận cơ cấu cửa còn tốt, rồi dạy giữ A/B trước khi chuyển đèn; M02 tách trục liên kết khỏi hướng đích lộ trong tối và đặt câu đố ở hiệu chỉnh cụm. M03 ghép hai lớp thông tin và kiểm tra quy trình hồi–cấp–hồi–hồi trên mô hình, không tác động dòng thật. M04 dùng phép thử có kiểm soát để so sánh hai nhánh khi van hồi cục bộ đã mở; Pulse giúp đọc liên kết nhưng không phải điều kiện. M05 giữ chốt rời và các tay hồi, không thêm bệ đèn. M06 chia nguồn hữu hạn sau khi người chơi có thể khảo sát đường. M07 tách ánh W trên luống khỏi footprint đèn cầm tới hoa; M08–09 yêu cầu chuẩn bị đường về trước khi bật lại; M10 dùng dấu cơ khí của bộ tự giữ để người chơi tự quyết định khi nào gọi Lumo, thu đèn và tắt F.

Ba tinh thể Ký Ức, Hy Vọng, Cân Bằng vẫn dùng hình ảnh cũ, nhưng được giải thích là ba bộ phận/khóa của cơ chế hồi phục Cây Mẹ. Thu thập đủ chưa tự giải quyết điều tiết hay thay việc sửa các tuyến.

## Trạng thái thực hiện

- Đây là lần cập nhật tài liệu theo chỉnh sửa ánh sáng/câu đố đã được duyệt; không tạo ADR mới, quyết định được ghi trong contracts và từng màn.
- `00-original-story-verbatim.md`, `00-original-prologue-verbatim.md`, `00-story-bible.md` và `00-prologue.md` giữ nguyên trong phạm vi cập nhật này. Outline phần 2 cũng không đổi.
- Đây là công việc viết thiết kế. Không có test/build/playtest game trong đợt này; không dùng kết quả V2 để tuyên bố câu đố V4 đã kiểm chứng.

Chi tiết tiến độ rà soát và các giới hạn bằng chứng nằm trong [design-review.md](design-review.md).

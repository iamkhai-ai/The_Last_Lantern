# Kịch bản V4 — Ánh sáng bên kia dòng sông

Ngày biên soạn: **2026-10-24**. Đây là bộ thiết kế cốt truyện và câu đố để người dùng đọc, góp ý và làm nguồn cho lần triển khai tiếp theo. Hướng truyện Bến Sương và mở đầu chơi được đã được người dùng tán thành; các cấu hình câu đố chi tiết dưới đây là đề xuất mới. Chưa thay code, art, save hay nguồn thoại đang chạy. V2 và V3 được giữ nguyên.

## Mục tiêu và phạm vi

- Lưu đầy đủ câu chuyện Nhinh học nghề sửa đèn, Lumo bảo vệ vườn, Bến Sương phụ thuộc đầu nguồn và Người Bảo Vệ đã kéo dài chế độ cứu hộ.
- Viết prologue chơi được và đủ 10 màn: diễn biến, bố cục theo khu, luật, manh mối, lời giải tham khảo, trạng thái sai/phục hồi, thoại, H, art và trạng thái lưu.
- Phản hồi người dùng cung cấp: người chơi demo 01–04 thấy quá dễ. Chưa có log lượt chơi để định lượng. Chẩn đoán từ kịch bản: màn 01 gần như làm theo chỉ dẫn; màn 02 thơ, đường bay và thoại cùng tiết lộ một chuỗi; các gợi ý tự động có thể thay phần suy luận của người chơi.
- Tăng chiều sâu suy luận và sự liên kết giữa các khu. Cho phép mở rộng phòng, tạo art mới, giữ các vật liệu/nhân vật/cơ cấu có thể dùng tiếp. Không dùng số bước hoặc số cấu hình làm bằng chứng về độ khó.
- Phần 2 chỉ được lưu làm hướng phát triển, chưa thiết kế chi tiết hay triển khai trong đợt này.

## Đọc theo thứ tự

| Tài liệu | Nội dung |
| --- | --- |
| [Cốt truyện nguyên văn](00-original-story-verbatim.md) | Giữ nguyên lời đề xuất trong cuộc trò chuyện, gồm nguồn tin nhắn |
| [Mở đầu nguyên văn](00-original-prologue-verbatim.md) | Giữ nguyên câu trả lời về cảnh xưởng chơi được |
| [Cốt truyện](00-story-bible.md) | Thế giới, nhân vật, nguyên nhân và kết thúc |
| [Luật chung và nhịp chiến dịch](puzzle-contracts.md) | Thuật ngữ, đường học, khó nhưng công bằng, trạng thái và giới hạn |
| [00 — Xưởng bên sông](00-prologue.md) | Prologue chơi được, đã được đồng ý về hướng |
| [01 — Bìa rừng](01-forgotten-forest-edge.md) | Để đèn lại, gài đường về rồi chuyển nguồn |
| [02 — Rừng đom đóm](02-whispering-woods.md) | Ba tay quay điều khiển bốn vành nối chung |
| [03 — Thư viện dưới rễ](03-library-beneath-the-roots.md) | Ghép hai lớp thông tin và kiểm tra chu kỳ hồi lưu |
| [04 — Con suối](04-shattered-moonlit-creek.md) | Một nguồn qua hai cầu và trạm thử tuyến |
| [05 — Lối đi cho hai người](05-a-path-for-two.md) | Một chốt rời phải được chuyển giữa những cửa khác nhau |
| [06 — Tháp không ngủ](06-the-sleepless-tower.md) | Chia một nguồn hữu hạn và phối hợp giảm nhu cầu ở bến |
| [07 — Khu vườn ngủ](07-the-sleeping-garden.md) | Chuẩn bị đường đi trước khi trả bóng tối và nước về vườn |
| [08 — Phế tích hai nửa](08-ruins-of-two-halves.md) | Đổi đường tia để bóng bảo vệ được đúng vùng |
| [09 — Đài quan sát](09-dark-moon-observatory.md) | Mạng liên phòng, cấp nguồn gián tiếp và đường rút an toàn |
| [10 — Trái tim Elaria](10-the-heart-of-elaria.md) | Chuyển từ hệ cần người giữ sang hệ tự điều tiết |
| [Art và tác động sản xuất](art-and-production.md) | Giữ, chỉnh, bổ sung; không coi concept là asset đã dựng |
| [Rà soát thiết kế](design-review.md) | Bằng chứng đọc/rà logic, giới hạn, việc cần xác nhận khi dựng |
| [Phần 2](phase-2-outline.md) | Outline Hạ Lưu, Duy, màn 11–18 |

Hai bản **nguyên văn** là hồ sơ lưu trữ, không sửa câu chữ để khớp các quyết định sản xuất về sau. Khi dựng, đọc bản biên soạn cốt truyện, luật chung và từng màn: chúng làm rõ nguồn chính/nguồn thử, đường hồi, quy mô prologue và cấu hình câu đố. Các chi tiết bổ sung không được chèn ngược vào lời đề xuất gốc.

## Các thay đổi có chủ đích so với V2

Đây là nhánh thiết kế mới theo yêu cầu hiện tại, nên các giới hạn bố cục/thoại đã chốt cho việc tích hợp V2 không khóa V4. Các quy tắc trải nghiệm vẫn được giữ: không đếm ngược, không chết/rơi/mất tiến trình; trạng thái sống phải thật sự còn được cấp nguồn; có đường phục hồi; âm thanh luôn có hình ảnh tương ứng; hướng dẫn không nói sẵn lời giải.

Màn 01 đưa thao tác đặt đèn lên bệ lên sớm hơn. Màn 02 dùng mạng bốn vành liên động, ba tay quay và các đích nhìn thấy được. Màn 03 dùng kết quả suy luận ở một mô hình vận hành. Màn 04 trở thành một câu đố nhiều khu có kết luận cảm xúc. Màn 05 thêm chốt rời hữu hạn; màn 06 thêm giới hạn cấp nguồn. Các màn 07–10 tái tổ hợp các luật này và dành chỗ cho nhân vật.

Ba tinh thể Ký Ức, Hy Vọng, Cân Bằng vẫn dùng hình ảnh cũ, nhưng được giải thích là ba bộ phận/khóa của cơ chế hồi phục Cây Mẹ. Thu thập đủ chưa tự giải quyết điều tiết hay thay việc sửa các tuyến.

## Trạng thái thực hiện

- Subagent được yêu cầu: `gpt-6-luna`, effort `xhigh`; cặp này có trong danh sách hỗ trợ của công cụ Codex và lệnh dispatch được chấp nhận. Công cụ không trả danh tính model/effort resolved, nên giá trị resolved là **unknown**.
- Luna lưu `00-story-bible.md`, `phase-2-outline.md` và hai bản nguyên văn lấy từ đúng tin nhắn nguồn. Root chịu trách nhiệm các kịch bản màn và tính nhất quán toàn bộ bộ tài liệu.
- Đây là công việc viết thiết kế. Không có test/build/playtest game trong đợt này; không tái sử dụng kết quả PASS của mô hình V2 cho câu đố V4.

Chi tiết tiến độ rà soát và các giới hạn bằng chứng nằm trong [design-review.md](design-review.md).

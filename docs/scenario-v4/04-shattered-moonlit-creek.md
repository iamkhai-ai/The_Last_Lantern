# 04 — Con suối dưới trăng vỡ

**Câu hỏi:** Khi nhánh bến hoạt động trở lại, phần hồi của rừng có thật sự được giữ không? **Ý chính:** sau khi học về hồi lưu ở 03, Nhinh thử có kiểm soát xem mở đường hồi cục bộ có đủ giữ dòng khi bến nhận nguồn hay không. Cô cần chuẩn bị đường đi, phân biệt đèn thử với dòng chính và đối chiếu hai đầu ra. **Quy mô:** bờ Tây, đảo giữa và bờ Đông/trạm thử; cho phép thêm một phòng trạm. **Thời lượng thiết kế:** 14–20 phút, chưa đo. Đây là đỉnh đầu và điểm kết demo.

## 1. Mục tiêu, ánh sáng và bố cục

Lumo dẫn Nhinh tới nơi tuyến Bến tách khỏi tuyến Rễ. Lòng suối cạn; phù điêu bão cho thấy đèn từng giúp thuyền về. Nhinh đã học hồi lưu ở 03, nên không định mở tối đa: cô muốn thử xem đường hồi cục bộ có giữ được dòng khi Bến nhận nguồn hay không. Tài liệu cũ là mốc đối chiếu, không chứng minh máy ngoài thực địa còn vận hành đúng.

Tây [S,G1] — cầu A — đảo [tay truyền động G1,G2] — cầu B — Đông [chốt A/B, van hồi N, trạm T].

Ánh nền phản chiếu trên đá và vệt nước giữ mép suối, cầu đã đóng/mở, bờ an toàn, gương, chốt và tay điều khiển đọc được khi đèn tắt. Không có nguồn gameplay cố định trong màn. Đèn cầm theo luật chung tỏa vòng bán kính 40px quanh tâm khối chân; khi đặt tại S, đầu nối kín lọt quầng 12px và đưa tín hiệu theo các tuyến G1/G2 đã vẽ. Cầm đèn không mở cầu hay trạm ở xa. F bật/tắt đèn cầm hoặc đặt tại S, không cắt đường chính từ Cây Mẹ; trạng thái F mang từ màn trước.

Khi dấu không bị vùng sáng trong trò chơi chiếu lên, khoáng phát quang dọc hai ống chính làm rõ nhánh Bến và nhánh Rễ. Chúng cho thấy tuyến qua bờ/đảo và hướng dòng hồi, không chỉ ra hướng gương hay chuỗi thao tác. Tia S→G1→G2 chạy ngay trên hai ống; theo luật tia (dải 6px, puzzle-contracts §1), khi S bật, đoạn khoáng nằm dưới tia bị che. Muốn đọc đoạn ấy, người chơi tắt F (kể cả từ xa khi đèn ở S) hoặc đọc đoạn ống ngoài đường tia và ngoài vòng sáng của đèn cầm; không cần một thao tác bắt buộc để đọc dấu. Tường/cửa đang đóng chắn ánh; dấu trong vùng sáng khó phân biệt, nhưng ánh nền giữ toàn phòng nhìn rõ.

## 2. Luật và thông tin

S là bệ duy nhất ở bờ Tây. G1 hướng tới mắt cầu A hoặc tới G2; tay truyền động trên đảo chỉnh G1 từ xa bằng trục/dây cơ khí nhìn thấy được. G2 hướng tới mắt cầu B hoặc đầu thử T. Cả hai tay hãm A/B ở bờ Đông; tay hãm A nối bằng thanh dài chạy dọc mép kênh. Hai đường nước chính chạy riêng dưới đường tia.

- Cầu A nhận nguồn khi đèn ở S, đang bật và G1 hướng A. Chốt A ở Đông giữ cầu độc lập với tia, chỉ gài khi A đang mở thật.
- Cầu B nhận nguồn khi đèn ở S, đang bật, G1 hướng G2 và G2 hướng B. Chốt B ở Đông giữ cầu.
- Trạm T nhận nguồn điều khiển khi đèn ở S, đang bật, G1 hướng G2 và G2 hướng T. Bờ Đông không có bệ; đầu vào kín của T chỉ nhận tia qua G2, và rãnh hở cho thấy điểm nối ở đâu.
- Van N ở Đông điều khiển một đường hồi cục bộ, không tắt nguồn Bến. Vị trí hồi thông hiện bằng dòng nước qua rãnh phía Rễ; hồi chặn làm rãnh đứng yên. Van nằm ngoài đường chân người và tới được từ nền Đông.
- Tia mỗi gương có hướng hữu hạn; đường phản xạ nhìn trọn tới vật chắn/đích. Không vẽ tia trang trí xuyên qua khối va chạm.

Một bảng tuyến vẽ T chỉ là dụng cụ thử tuyến chính. Đèn nhỏ cấp mạch điều khiển/đo; E hợp lệ đầu tiên ở T bắt đầu lấy mẫu trên dòng chính từ Cây Mẹ, được vẽ riêng, và ghi ngay cặp kết quả Bến/Rễ. Chính dòng chính đổi tải làm chỉ báo Bến tăng và chỉ báo Rễ hạ, không phải năng lượng chiếc đèn truyền tới cả thị trấn. Bảng, lò xo và lẫy nhìn thấy được cho biết mẫu có giới hạn; nút dừng nằm cạnh bảng. Khi phần trình bày kết thúc, bị dừng sớm, mất nguồn thử hoặc N bị đóng, lò xo đưa van lấy mẫu T về tải thấp và lẫy tự gài. Những lần E sau đó chỉ xem cặp kết quả, không mở van chính lần nữa. N là van riêng thao tác bằng E; T dừng không đổi N. Dòng cảnh báo cũ: “Thử tải có thể kéo mức nước hồi xuống. Van dừng ở cạnh bảng.” Người chơi biết phép thử và nơi dừng trước khi quyết định. Không có thử thách phản xạ hay tổn hại vĩnh viễn.

## 3. Pulse, lời giải và quyết định

Trạng thái mặc định khi không có F mang theo: F bật; Nhinh cầm đèn ở bờ Tây; S rỗng; G1 hướng A; G2 hướng B; A/B đóng và chưa gài; N đóng; T chưa cấp, chưa thử. Lumo đi cùng. Trong lượt chơi liền mạch, trạng thái F tiếp tục từ màn trước. Pulse ở sơ đồ bờ Tây, khi đèn đang ở tay và bật, làm hiện đường tĩnh S→G1, G1→A/G2, G2→B/T, vị trí van N và hai ống chính riêng. Nó không báo cầu nào đang nhận nguồn hoặc mẫu thử có an toàn trong cấu hình hiện tại. J chỉ lưu dấu đã được Pulse phát hiện; người chơi có thể đặt đèn rồi xem lại. Pulse không là yêu cầu để mở T hay ghi nhận thử nghiệm.

Một đường giải tham khảo:

1. Pulse nếu muốn, rồi đặt/bật đèn tại S và cho G1 cấp A. Qua A tới đảo; tay hãm A ở tận bên Đông.
2. Dùng tay truyền động trên đảo đổi G1 sang G2; cho G2 cấp B. A tạm đóng sau lưng, B mở trước mặt. Người chơi vẫn ở nền đảo an toàn.
3. Qua B, gài B ở Đông. Quay lại đảo theo B đã giữ, đổi G1 về A; trở lại Đông và gài A từ xa. Giờ cả hai cầu giữ độc lập với tia. Tay hãm A không tự tạo nguồn.
4. Từ Đông quay lại đảo qua B đã gài, đổi G1 sang G2 và G2 sang T; qua B trở lại Đông. Mở N cho đường hồi cục bộ thông trước khi thử. Muốn đọc vệt khoáng, người chơi có thể lùi khỏi vòng sáng hoặc tắt F.
5. Tới T, E chỉ bắt đầu mẫu nếu T đang nhận nguồn đúng tuyến và N đang mở hồi. Lần E hợp lệ đầu tiên ghi ngay một cặp kết quả Bến/Rễ rồi bắt đầu trình bày kết quả; nếu thiếu nguồn hoặc N đóng thì không bắt đầu và không ghi. Không kiểm tra đã Pulse, đã đọc cảnh báo hay đã gài từng chốt. Có thể dừng phần trình bày sớm; phép đo đã ghi từ lúc bắt đầu hợp lệ.
6. Khi trình bày kết thúc, bị dừng sớm, mất nguồn thử hoặc N bị đóng, lò xo đưa van T về tải thấp và lẫy nhìn thấy được tự gài để khóa tay thử. Từ đó E tại T chỉ xem lại cặp kết quả, không mở van chính hay chạy mẫu lần nữa. T dừng không đổi N; N vẫn là van riêng, phải mở bằng E nếu đang đóng. Nếu cầu nào chưa gài, dùng các cần hồi đúng phía để khôi phục và gài. Đi từ Đông qua B/A về Tây, lấy đèn ở S, mang qua hai cầu đã giữ rồi tới lối ra phía Đông. Cầu giữ khi đèn được lấy khỏi S.

Lần E đầu tiên chỉ ghi mẫu khi cấu hình hiện tại có nguồn tới T qua đầu nối thật và N mở hồi. Thiếu một trong hai điều kiện thì phản hồi nêu điều đang thiếu; không bắt đầu, không ghi kết quả và không tiêu thụ lượt mẫu duy nhất. Sau khi đã ghi cặp số đo, các lần E ở T chỉ xem kết quả. Không buộc phải đi đúng lời giải mẫu trên và không kiểm cờ lịch sử như đã Pulse, đã đọc bia, đã gài chốt theo thứ tự hay đã xem cảnh báo. Nếu bố cục cho một cấu hình khác vẫn giữ đường an toàn và cấp T qua đầu nối thật, phải chấp nhận hoặc sửa hình học rõ ràng, không thêm cờ lịch sử để chặn.

Chốt A/B không phải điều kiện ghi mẫu; người chơi có thể thử trước khi gài hết chốt. Để hoàn tất lượt demo, Nhinh phải có mẫu đã ghi, T ở tải thấp với lẫy đã gài, N đang mở hồi, cầm đèn và tới lối ra phía Đông. Mang đèn từ S qua hai cầu bằng đường vật lý; không kiểm cờ lịch sử chốt, Pulse hay thoại. Nếu đã thử mà A chưa gài, từ Đông quay ra đảo bằng B đã gài, cấp lại A, trở lại Đông gài A bằng thanh truyền rồi mới về Tây lấy đèn. Nếu lấy đèn sớm, Nhinh vẫn ở Tây và có thể đặt lại S. Không tự dịch chuyển đèn.

## 4. Cảnh kết demo

Trong phép thử có kiểm soát hợp lệ đầu tiên, chỉ báo Bến tăng còn chỉ báo Rễ hạ dù N đã mở hồi. Cặp kết quả được ghi ngay khi E bắt đầu mẫu; phần nước chuyển và chỉ báo trình bày kết quả đã đo. Điều này cho thấy van cục bộ chưa đủ giữ dòng khi Bến nhận thêm. Lumo chao xuống trên bờ khô một lần, không có thanh máu; lời cậu và kết quả chỉ báo cùng xác nhận điều người chơi đã thấy. Dừng sớm, mất nguồn thử hay đóng N khi đang trình bày đều đưa T về tải thấp và gài lẫy. Xem kết quả, tải lại hoặc E lần nữa không chạy phép thử mới và không phát lại sự suy yếu.

> **Mẹ qua trạm:** “Đèn bến sáng rồi, Nhinh. Mọi người đang gọi tên con đấy.”
>
> **Lumo:** “Nhinh… nước bên này đang rút.”
>
> **Nhinh:** “Lúc lấy mẫu, van hồi đã mở. Đường về chưa đứt… nhưng phần nước vẫn hụt.”
>
> **Mẹ:** “Mẹ đang đưa những chuyến thuyền cuối vào bến. Con nói mẹ nghe bên đó thế nào.”

Nhinh nói rõ mỗi lần Bến nhận thêm, phần hồi về rừng lại hụt, rồi nhờ mẹ giúp chuẩn bị dùng ít hơn. Mẹ xác nhận sẽ gom thuyền và chuẩn bị ca bơm, nhưng cần Nhinh tìm mức vận hành ở tháp trước khi thay chế độ; bà không hứa giảm mức ngay hay tắt dịch vụ. Lumo hồi sáng khi mẫu dừng. Sau khi nhìn cơ cấu, Nhinh nói: “Tôi cứ nghĩ nối lại được là sửa xong.” Lumo đáp: “Giờ cậu đã thấy cả bên này rồi.” Bỏ qua lời thoại vẫn ghi kết quả thử và việc mẹ chuẩn bị phối hợp.

Mục tiêu mới là cùng tìm mức vận hành giữ dịch vụ thiết yếu và trả phần hồi cho rừng. Nhinh đã chủ động nhờ mẹ phối hợp; mẹ chưa thay chế độ từ xa. Câu hỏi mở là vì sao chế độ đang rút phần hồi vẫn được duy trì; demo chưa tiết lộ thủ phạm hay quyết định khóa quyền của Guardian.

Sau mẫu, T về tải thấp và lẫy tự gài. N giữ đúng vị trí thực tế người chơi đã chọn; nếu đóng N, E tại van mở lại từ nền Đông trước khi rời. Nếu hai cầu chưa cùng được gài, người chơi phục hồi và gài chúng bằng cơ cấu có sẵn, không xóa kết quả chẩn đoán. Nhinh thu đèn ở Tây, mang nó qua A và B bằng đường vật lý rồi tới lối ra phía Đông. Bản demo chỉ kết thúc khi mẫu đã ghi, T an toàn/lẫy gài, N đang mở hồi, đèn ở tay Nhinh và cô đã tới lối ra Đông. Không dùng cờ lịch sử chốt/Pulse/thoại để hoàn thành. Thoại có thể bỏ qua nhưng kết quả và việc mẹ chuẩn bị phối hợp vẫn được ghi. Lối ra Đông là bậc đá dẫn về phía tháp, luôn nhìn thấy. Bước vào vùng ra khi chưa đủ điều kiện thì hiện một dòng nêu điều còn thiếu (RULE_GAMES.md §7: chưa có mẫu, T chưa an toàn, N đang đóng hoặc đèn chưa ở tay) và không chuyển cảnh. Nếu tới lối ra khi chưa có mẫu, HUD tiếp tục yêu cầu kiểm tra T; nếu N đang đóng thì nhắc mở van hồi đang tới được trên nền Đông. Không phát cảnh như thể đã biết kết quả hoặc trạm đã an toàn.

## 5. Phục hồi, lưu và H

Mỗi bờ có cần hồi cơ khí tới được từ nền: cần hồi A ở bờ Tây, cần hồi B ở bờ Đông; trên đảo dùng tay truyền động G1/G2, nên đảo không cần cần hồi riêng. Chúng đưa gương về tuyến cấp cầu tương ứng, không tự gài chốt. Nhờ vậy mất nguồn ở đảo hoặc Đông không buộc reset; cần hồi B cũng đưa G1 về tuyến G2 qua dây cơ khí liên tục. Hai bờ và đảo cần có chỗ đứng an toàn để tiếp cận cần tương ứng. Bệ S nằm ngoài tầm E từ mọi vị trí chân trên mặt cầu A (puzzle-contracts §1 “Không mang nguồn qua chính đường nó cấp”), nên không thể nhặt đèn khi đang đứng trên cầu rồi đi qua A chưa gài.

Nhả chốt A/B là thao tác hợp lệ khi đèn đang ở S, vì mọi cầu vừa đóng đều mở lại được: tay truyền động trên đảo đưa G1 về A, cần hồi B ở Đông đưa tuyến về B. Khi đèn không ở S, E ở chốt đang gài không nhả và nói lý do: “Đèn không ở S: nhả chốt thì cầu đóng, bên này không còn nguồn nào mở lại.” Chốt chỉ nằm ở Đông và bờ Đông/đảo không có bệ, nên đây đúng là trường hợp nhả chốt sẽ cắt đường về; không dùng cờ lịch sử cho luật này.

F khi đang giữa cầu giữ phần chịu tải tới bờ. Nếu đã tới Đông mà chưa gài B, tay hồi B ở Đông khôi phục đường; nếu đã tới đảo mà mất nguồn, các cần hồi đúng phía khôi phục đường về. Mẫu chỉ bắt đầu và ghi khi T có nguồn đúng tuyến và N đang mở hồi; nếu thiếu nguồn ở T hoặc N đóng, E nêu đúng điều kiện còn thiếu và không tiêu thụ lượt mẫu duy nhất. Nút dừng tại T dừng phần trình bày, đưa T về tải thấp và gài lẫy; thao tác đó không đổi N. N vẫn mở/đóng riêng bằng E. Có thể bắt đầu mẫu trước khi gài hết chốt, nhưng phải giữ cả hai cầu thật sự bằng cơ khí trước khi thu đèn về Tây rồi mang sang Đông. Không đòi Pulse, đọc cảnh báo hoặc gài theo thứ tự khi cấu hình hiện tại đã hợp lệ.

Lưu hai chốt, G1/G2, vị trí thực tế của N, vị trí/trạng thái đèn (đang cầm hay ở S), F, trạng thái T (đang trình bày hay đã an toàn/lẫy gài), cặp kết quả đã ghi hay chưa, vị trí trình bày, liên lạc và việc mẹ chuẩn bị phối hợp. Cặp số đo Bến/Rễ được ghi cùng lần E hợp lệ đầu tiên; E không hợp lệ khi thiếu nguồn T hoặc N đóng không ghi kết quả. Bỏ qua thoại không hủy kết quả đã ghi. Nếu lưu giữa lúc trình bày, tải lại đưa T về tải thấp với lẫy gài, đồng thời giữ cặp kết quả và tiến độ liên lạc, không phát lại nước chuyển hay Lumo chao xuống. Giữ nguyên N đã lưu; không tự mở van khi tải. Nếu N đóng, người chơi phải tới van ở nền Đông và mở bằng E để đủ điều kiện kết demo. Các lần E tại T sau khi đã ghi chỉ xem lại kết quả, không chạy mẫu mới. Trạng thái cầu đã chốt không bị xóa vì cảnh truyện. Điểm lưu nằm trên nền bờ/đảo an toàn, không trên cầu hay trong cửa, và dùng được với cả F bật/tắt.

- **Mức 1 — quan sát:** “Tay giữ cầu A nằm ở Đông, còn trên đảo có tay truyền động nào? Khi dấu không bị đèn chiếu, hai ống chính được ghi là Bến và Rễ.”
- **Mức 2 — quan hệ:** “Có thể để A tạm đóng sau lưng khi đổi G1 để mở B. Pulse chỉ cho thấy liên kết tĩnh giữa G2, cầu và T; dòng chính tách khỏi mạch đèn thử. N mở hồi không có nghĩa phần Rễ đang nhận đủ.”
- **Mức 3 — bước tiếp:** “Mở A để sang đảo, đổi G1 sang G2 rồi mở B. Tại Đông gài B, cấp lại A rồi gài A; sau đó cấp T và mở N. E hợp lệ đầu tiên tại T ghi cặp kết quả; nếu thiếu nguồn hoặc N đóng, chưa có mẫu nào được ghi.” Sau khi đã ghi mẫu, H chỉ khuyên E tại T để xem lại kết quả, không thử lần nữa. Nếu N đã đóng, mở riêng van N bằng E; sau đó đưa đèn về tay và tới lối ra Đông qua đường cầu vật lý đã giữ. Không yêu cầu Pulse hay đọc cảnh báo.

Giữ đá/bờ/gương/cầu/phù điêu bão hiện có. Mới hoặc mở rộng: đảo, hai cầu, ống chính Bến/Rễ tách khỏi đường tia, đầu thử T, van hồi cục bộ N có tay E riêng, tay truyền động G1, hai hãm ở Đông và thanh truyền A, các cần hồi đúng phía, chỉ báo đồng thời Bến tăng/Rễ giảm, nút dừng cạnh bảng và lẫy cơ khí nhìn thấy được tự gài sau mẫu, cùng trạm cộng hưởng để nghe mẹ. Dấu khoáng đọc được khi không có vùng sáng đèn chiếu; ánh nền vẫn giữ đường và vật tương tác rõ. Hiệu ứng nước/Lumo có trạng thái rõ; không biến máy cổ thành bộ đàm hiện đại. HUD theo sự kiện thật: “Kiểm tra tuyến Bến và tuyến Rễ” → “Đưa trạm thử về mức an toàn” → nếu N đóng thì “Mở van hồi N” → “Thu đèn và tiếp tục tới tháp”. Chỉ kết demo khi mẫu đã ghi, T an toàn/lẫy gài, N mở hồi, đèn ở tay Nhinh và cô tới lối ra Đông.

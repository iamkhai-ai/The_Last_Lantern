# Demo V4 — Bốn màn đầu của Nhinh

Ngày viết: 2026-10-24. Bản kịch bản do orchestrator viết sau khi người dùng đồng ý chỉnh trải nghiệm theo nghề sửa đèn của Nhinh và thu phạm vi còn màn 01–04. Luna nhận bản này để cập nhật tài liệu chi tiết. Đây là thiết kế, chưa phải báo cáo triển khai hoặc kết quả playtest.

Bản này giữ câu chuyện Bến Sương, Nhinh, mẹ và Lumo. Prologue hiện có là điểm xuất phát: Nhinh đã sửa lõi lệch bằng vòng giữ, khép vỏ đèn và thử lại; sau đó tìm được đầu nối lỏng ở xưởng nhưng nhận ra lỗi đầu nguồn vẫn còn. Không thêm công việc vào prologue, không sửa bản lưu nguyên văn và chưa thực hiện các đề xuất dành cho màn 05–10.

## 1. Điều người chơi trải nghiệm trong demo

Nhinh đi kiểm tra một trạm mất nguồn. Qua bốn màn, cô lần lượt phân biệt mất nguồn với hỏng cơ cấu, hiệu chỉnh một cụm liên động, đọc lại quy trình đã thất lạc, rồi dùng phép thử để đối chiếu quy trình ấy với mạng đang vận hành. Kết demo, cô biết vì sao sửa cho bến sáng hơn chưa giải quyết được sự cố. Cô chưa biết ai đã khiến chế độ đó kéo dài.

Nhinh có tay nghề trong phạm vi quen thuộc: nhận ra đầu nối, vòng giữ, trục và lẫy; biết thử nguồn nhỏ trước khi kết luận; hiểu phải giữ cơ cấu trước khi tháo dụng cụ. Những bộ phận ở trạm có cùng họ hình dạng với đồ trong xưởng, nhưng lớn hơn và nối với mạng cô chưa biết. Đây là cơ sở cho sự suy luận, không phải kiến thức sẵn về toàn bộ Elaria.

Lumo biết nơi nào từng có nước, sinh vật phản ứng thế nào và đường nào dẫn tới vườn. Cậu không đọc thay sơ đồ cơ khí hay báo nấc đúng. Mẹ biết các chuyến thuyền và việc vận hành ở bến. Nhinh cần cả hai nguồn hiểu biết này.

Nỗi muốn được công nhận của Nhinh thể hiện qua việc cô mong đưa được đèn về bến và sớm báo một kết quả tốt. Cô vẫn làm phép thử có kiểm soát. Giới hạn của cô là còn đặt quá nhiều trọng lượng vào kết quả ở quê nhà; demo giúp cô bắt đầu nhìn cả phía nhận thiệt hại. Không kết luận cô đã trưởng thành hoàn toàn sau màn 04.

### Luật phải giữ khi cập nhật

- Dùng bản quy ước đèn mới nhất: đèn cầm tỏa vòng bán kính 40px quanh tâm khối chân, không phụ thuộc hướng quay; bệ kín để lọt quầng 12px và nhánh tràn được khai báo. Các số là giá trị khởi điểm dùng chung.
- Tường/cửa đóng chắn ánh; hình ảnh và gameplay khớp nhau. Ánh nền luôn đủ đọc đường và không cấp cảm biến. F điều khiển duy nhất đèn bảo trì và được mang qua màn.
- Pulse chỉ khi cầm đèn bật; chỉ hiện liên kết/dấu tĩnh. Nó không xác định lỗi thay người chơi, báo trạng thái sống hoặc cấp nguồn. J giữ đúng phần đã quan sát theo luật khoảng cách và che khuất hiện hành.
- Tia của mạng gương là dải sáng 6px dọc đường tia, bị tường/cửa đóng/vật chắn cắt; nó che dấu tối và kích mặt nhận hở dưới dải, còn ổ kín chỉ nhận tia ở đúng đầu cuối.
- Bệ cấp cho một cửa hay cầu nằm ngoài tầm E từ ngưỡng cửa hay mặt cầu ấy, để luật giữ khi chịu tải không cho phép nhặt đèn trong ngưỡng rồi bước qua.
- E thao tác thiết bị. Không thêm nút nghề nghiệp, nhiên liệu, nguyên liệu tiêu hao, phản xạ, chết/rơi hoặc một hệ thu thập linh kiện mới.
- Manh mối là bằng chứng để suy luận; đọc đủ manh mối không phải điều kiện thắng. Lời giải tham khảo không trở thành chuỗi bắt buộc. Cấu hình hợp lệ luôn được chấp nhận.
- Thoại phản ứng ngắn chỉ nói điều đã xảy ra. H giữ ba mức tùy chọn. Không cho Nhinh hoặc Lumo tự đọc đáp án.

## 2. Màn 01 — Bìa rừng quên lãng

**Câu hỏi của màn:** Cổng không mở vì cơ cấu hỏng, hay vì nó chưa nhận nguồn?

### Cảnh vào

Đồng hồ đã qua buổi sáng nhưng sân trạm vẫn chạng vạng. Đèn bảo trì nằm trên đất cạnh bia, tắt; người chơi tự nhặt bằng E một lần (ngoại lệ của màn 01) rồi bật thử. Cảnh mở chạy khi lần bật đầu tiên có đèn trong tay. Vòng sáng phủ lên mầm cây mà Lumo đang che. Cậu phản ứng: “Cậu có thể đừng soi vào nhà người khác không?” Nhinh lùi lại hoặc tắt đèn; cả hai đều làm mầm ra khỏi vòng sáng và được chấp nhận. Không yêu cầu bấm F một lần để mở tiến trình.

Nhinh xin lỗi, nói mình tới kiểm tra trạm. Lumo muốn tới khu vườn nhưng các cổng bảo trì đang đóng. Cậu biết đường qua thư viện. Hai người đồng ý đi cùng: cô tìm nguyên nhân mất nguồn, cậu dẫn đường và muốn cô giúp mở lối vào vườn.

Lần bật thử đầu tiên là ngoại lệ mở màn đã có trong luật chung. Sau tương tác với mầm cây, giữ đúng F mà người chơi đã chọn: tắt đèn thì vẫn tắt, lùi ra khi đang bật thì vẫn bật. Không bật lại chỉ vì chuyển sang phần câu đố; mọi chỗ đứng đầu màn đều an toàn trong cả hai trạng thái.

### Người chơi nhìn thấy gì

Đường cấp thường của trạm có một đoạn chỉ báo tối ở đầu vào S1. Đầu cắm thử có hình khớp với đèn bảo trì. Lẫy, lò xo và thanh hãm vẫn nguyên; chưa có bằng chứng chúng bị gãy. Các dấu này gắn lên bệ/cửa có sẵn, không thêm bảng tương tác hay việc thay linh kiện.

Nhinh có thể nhận xét một lần: “Khớp này giống ở xưởng.” Cô chưa kết luận cổng hỏng hay nói phải đặt đèn ở đâu. Lumo chỉ cho biết: “Trước đây cửa vẫn mở khi người giữ trạm tới.”

### Công việc và câu đố

Giữ bố cục sân vào có S1, qua A tới sân giữa có chốt A và S2, qua B tới lối ra. Cửa A chỉ nhận nguồn thử từ S1; cửa B chỉ từ S2. Đèn cầm tay không kích ổ kín. Không có nguồn gameplay cố định hoặc nhánh tràn từ bệ tới dấu tối.

Đặt đèn bật tại S1 làm A mở và lẫy chuyển động bình thường. Đây là phép thử đầu tiên: cơ cấu còn làm việc khi có nguồn phù hợp. Lời nhận xét sau kết quả: “Cửa còn chạy. Đường cấp của trạm mới là thứ đang thiếu.” Đây chỉ là kết luận tại trạm, chưa giải thích nguyên nhân đầu nguồn.

Người chơi qua A, tìm và gài chốt từ sân giữa, rồi lấy đèn đi. A giữ bằng thanh cơ khí nhìn thấy được. Tiếp tục đặt đèn ở S2, mở B, gài hãm B và thu đèn. Kỹ năng cần học là tạo hỗ trợ độc lập trước khi mang nguồn thử sang nơi khác. S1 và S2 đặt ngoài tầm E từ ngưỡng A và B, nên không thể nhặt đèn khi đang đứng trong ngưỡng rồi mang qua cửa chưa gài.

Pulse tại bia hiện đường khắc S1–A và ký hiệu của chốt. Bào tử trong tối dẫn tới mặt tiếp cận phía sau A, chỉ tới được sau khi đã qua cửa. Chúng không tạo đường vòng và không chỉ sẵn thứ tự. Mô hình bản lề cạnh bia là thực hành tùy chọn.

Nếu lấy đèn trước khi giữ A, Nhinh vẫn ở sân vào và có thể đặt lại. Nếu F làm A đóng khi cô ở sân giữa, F bật lại nguồn tại S1 từ cùng màn. Cửa giữ phần đang chịu người qua tới nền an toàn. Không mất chốt hoặc đặt lại toàn bài khi thử sai.

### Kết và chuyển màn

Khi thu đèn, cửa vẫn đứng vững trên bộ hãm. Người chơi đã tạo được đường qua trạm mà không bỏ dụng cụ lại. Trạm vẫn chưa lấy lại nguồn thường; không diễn cảnh cả mạng được sửa xong.

Nhinh thấy dấu tuyến giống ở bảng kiểm xưởng:

> **Nhinh:** “Đường này nối về bến.”
>
> **Lumo:** “Cũng từng nối về vườn tôi.”

HUD chuyển từ “Kiểm tra trạm mất nguồn” sang “Giữ lối qua trạm để mang đèn đi tiếp”. Không kéo dài màn bằng nhiều ổ hơn; độ khó chính của demo bắt đầu tăng ở 02.

## 3. Màn 02 — Rừng đom đóm

**Câu hỏi của màn:** Một lần chỉnh làm hai bộ phận chuyển cùng lúc; làm thế nào đưa cả cụm về đúng vị trí?

### Cảnh vào

Lumo dẫn Nhinh qua nơi đàn non từng tập bay. Cậu gỡ chiếc chuông cỏ mắc vào bụi: “Tôi vẫn treo lại. Có con thức dậy sẽ cần nó.” Nhinh kể bác lái đò từng đợi cô tan học. Cuộc trò chuyện ngắn cho thấy cả hai đều gắn với những người đang chờ mình trở về.

Rễ đã đội lệch nền quanh cụm bia. Các vành còn nguyên, tay quay vẫn truyền chuyển động, nhưng những rãnh không còn khớp miệng dẫn. Dấu lệch trên chân đế cho thấy đây là sai vị trí sau biến dạng nền, không phải thiếu nguồn. Màn không có bệ hoặc nguồn gameplay cố định.

### Công việc và câu đố

Bốn vành mang dấu Trăng, Lá, Sao, Nước. Ba tay quay X/Y/Z nối các cặp liền kề: X đổi Trăng/Lá, Y đổi Lá/Sao, Z đổi Sao/Nước. Mỗi lần quay tăng một nấc trong ba nấc. Giữ trạng thái đầu (0,0,0,0) và đích hình học (2,0,0,2); số chỉ dùng trong tài liệu tác giả.

Người chơi quan sát hai vành cùng chuyển sau một thao tác. Đường vòng phía sau và Pulse cho thấy trục chung nằm dưới rêu. Trong tối, vài đom đóm còn trưởng thành đậu quanh các miệng nhận cố định, làm rõ nơi từng rãnh phải nối. Lớp tối cho biết đích; Pulse cho biết quan hệ truyền động. Cả hai không cho số lần quay.

Lời giải mẫu vẫn là X hai lần, Z hai lần, Y một lần, theo bất cứ thứ tự nào. Các rãnh đúng giữ phản hồi ngay cả khi rãnh khác lệch. Quay quá có thể quay tiếp để chỉnh lại, không reset máy.

Ghi chú của thợ cũ giữ câu “Các vành ở giữa cùng ăn hai trục.” Nhinh chỉ nhận xét sau khi người chơi đã làm hai vành chuyển: “Hai chiếc cùng đi. Chúng còn chung trục.” Không đọc giúp bước tiếp.

### Kết quả phải nhìn thấy

Cả bốn đoạn nối thành một đường dẫn liên tục. Cơ cấu liên động với cổng có thanh truyền được vẽ rõ; đường thông thì nó nhả cổng; khi cánh mở hết, một lẫy nhìn thấy được tự sập giữ cổng, nên quay tay quay sau đó không đóng lại. Đây không phải một cánh cửa tự hiểu đáp án biểu tượng.

Một vài đom đóm trưởng thành đang có sẵn đi theo đường dẫn trở về các hốc. Chúng không phải một lứa mới nở và không chứng minh vườn đã hồi phục; phần thưởng đó vẫn thuộc màn 07. Nhinh đã hiệu chỉnh được thiết bị, còn những hốc ngủ vẫn im lặng.

Một bản ghi ngắn cho thấy người giữ vườn mang đèn về cuối ca:

> **Nhinh:** “Hồi đó họ cũng đến kiểm tra đèn.”
>
> **Lumo:** “Rồi họ mang đèn về. Vườn được ngủ.”

Sơ đồ vòng sáng/tối ở cổng dẫn tới câu hỏi cho thư viện: người trước đây đã cho mạng nghỉ như thế nào? HUD: “Hiệu chỉnh lại cụm dẫn đường”.

## 4. Màn 03 — Thư viện dưới rễ

**Câu hỏi của màn:** Quy trình ban đầu thực sự vận hành thế nào, và phần nào không còn trong sách Nhinh biết?

### Cảnh vào

Nhinh nhận ra họ ký hiệu trong sách bảo trì của mẹ. Cô đọc được các đầu nối và chiều chuyển, nhưng bản gốc có một lớp ghi chép chỉ hiện khi không bị đèn rọi. Lumo hỏi: “Trong sách của cậu có phần dành cho rừng không?” Nhinh nhìn lại phần còn thiếu trước khi trả lời.

Thư viện có một vòng lịch cơ khí và mô hình thử nước bốn chặng. Đây là nơi người bảo trì học và kiểm tra quy trình. Nhinh không tự biết thiết kế cổ; cô dùng tài liệu và mô hình để bổ sung kiến thức. Mô hình chạy bằng tay, không cần đèn cấp nguồn; nước trong mô hình không đổi mạng thật.

### Phần A — khôi phục chu kỳ

Giữ bốn phiến Chim, Lá, Thuyền, Hạt. Dấu viền nhận diện phiến, không mang thứ tự đáp án. Lớp sáng cho vị trí thiên thể; lớp tối cho hướng chuyển động:

- Chim: mặt trời sát chân trời và mũi tên lên, nghĩa là bình minh.
- Lá: mặt trời cao và cung đỉnh, nghĩa là ban ngày.
- Thuyền: mặt trời sát chân trời và mũi tên xuống, nghĩa là hoàng hôn.
- Hạt: mặt trăng cao và cung đỉnh, nghĩa là ban đêm.

Từng lớp riêng chưa đủ phân biệt các cặp. Người chơi soi, lùi khỏi phạm vi hoặc tắt F để đọc phần còn lại; J chỉ giữ hình đã nhìn thấy, không tự đặt tên thời điểm. Trang thực hành có ví dụ khác và không bắt buộc phải đọc.

Chim–Lá–Thuyền–Hạt theo mốc đầu phục dựng vòng lịch. E chạy thử cho thấy chuyển động có đứt đoạn hay không, không reo từng ô đúng. Vòng khớp nối trục mở gian mô hình phía sau. Cửa giữ bằng chốt sau khi mở, nên thử đổi phiến không nhốt người trong gian sau.

### Phần B — thử quy trình có nuôi được cả hai phía

Mỗi chặng có một van chọn cấp ra bến hoặc hồi về rễ. Dấu trên mô hình cho biết rễ nhận đầu chu kỳ để hồi phục; bến nhận lúc ngày để nạp kho; phần còn lại quay về rễ sau khi mặt trời hạ. Cấu hình đúng là hồi–cấp–hồi–hồi.

Người chơi E bánh xe để đi từng chặng và quan sát kho bến/rễ. Tất cả hồi thì kho bến không được nạp; cấp liên tục thì phần rễ thiếu hồi phục. Được thử và xác nhận trực tiếp nếu đã suy ra cấu hình, không có cờ bắt xem đủ bốn hoạt ảnh. Cần xác nhận cạnh bánh xe chốt mô hình: cấu hình đúng thì trục hãm giữ; cấu hình sai thì mô hình chạy một lượt, chỉ báo phía đang thiếu và không khóa gì. Mô hình không tự chốt chỉ vì cấu hình vừa khớp. Pulse chỉ hiện trục và đường ống tĩnh nối hai phần mô hình.

### Kết và chuyển màn

Khi người chơi xác nhận ở cần lúc chu kỳ và van đã khớp, trục hãm giữ cấu hình rồi mở ngăn tinh thể Ký Ức. Vạch vòng ngày trên bộ phận này tương ứng vòng lịch vừa sửa; người chơi có cơ sở hiểu nó lưu chu kỳ cho bộ điều tiết, không chỉ là một vật thưởng màu vàng.

Nhinh đặt phần sơ đồ của xưởng cạnh dấu hồi của bản gốc:

> **Nhinh:** “Bản ở xưởng chỉ còn nửa đường ống.”
>
> **Lumo:** “Nửa bị mất đi đâu?”
>
> **Nhinh:** “Trong bản này nó còn đường về. Mình phải xem ngoài trạm còn chảy không.”

Kiến thức chắc chắn: thiết kế có cả cấp và hồi. Điều chưa biết: tuyến thật bị hỏng, bị chặn hay đang chạy sai chế độ. Chưa kết luận ai cố tình xóa hồ sơ, chưa gọi bến là bên xấu. HUD: “Khôi phục và thử một chu kỳ cấp–hồi”.

## 5. Màn 04 — Con suối dưới trăng vỡ

**Câu hỏi của màn:** Khi nhánh bến hoạt động trở lại, phần hồi của rừng có thật sự được giữ không?

### Cảnh vào

Hai người đến điểm tuyến Bến tách khỏi tuyến Rễ. Lòng suối cạn; phù điêu bão cho thấy đèn từng giúp thuyền về. Nhinh nhớ tới bác lái đò. Lumo cũng nhìn thấy ánh sáng ấy từng có ích, dù khu vườn hiện đang trả giá.

Nhinh đã học về hồi lưu ở 03 nên không vào trạm với ý định mở tối đa. Cô muốn thử xem việc mở đường hồi cục bộ có đủ giữ dòng khi bến nhận nguồn hay không. Tài liệu cũ chỉ là mốc đối chiếu, không đảm bảo máy ngoài thực địa vẫn chạy đúng.

### Phần A — tiếp cận trạm và giữ đường mang dụng cụ về

Giữ ba khu: Tây có S/G1, đảo có tay truyền động G1/G2, Đông có hãm A/B, van hồi N và trạm thử T. Một đèn nguồn thử, hai cầu và một trạm đều cần các tuyến riêng. Các tia chỉ điều khiển thiết bị; đường nước/năng lượng chính được vẽ riêng.

Người chơi cấp A từ S để tới đảo; chuyển G1 sang G2 để cấp B và tới Đông. Gài B, dùng đường đã giữ để cấp lại A rồi gài A bằng thanh truyền từ Đông. Hai cầu giữ bằng cơ khí cho phép rút nguồn thử khỏi tuyến đi bộ và dành nó cho T. Bệ S nằm ngoài tầm E từ mặt cầu A, nên không thể nhặt đèn trên cầu rồi đi qua khi A chưa gài. Bờ Đông không có bệ; T chỉ nhận tia qua G2.

Đường mẫu giữ việc đi lại và chuyển nguồn hiện có. Không bắt người chơi đi thử một cầu đã chốt hoặc thực hiện đúng thứ tự đó nếu trạng thái thật đã hợp lệ. Nguồn bị tắt khi ở đảo/Đông vẫn có các cần hồi đúng phía để phục hồi; cầu chịu tải giữ tới bờ, không có phản xạ hoặc rơi.

### Phần B — đối chiếu hai nhánh bằng phép thử hữu hạn

Pulse ở sơ đồ Tây cho cấu trúc S/G1/G2/A/B/T và vị trí N. Trong tối, khoáng trên hai ống chính cho thấy hướng Bến/Rễ; nó không nêu nấc gương. Tia S→G1→G2 chạy ngay trên hai ống, nên khi S bật, đoạn khoáng dưới tia bị che; muốn đọc phải tắt F (kể cả từ xa) hoặc đọc đoạn ống ngoài đường tia. Trước khi thử, bảng và lò xo trả van cho thấy máy lấy một mẫu có giới hạn rồi tự về tải thấp. Nút dừng ở cạnh bảng. Nhinh không cần chờ hậu quả vượt ngưỡng mới được dừng.

T chỉ chạy khi được cấp từ S qua G1/G2 đúng tuyến và N đang mở hồi. Nếu thiếu, phản hồi nêu đúng điều kiện hiện thiếu. Không kiểm cờ đã Pulse, đã đọc cảnh báo hoặc đã gài từng chốt. Nhinh có thể kiểm tra cấu hình và thử trước khi giữ hết đường, rồi hoàn thiện đường lấy đèn sau.

E tại T mở van lấy mẫu trên dòng chính. Chỉ báo Bến tăng, chỉ báo Rễ hạ dù N đã thông. Hai dấu phải cùng nhìn/đối chiếu được tại trạm; không giấu đầu Rễ ở phòng người chơi không thấy để tạo bất ngờ bằng thoại. Người chơi có thể dừng sớm và vẫn nhận được bằng chứng của mẫu cùng diễn biến truyện. Khi kết thúc hoặc mất nguồn thử, van chính tự trở về tải thấp; F không thay quyền điều khiển toàn mạng.

### Cao trào demo

Nhinh thấy nhánh bến nhận nguồn và thoáng nhẹ nhõm. Cô chưa tuyên bố cả mạng đã được sửa. Tiếng mẹ qua trạm vang lên:

> **Mẹ:** “Đèn bến sáng rồi, Nhinh. Mọi người đang gọi tên con đấy.”
>
> **Lumo:** “Nhinh… nước bên này đang rút.”

Lumo chao xuống trên bờ khô. Chỉ báo và dòng nước đã cho thấy điều cậu nói; cậu không bị dùng làm một thước đo bắt buộc phải chịu đau. Mẫu tự dừng hoặc người chơi dừng sớm; không có hậu quả vĩnh viễn và không phát lại sự suy yếu khi xem lại kết quả hoặc tải save.

> **Nhinh:** “Lúc lấy mẫu, van hồi đã mở. Đường về chưa đứt… nhưng phần nước vẫn hụt.”
>
> **Mẹ:** “Mẹ đang đưa những chuyến thuyền cuối vào bến. Con nói mẹ nghe bên đó thế nào.”
>
> **Nhinh:** “Mỗi lần bên mình nhận thêm, phần về rừng lại hụt. Mẹ giúp con chuẩn bị dùng ít hơn được không?”

Mẹ xác nhận sẽ gom thuyền và chuẩn bị ca bơm, nhưng cần Nhinh tìm mức vận hành ở tháp trước khi thay chế độ. Bà không lập tức tắt mọi dịch vụ. Nhinh đã chủ động nhờ mẹ giúp, chưa tự quyết toàn bộ phần việc ở quê.

Lumo hồi sáng khi mẫu dừng. Nhinh nhìn cơ cấu:

> **Nhinh:** “Tôi cứ nghĩ nối lại được là sửa xong.”
>
> **Lumo:** “Giờ cậu đã thấy cả bên này rồi.”

Đây là giới hạn trong cách Nhinh đánh giá thành công, không phải một tai nạn do cô cố tình làm sai quy trình. Phép thử đã giúp hai người biết van cục bộ chưa đủ; cần tới bộ điều tiết tuyến lớn.

### Việc người chơi hoàn tất và điểm dừng demo

Sau mẫu, lò xo đưa van lấy mẫu về tải thấp và một lẫy nhìn thấy được khóa tay thử T. E tại T sau đó chỉ cho xem lại hai kết quả đã ghi, không mở van chính lần nữa. Không có một lần thử tải lặp lại làm rút nước nhưng lại giấu tác động lên Lumo. Việc dừng sớm, mất nguồn thử hoặc đóng N khi mẫu đang được trình bày đều làm van lấy mẫu trở về tải thấp và gài lẫy; không đòi phản xạ.

Lần E hợp lệ đầu tiên lấy cặp số đo Bến/Rễ và ghi kết quả trong cùng bước máy bắt đầu lấy mẫu; phần nước chuyển và chỉ báo sau đó trình bày kết quả ấy. E khi thiếu nguồn hoặc N đóng không lấy được mẫu và không ghi kết quả. Vì thế, dừng sớm sau một lần bắt đầu hợp lệ vẫn giữ bằng chứng đã đo, không cần chờ một khoảng thời gian tối thiểu. Nếu lưu giữa phần trình bày rồi tải lại, T ở tải thấp đã gài lẫy, kết quả và tiến độ liên lạc được giữ, không phát lại hậu quả; không tạo thêm một mẫu.

N là van riêng, vẫn mở/đóng được bằng E. T dừng không tự đổi vị trí N. Lưu và tải đúng vị trí N thực tế; nếu người chơi đã đóng N sau mẫu, phải mở lại từ nền Đông để để trạm ở chế độ hồi an toàn trước khi kết demo. Không tự mở van khi tải save. Hai cầu cần có hỗ trợ thật để Nhinh đi về Tây lấy đèn rồi mang qua tới Đông. Không nhặt đèn từ xa hoặc tự chuyển vào tay khi cắt cảnh. Nếu còn cầu chưa gài, phục hồi và gài bằng các tay đã có; không reset kết quả chẩn đoán.

Bỏ qua thoại vẫn ghi kết quả của phép thử và việc mẹ chuẩn bị phối hợp. Hướng ra phía tháp xuất hiện trong nhịp kết truyện. Bản demo kết thúc khi Nhinh tới lối ra Đông với đèn đang cầm, đã có kết quả mẫu thật, T về tải thấp với lẫy đã gài và N đang mở hồi. Không kiểm cờ đã đọc manh mối, đã nghe đủ thoại hay đã gài cầu theo thứ tự; việc mang đèn tới Đông phải đi qua đường vật lý hợp lệ. Lối ra Đông là bậc đá dẫn về phía tháp, luôn nhìn thấy; bước vào vùng ra khi chưa đủ điều kiện thì hiện một dòng nêu điều còn thiếu và không chuyển cảnh. Nếu tới lối ra khi chưa thử, mục tiêu vẫn là kiểm tra T; nếu N đóng, mục tiêu nhắc mở lại van hồi đang tới được trên nền Đông. Không phát cảnh như thể đã biết kết quả hoặc trạm đã an toàn. Bản đầy đủ dùng điểm này để sang 05.

Demo trả lời được câu hỏi ban đầu: sửa nhánh bến riêng lẻ không khôi phục cân bằng của mạng. Câu hỏi mở là vì sao chế độ đang rút phần hồi vẫn được duy trì. Không tiết lộ quyết định khóa quyền của Guardian, không đưa lời giải 2/1/1 của màn 06 vào demo.

HUD lần lượt theo sự kiện thực: “Kiểm tra tuyến Bến và tuyến Rễ” → “Đưa trạm thử về mức an toàn” → nếu N đang đóng thì “Mở van hồi N” → “Thu đèn và tiếp tục tới tháp”. Mục tiêu mở van có ưu tiên khi N chưa thông, kể cả nếu Nhinh đã thu đèn; không hướng người chơi tới lối ra khi trạm còn thiếu điều kiện hồi an toàn.

## 6. Cách thể hiện nghề và độ khó

Đồ vật giữ cùng họ vật liệu đồng/kính/đá/rễ. Khớp nguồn, vòng giữ và bộ hãm ở màn 01–02 gợi lại thứ Nhinh đã dùng trong xưởng; không đổi đèn lồng thành đèn pin hoặc làm Nhinh thành chuyên gia về mọi thiết bị cổ. Mọi bộ phận thêm vào hình phải có chức năng hoặc là bằng chứng đọc được, tránh trang trí giống tương tác rồi không phản hồi.

Trong demo, khó tăng bằng quan hệ cần suy ra: 01 giữ kết quả khi chuyển nguồn; 02 một điều khiển ảnh hưởng hai phần; 03 ghép bằng chứng rồi kiểm quy trình; 04 chuẩn bị đường, phân biệt nguồn thử với dòng chính và đọc kết quả ở hai phía. Không tăng khó bằng kéo dài đường đi, giấu vật, tăng số lần bấm hoặc bắt Nhinh mắc lỗi trước.

Giữ khoảng thời lượng hiện có làm ước lượng chưa đo. Chưa có bằng chứng bản này giải quyết phản hồi demo quá dễ. Khi dựng thử về sau, cần quan sát người mới có nêu được nguyên nhân và dự đoán được hậu quả thao tác hay chỉ thử mù; đó là mục tiêu đánh giá, không phải cờ gameplay.

## 7. Phạm vi đồng bộ tài liệu

- Cập nhật 01–04 theo diễn biến và lời thoại trên; giữ đầy đủ bố cục, nguồn, lời giải, phục hồi, checkpoint, save và H của từng màn.
- Đồng bộ các hàng 01–04 trong README, bảng nhịp chiến dịch và kế hoạch art; bổ sung yêu cầu nghề nghiệp vào đúng phần có sẵn. Không biến nội dung này thành một bộ luật gameplay mới.
- Không viết lại prologue, story bible, các bản nguyên văn, màn 05–10 hoặc outline phần 2. Đường nối sang 05 vẫn là Lumo còn băn khoăn, Nhinh hứa đi cùng tới vườn và cả hai cần kiểm tra tháp.
- Lưu báo cáo đọc/rà ở design-review.md, phân biệt tài liệu đã rà với runtime chưa làm. Các thay đổi code đang diễn ra ngoài đợt này không thuộc phạm vi.
- Luna chỉ tích hợp thiết kế đã viết. Nếu thấy một điều kiện chưa thể diễn đạt nhất quán hoặc cần đổi câu đố, báo orchestrator để quyết định và sửa bản nguồn này trước.

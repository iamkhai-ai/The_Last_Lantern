export interface CampaignLevelDefinition {
  title: string;
  chapter: string;
  objective: string;
  biome: 'woods' | 'library' | 'creek' | 'tower' | 'garden' | 'ruins' | 'observatory' | 'heart';
  /** Optional: Level 03 hints are owned by LibraryLevel.showHint(), so its entry omits this array. */
  hint?: [string, string, string];
}

export const CAMPAIGN_LEVELS: CampaignLevelDefinition[] = [
  { title: 'Forgotten Forest Edge', chapter: 'MEMORY · 1 / 3', objective: 'Nhận đèn, đọc bia đá, mở cổng rừng.', biome: 'woods', hint: ['Bia đá nằm gần chiếc đèn cũ.', 'Mắt đá đang nhìn về một vòng tròn trên đất.', 'Nhận đèn bằng E, bật bằng F, dùng SPACE tìm dấu chân rồi đứng vào vòng sáng.'] },
  { title: 'Whispering Woods', chapter: 'MEMORY · 2 / 3', objective: 'Soi ba cổ tự và kích hoạt đúng thứ tự.', biome: 'woods', hint: ['Quan sát đường bay của đàn đom đóm.', 'Bài thơ nhắc ba hình theo đúng thứ tự.', 'Pulse soi các bia; kích hoạt Trăng, Lá, rồi Sao.'] },
  { title: 'Library Beneath the Roots', chapter: 'MEMORY · 3 / 3', objective: 'Đọc cả hai lớp tranh và khôi phục vòng ngày đêm.', biome: 'library' },
  { title: 'Shattered Moonlit Creek', chapter: 'HOPE · 1 / 3', objective: 'Điều hướng tia sáng và gài hai chốt cầu.', biome: 'creek', hint: ['Bắt đầu từ bệ đèn ở bờ Tây.', 'Cầu đầu phải được gài chốt trước khi đổi tia.', 'Xoay G1/G2 tới mắt A, gài chốt; đổi tia qua G3 tới mắt B rồi gài chốt thứ hai.'] },
  { title: 'A Path for Two', chapter: 'HOPE · 2 / 3', objective: 'Đưa cả hai người tới chân tháp.', biome: 'tower', hint: ['Mỗi mốc gọi và mỗi ấn đều có dấu chấm. Dấu trên ấn vẽ bằng mực, đèn sáng quá thì khó thấy.', 'Tôi rời ấn thì cửa đóng, trừ khi cậu đã gài chốt. Mốc gọi một ấn có khi nằm ở buồng phía trước.', 'Gài chốt cửa vừa qua. Quay lại buồng trước, nhấn E ở mốc có cùng số chấm với ấn đang trống.'] },
  { title: 'The Sleepless Tower', chapter: 'HOPE · 3 / 3', objective: 'Nối các thấu kính và phối hợp cùng Lumo.', biome: 'tower', hint: ['Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử cho thấy cách tách tia.', 'Gương chung phải cấp cho lăng kính để hai nhánh cùng sáng. Tôi giữ điều kiện thứ ba.', 'Hướng G0 vào lăng kính, G1 vào A, G2 vào B. Gọi tôi tới C rồi dùng cần Trả dòng khi cả ba sáng.'] },
  { title: 'The Sleeping Garden', chapter: 'BALANCE · 1 / 3', objective: 'Đánh thức cây bằng nắng và nối nhịp cầu rễ.', biome: 'garden', hint: ['Hai chậu thử phản ứng trái ngược. Sau thanh chắn có một tay chốt.', 'Giữ thanh chắn bằng chốt, rồi tắt đèn để rễ làm cầu. Một phần đường phải tự giữ trước khi phần kia xuất hiện.', 'Bật đèn, qua thanh chắn và gài chốt. Tắt đèn, qua cầu rễ, mở cống rồi tới điện thờ.'] },
  { title: 'Ruins of Two Halves', chapter: 'BALANCE · 2 / 3', objective: 'Cân bằng hai cảm biến sáng và một vùng bóng.', biome: 'ruins', hint: ['Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.', 'Hai khóa Nhật cần sáng cùng lúc. Khóa Nguyệt cần bóng của tượng, trong khi đèn vẫn bật.', 'Đặt đèn, hướng hai gương vào hai Nhật. Xoay mặt rộng của tượng chắn luồng giữa tới Nguyệt, rồi xác nhận ở bệ.'] },
  { title: 'Dark Moon Observatory', chapter: 'BALANCE · 3 / 3', objective: 'Khôi phục ba phòng quan sát và tìm tinh thể Cân Bằng.', biome: 'observatory', hint: ['Xem các đường nối trên tường. G0 dùng cho cả cửa vào lẫn đường tia tới phòng sao.', 'Giữ cửa vào bằng chốt rồi đổi nguồn sang phòng sao. Cửa cuối cần sáng, nhưng rễ cần bóng của tượng.', 'Gài cửa A, gọi tôi tới ấn, hướng G0 qua G1 tới G2. Chọn đường G2 qua khung tượng, giữ luống rễ trong bóng tượng khi mạch đèn vẫn nối qua cửa, rồi qua cầu và mở lối vòng.'] },
  { title: 'The Heart of Elaria', chapter: 'THE LAST LANTERN', objective: 'Đặt đủ ba tinh thể và đưa bình minh trở lại.', biome: 'heart', hint: ['Xem đường nối từ bệ và dấu sáng trên cả ba nhánh. Nhánh nào chưa giữ được trạng thái?', 'Lăng kính phải cấp cả Ký Ức lẫn Cân Bằng. Tôi mở màn Hy Vọng; bóng tượng giữ lõi giữa tối.', 'Gọi tôi tới ấn, hướng G0 vào lăng kính, chỉnh nhánh vàng tới tinh thể và nhánh tím qua tượng. Khi hai mắt ngoài sáng, lõi tối và ba rễ nối đều, xác nhận ở giữa.'] },
];

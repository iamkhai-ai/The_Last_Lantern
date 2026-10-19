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
  { title: 'A Path for Two', chapter: 'HOPE · 2 / 3', objective: 'Gọi Lumo giữ các ấn và mở đường qua trạm.', biome: 'tower', hint: ['Mốc gọi sẽ đưa Lumo tới ấn tương ứng.', 'Đi qua cửa rồi gài chốt trước khi gọi Lumo đi tiếp.', 'Gọi Lumo tới A, B, C; tắt đèn ở hành lang mực và gài chốt cuối.'] },
  { title: 'The Sleepless Tower', chapter: 'HOPE · 3 / 3', objective: 'Nối các thấu kính và phối hợp cùng Lumo.', biome: 'tower', hint: ['Các gương đổi hướng đường sáng.', 'Lumo cần đứng ở ấn cao để giữ luồng thứ ba.', 'Căn hai gương vào hai bộ nhận, gọi Lumo tới ấn rồi kích hoạt tháp.'] },
  { title: 'The Sleeping Garden', chapter: 'BALANCE · 1 / 3', objective: 'Đánh thức cây bằng nắng và nối nhịp cầu rễ.', biome: 'garden', hint: ['Cây nắng cần đèn; rễ trăng cần bóng tối.', 'Công tắc cạnh từng lối sẽ giữ lối đã mở.', 'Bật đèn mở cây nắng, tắt đèn mở rễ trăng, rồi gài hai chốt.'] },
  { title: 'Ruins of Two Halves', chapter: 'BALANCE · 2 / 3', objective: 'Cân bằng hai cảm biến sáng và một vùng bóng.', biome: 'ruins', hint: ['Hai mắt ngoài nhận ánh sáng.', 'Mắt giữa cần ở trong bóng khi hai mắt ngoài sáng.', 'Xoay tượng cho bóng phủ mắt giữa, bật đèn và kích hoạt bàn cân.'] },
  { title: 'Dark Moon Observatory', chapter: 'BALANCE · 3 / 3', objective: 'Khôi phục ba phòng quan sát và tìm tinh thể Cân Bằng.', biome: 'observatory', hint: ['Mỗi phòng giữ một phần của đường đi.', 'Bóng cầu thang chỉ hiện khi đèn tắt.', 'Căn gương, gọi Lumo giữ ấn, tắt đèn để qua cầu bóng rồi lấy tinh thể.'] },
  { title: 'The Heart of Elaria', chapter: 'THE LAST LANTERN', objective: 'Đặt đủ ba tinh thể và đưa bình minh trở lại.', biome: 'heart', hint: ['Ba hốc quanh Cây Mẹ cần đủ ba tinh thể.', 'Những rễ cuối phản hồi với ánh sáng và bóng tối.', 'Đặt Memory, Hope, Balance; ổn định rễ, lấy đèn và tắt nó để khép lại đêm.'] },
];

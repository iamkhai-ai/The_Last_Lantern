/**
 * Level titles are English in the source; objectives, chapters and H hints are Vietnamese and reach the
 * player through the HUD and the H hint ladder, so they need entries of their own.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const CAMPAIGN_LEVEL_ENTRIES: readonly CatalogEntry[] = [
  entry('levels.01.objective', 'Nhận đèn, đọc bia đá, mở cổng rừng.', 'Take the lantern, read the stone tablet, open the forest gate.'),
  entry('levels.02.objective', 'Soi ba cổ tự và kích hoạt đúng thứ tự.', 'Light the three runes and activate them in order.'),
  entry('levels.03.objective', 'Đọc cả hai lớp tranh và khôi phục vòng ngày đêm.', 'Read both layers of the murals and restore the ring of day and night.'),
  entry('levels.04.objective', 'Điều hướng tia sáng và gài hai chốt cầu.', 'Route the light and latch both bridges.'),
  entry('levels.05.objective', 'Đưa cả hai người tới chân tháp.', 'Take both of you to the foot of the tower.'),
  entry('levels.06.objective', 'Nối các thấu kính và phối hợp cùng Lumo.', 'Align the prisms and work with Lumo.'),
  entry('levels.07.objective', 'Đánh thức cây bằng nắng và nối nhịp cầu rễ.', 'Wake the plants with sunlight and bridge the roots.'),
  entry('levels.08.objective', 'Cân bằng hai cảm biến sáng và một vùng bóng.', 'Balance two light sensors and one patch of shadow.'),
  entry('levels.09.objective', 'Khôi phục ba phòng quan sát và tìm tinh thể Cân Bằng.', 'Restore the three observatory rooms and find the Balance Crystal.'),
  entry('levels.10.objective', 'Đặt đủ ba tinh thể và đưa bình minh trở lại.', 'Set all three crystals and bring the dawn back.'),

  entry('levels.01.hint1', 'Bia đá nằm gần chiếc đèn cũ.', 'The stone tablet is near the old lantern.'),
  entry('levels.01.hint2', 'Mắt đá đang nhìn về một vòng tròn trên đất.', 'The stone eye is looking at a circle on the ground.'),
  entry('levels.01.hint3', 'Nhận đèn bằng E, bật bằng F, dùng SPACE tìm dấu chân rồi đứng vào vòng sáng.', 'Take the lantern with E, light it with F, use SPACE to find the footprints, then stand in the lit ring.'),
  entry('levels.02.hint1', 'Quan sát đường bay của đàn đom đóm.', "Watch the fireflies' flight path."),
  entry('levels.02.hint2', 'Bài thơ nhắc ba hình theo đúng thứ tự.', 'The poem names three figures in order.'),
  entry('levels.02.hint3', 'Pulse soi các bia; kích hoạt Trăng, Lá, rồi Sao.', 'Pulse the runes, then activate Moon, Leaf, then Star.'),
  entry('levels.04.hint1', 'Bắt đầu từ bệ đèn ở bờ Tây.', 'Start at the lantern stand on the west bank.'),
  entry('levels.04.hint2', 'Cầu đầu phải được gài chốt trước khi đổi tia.', 'Latch the first bridge before rerouting the beam.'),
  entry('levels.04.hint3', 'Xoay G1/G2 tới mắt A, gài chốt; đổi tia qua G3 tới mắt B rồi gài chốt thứ hai.', 'Turn G1/G2 to receiver A and latch it; reroute through G3 to receiver B, then latch the second.'),
  entry('levels.05.hint1', 'Mỗi mốc gọi và mỗi ấn đều có dấu chấm. Dấu trên ấn vẽ bằng mực, đèn sáng quá thì khó thấy.', 'Every call post and every plate has a dot. The mark on a plate is ink, and bright light makes it hard to see.'),
  entry('levels.05.hint2', 'Tôi rời ấn thì cửa đóng, trừ khi cậu đã gài chốt. Mốc gọi một ấn có khi nằm ở buồng phía trước.', 'If I leave a plate, its door shuts unless you have latched it. The post for a plate may be in the room before.'),
  entry('levels.05.hint3', 'Gài chốt cửa vừa qua. Quay lại buồng trước, nhấn E ở mốc có cùng số chấm với ấn đang trống.', 'Latch the door you just crossed. Go back to the room before and press E at the post with the same number of dots as the empty plate.'),
  entry('levels.09.hint1', 'Xem các đường nối trên tường. G0 dùng cho cả cửa vào lẫn đường tia tới phòng sao.', 'Study the routes on the walls. G0 serves both the entrance door and the beam into the star room.'),
  entry('levels.09.hint2', 'Giữ cửa vào bằng chốt rồi đổi nguồn sang phòng sao. Cửa cuối cần sáng, nhưng rễ cần bóng của tượng.', 'Latch the entrance door, then move the source to the star room. The far door needs light, but the roots need the statue shadow.'),
  entry('levels.09.hint3', 'Gài cửa A, gọi tôi tới ấn, hướng G0 qua G1 tới G2. Chọn đường G2 qua khung tượng, che luống rễ rồi qua cầu và mở lối vòng.', 'Latch Door A, call me to the seal, aim G0 through G1 to G2. Take the G2 route past the statue frame, shade the root bed, cross the bridge and open the loop.'),
];

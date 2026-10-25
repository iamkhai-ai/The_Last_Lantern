/**
 * Level 01, the forgotten forest edge: the lines of the first meeting, the deal the two of them make, the journal note
 * it writes, and the HUD and hint copy for picking the maintenance lamp up off the ground (forestEdgeLogic.ts).
 *
 * Only the copy authored for the opening and the agreement is here; the rest of the level still reads in Vietnamese
 * and is localized in its own pass.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const FOREST_EDGE_ENTRIES: readonly CatalogEntry[] = [
  entry('v4.forestEdge.openingLumo', 'Cậu có thể đừng soi vào nhà người khác không?',
    'Could you not shine that into someone else\'s home?'),
  entry('v4.forestEdge.openingNhinh', 'Xin lỗi. Tôi đến đây để kiểm tra trạm.',
    'Sorry. I came here to check the station.'),
  entry('v4.forestEdge.agreementNhinh1', 'Tôi là Nhinh, thợ sửa đèn ở Bến Sương.',
    'I\'m Nhinh. I repair lamps down at Ben Suong.'),
  entry('v4.forestEdge.agreementLumo1', 'Còn tôi là Lumo. Tôi muốn về vườn của mình, nhưng cổng bảo trì đóng cả rồi.',
    'And I\'m Lumo. I want to get back to my garden, but the maintenance gates are all shut.'),
  entry('v4.forestEdge.agreementLumo2', 'Tôi biết đường qua thư viện và trung tâm trạm. Cậu giúp tôi mở lối vào vườn nhé?',
    'I know the way through the library and the station centre. Will you help me open the way into the garden?'),
  entry('v4.forestEdge.agreementNhinh2', 'Cậu dẫn đường, tôi giúp mở lối vào vườn. Nhưng tôi phải kiểm tra nguồn của bến trước.',
    'You lead the way, and I help open the garden path. But first I have to check the harbour\'s power.'),
  entry('v4.forestEdge.journalAgreement',
    'Lumo muốn về vườn nhưng cổng bảo trì đóng. Cậu biết đường qua thư viện và trung tâm trạm; đổi lại, Nhinh giúp cậu mở lối vào vườn. Nhinh kiểm tra trạm trước.',
    'Lumo wants to get back to his garden, but the maintenance gates are shut. He knows the way through the library and the station centre; in exchange, Nhinh helps him open the way into the garden. Nhinh checks the station first.'),
  entry('v4.forestEdge.objTakeLantern', 'Nhặt đèn cạnh bia để kiểm tra trạm',
    'Pick up the lamp by the marker to check the station'),
  entry('v4.forestEdge.hintTakeLantern1', 'Đèn bảo trì vẫn ở nơi Nhinh đặt trước khi ngủ.',
    'The maintenance lamp is still where Nhinh set it down before she slept.'),
  entry('v4.forestEdge.hintTakeLantern2', 'Chiếc đèn nằm trên đất cạnh bia, chưa ở trong tay.',
    'The lamp is on the ground beside the marker, not in her hand yet.'),
  entry('v4.forestEdge.hintTakeLantern3', 'Đi tới đèn cạnh bia rồi nhấn E để nhặt. Khi cầm đèn, F bật hoặc tắt.',
    'Walk to the lamp by the marker and press E to pick it up. Once it is in hand, F lights it or puts it out.'),
  // First-play lantern lessons (forestEdgeTutorial.ts).
  entry('v4.forestEdge.tutorialTake', 'Đèn bảo trì nằm cạnh bia. Lại gần đèn và nhấn E để nhặt lên.',
    'The maintenance lamp lies beside the marker. Walk up to it and press E to pick it up.'),
  entry('v4.forestEdge.tutorialLight', 'Nhấn F để bật đèn. Nhấn F lần nữa để tắt.',
    'Press F to light the lamp. Press F again to put it out.'),
  entry('v4.forestEdge.tutorialSee',
    'Đèn chỉ soi một vùng nhỏ quanh Nhinh. Dấu khắc trên đá và cơ chế chỉ đọc được khi nằm trong vùng sáng.',
    'The lamp lights only a small circle around Nhinh. Carvings and mechanisms can be read only inside that light.'),
  entry('v4.forestEdge.tutorialPulse',
    'Khi cầm đèn đang sáng, nhấn Space để phát xung sáng: dấu vết ẩn ở gần sẽ hiện ra. Thử đứng cạnh bia.',
    'With the lit lamp in hand, press Space to send a light pulse: hidden traces nearby show up. Try it beside the marker.'),
  entry('v4.forestEdge.tutorialPedestal',
    'Bệ S1 và S2 là chỗ cắm đèn thử. Đứng cạnh bệ, nhấn E để đặt đèn; đèn đang sáng trên bệ sẽ cấp nguồn thử cho cơ chế gần đó.',
    'Pedestals S1 and S2 are test sockets. Stand by one and press E to set the lamp down; a lit lamp on a pedestal feeds test power to the mechanism nearby.'),
  entry('v4.forestEdge.tutorialRetrieve', 'Đèn đặt trên bệ không đi theo Nhinh. Nhấn E ở bệ để lấy lại đèn khi cần.',
    'A lamp on a pedestal stays there. Press E at the pedestal to take it back when you need it.'),
];

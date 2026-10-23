/**
 * Copy that test-develop added or reworded in Levels 06-08 and 10 after the English branch forked. Keys are
 * the exact Vietnamese the merged source now carries.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const MERGED_LEVEL_COPY_ENTRIES: readonly CatalogEntry[] = [
  // Heart of Elaria hints and status.
  entry('heart.hint.crystals', 'Đặt ba tinh thể ({placed}/3).', 'Place the three crystals into the three alcoves ({placed}/3).'),
  entry('heart.hint.teach', 'Nối ba mạch rễ thành một vòng.', 'Join the three root branches into one ring.'),
  entry('heart.hint.routeOpen', 'Nối ba mạch rễ thành một vòng (còn {count} điều kiện).', 'Join the three root branches into one ring ({count} conditions still open).'),
  entry('heart.hint.ready', 'Ba nhánh đã sẵn sàng.', 'The three branches are ready.'),
  entry('heart.hint.retrieve', 'Lấy lại đèn.', 'Take the lantern back.'),
  entry('heart.status.overload', 'Đèn: {lantern}', 'Lantern: {lantern}'),

  // Ruins of Two Halves.
  entry('ruins.lost.both', 'Khóa Nhật trái và khóa Nhật phải', 'the left and right Sun Locks'),
  entry('ruins.lost.left', 'Khóa Nhật trái', 'the left Sun Lock'),
  entry('ruins.lost.right', 'Khóa Nhật phải', 'the right Sun Lock'),
  entry('ruins.lost.line', 'Bóng nghiêng đi. {which} đã tắt.', 'The shadow shifts. {which} went out.'),
  entry('ruins.hint.shadowNorthWest', 'Tới The Shadow ở phía tây bắc và nhấn E.', 'Go to The Shadow in the north-west and press E.'),
  entry('ruins.prompt.latched', 'E · Đã gài, không xoay nữa', 'E · Latched, no more turning'),
  entry('ruins.dialogue.shadowDemo1', 'Chỉ cần chỗ này tối.', 'Only this spot needs to be dark.'),
  entry('ruins.dialogue.shadowDemo2', 'Ông ấy đang che luồng giữa bằng chính mình.', 'He is shading the middle flow with his own body.'),
  entry('ruins.dialogue.shadowDemo3', 'Ta đã đứng như thế này rất lâu. Tay ta không giữ được nữa.', 'I have stood like this for a very long time. My arms cannot hold it much longer.'),
  entry('ruins.dialogue.lampOnAltar', 'Tối hết thì hai bên cũng ngủ.', 'If everything goes dark, both sides will sleep.'),
  entry('ruins.dialogue.nameSeen', 'Có ai đó khắc một cái tên ở đây. Mòn hết rồi.', 'Someone carved a name here. It has worn away completely.'),
  entry('ruins.dialogue.nameJournal', 'Một cái tên mòn dưới chân tượng. Không đọc được, và không ai nói đó là tên ai.', 'A worn name under the statue’s foot. It cannot be read, and no one says whose name it was.'),

  // Sleeping Garden hints.
  entry('garden.hint.water', 'Đưa nước tới vườn ươm.', 'Bring water to the nursery.'),
  entry('garden.hint.shrine', 'Tới cổng điện thờ.', 'Go to the shrine gate.'),
];

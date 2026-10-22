/**
 * Sentence fragments composed at runtime: journal lines, "still missing" reasons, mirror labels.
 *
 * A line assembled from parts cannot be found in the catalogue as a whole, so each part carries its
 * own entry and the composing site fills a `{placeholder}` template.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const FRAGMENT_ENTRIES: readonly CatalogEntry[] = [
  // Level 10 — Heart of Elaria eye reports (the sentence templates live in ruinsHeartObservatory.ts).
  entry('frag.side.left', 'trái', 'left'),
  entry('frag.side.right', 'phải', 'right'),

  // Level 03 — Library journal.
  entry('frag.library.journalInscription', 'Dòng khắc: {inscription}', 'Inscription: {inscription}'),
  entry('frag.library.bookLit', 'Trang sách · Đèn bật: {text}', 'Book page · Lamp on: {text}'),
  entry('frag.library.bookDark', 'Trang sách · Đèn tắt: {text}', 'Book page · Lamp off: {text}'),
  entry('frag.layer.lit', 'Đèn bật', 'Lamp on'),
  entry('frag.layer.dark', 'Đèn tắt', 'Lamp off'),
  entry('frag.stone.bird', 'Chim', 'Bird'),
  entry('frag.stone.leaf', 'Lá', 'Leaf'),
  entry('frag.stone.boat', 'Thuyền', 'Boat'),
  entry('frag.stone.seed', 'Hạt', 'Seed'),
  entry('frag.time.dawn', 'Bình minh', 'Dawn'),
  entry('frag.time.day', 'Ban ngày', 'Day'),
  entry('frag.time.dusk', 'Hoàng hôn', 'Dusk'),
  entry('frag.time.night', 'Ban đêm', 'Night'),

  // Level 08 — Ruins mirror reports and confirmation.
  entry('frag.ruins.mirrorLeft', 'Gương trái', 'Left mirror'),
  entry('frag.ruins.mirrorRight', 'Gương phải', 'Right mirror'),
  entry('frag.ruins.turnedNoLantern', '{mirror} đã xoay, nhưng bệ chính chưa có đèn.', '{mirror} has turned, but the main pedestal has no lantern.'),
  entry('frag.ruins.notAimed', '{mirror} chưa hướng tia lên khóa Nhật.', '{mirror} is not aiming its beam at the Sun Lock.'),
  entry('frag.ruins.shadowBlocks', '{mirror} đã hướng đúng, nhưng bóng của tượng chắn mất tia.', "{mirror} is aimed correctly, but the statue's shadow blocks the beam."),
  entry('frag.ruins.beamOn', '{mirror} đã bật tia tới khóa Nhật.', '{mirror} has lit its beam to the Sun Lock.'),
  entry('frag.ruins.needLitLantern', 'đặt đèn đang bật lên bệ', 'set a lit lantern on the pedestal'),
  entry('frag.ruins.needBothSuns', 'cho hai khóa Nhật sáng cùng lúc', 'light both Sun Locks at once'),
  entry('frag.ruins.needShadow', 'cho bóng tượng phủ khóa Nguyệt', 'let the statue shadow cover the Moon Lock'),
  entry('frag.ruins.notEven', 'Bàn xác nhận chưa sáng đều. Mình còn phải {missing}.', 'The confirmation plate is not evenly lit. I still need to {missing}.'),
  entry('frag.ruins.tablet', 'Bia đá: {text}', 'Stone tablet: {text}'),
  entry('frag.ruins.stillMissing', ' Còn thiếu: {missing}.', ' Still missing: {missing}.'),

  // Levels 05–06 — lantern stand reports and missing conditions.
  entry('frag.stand.practice', 'thử', 'practice'),
  entry('frag.stand.main', 'chính', 'main'),
  entry('frag.lanternOnStand', 'Đèn vẫn nằm trên bệ {stand}.', 'The lantern is still on the {stand} stand.'),
  entry('frag.tower.waiting', 'Máy vẫn đang chờ. Mình còn thiếu: {missing}.', 'The machine is still waiting. Still missing: {missing}.'),
  entry('frag.tower.needLanternOn', 'bật đèn', 'light the lantern'),
  entry('frag.tower.needMainStand', 'đặt đèn lên bệ chính', 'set the lantern on the main stand'),
  entry('frag.tower.moveToMain', 'đưa đèn sang bệ chính', 'move the lantern to the main stand'),
  entry('frag.tower.needBranchA', 'nối nhánh A', 'connect branch A'),
  entry('frag.tower.needBranchB', 'nối nhánh B', 'connect branch B'),
  entry('frag.tower.needSealC', 'giữ ấn C', 'hold seal C'),
  entry('frag.creek.needFirstLatch', 'gài chốt cầu đầu', 'latch the first bridge'),
  entry('frag.creek.needSecondLatch', 'gài chốt cầu thứ hai', 'latch the second bridge'),
  entry('frag.creek.notOpen', 'Trạm chưa mở. Mình còn cần {missing}.', 'The station is not open yet. I still need to {missing}.'),

  // Level 09 — Observatory door reasons and record requirements.
  entry('frag.observatory.doorLatchFailed', 'Chốt chưa gài được. {reason}', 'The latch could not be set. {reason}'),
  entry('frag.observatory.loopNotOpen', 'Lối đá vòng chưa mở được. {reason}', 'The stone loop could not be opened. {reason}'),
  entry('frag.observatory.recordLocked', 'Bản ghi chưa mở. Còn cần: {missing}.', 'The record is not open yet. Still needed: {missing}.'),
  entry('frag.observatory.needLanternBack', 'thu hồi đèn về tay', 'take the lantern back'),
  entry('frag.observatory.needLumoBack', 'gọi Lumo về bên đèn', 'call Lumo back to the lantern'),
  entry('frag.observatory.needLoop', 'mở lối đá vòng', 'open the stone loop'),

  // Level 02 — the poem cards. Two lines per card, and the Moon → Leaf → Star word chain is the puzzle.
  entry('frag.poem.1', 'Trăng soi qua kẽ lá,\nLá gọi sao về đây.', 'The moon looks through the leaves,\nand the leaves call the star home.'),
  entry('frag.poem.2', 'Sao canh rừng yên giấc,\nChờ nắng mai vén mây.', 'The star keeps the forest asleep,\nwaiting for dawn to part the clouds.'),

  // Level 04 — journal notes that quote mirror glyphs (a single backslash at runtime).
  entry('frag.creek.noteA', 'Ghi chép — cấu hình A: G1 / rồi G2 \\ dẫn tia tới mắt nhận A.', 'Note — setup A: G1 / then G2 \\ carries the beam to receiver A.'),
  entry('frag.creek.noteB', 'Ghi chép — cấu hình B: G1 /, G2 / rồi G3 \\ dẫn tia tới mắt nhận B.', 'Note — setup B: G1 /, G2 / then G3 \\ carries the beam to receiver B.'),
];

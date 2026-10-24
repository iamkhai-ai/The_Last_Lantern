/**
 * Chrome copy: main menu, pause menu, HUD key chips, and the shared dialogue prompt.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const CHROME_ENTRIES: readonly CatalogEntry[] = [
  // Main menu.
  entry('menu.subtitle', 'Khu rừng ánh sáng', 'The Forest of Light'),
  entry('menu.continue', 'Tiếp tục', 'Continue'),
  entry('menu.newJourney', 'Hành trình mới', 'New Journey'),
  entry('menu.soundOn', 'Âm thanh: Bật', 'Sound: On'),
  entry('menu.soundOff', 'Âm thanh: Tắt', 'Sound: Off'),
  entry('menu.selectHint', '↑↓ Chọn · Enter Xác nhận', '↑↓ Select · Enter Confirm'),
  entry('menu.confirmTitle', 'Bắt đầu hành trình mới?', 'Start a new journey?'),
  entry('menu.confirmBody',
    'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?',
    'Starting over will erase your saved progress. Do you want to continue?'),
  entry('menu.confirmHint', '←→ Chọn · Enter Xác nhận · Esc Quay lại', '←→ Select · Enter Confirm · Esc Back'),
  entry('menu.confirmBack', 'Quay lại', 'Back'),
  entry('menu.confirmStart', 'Bắt đầu lại', 'Start over'),
  entry('menu.languageVi', 'Ngôn ngữ: Tiếng Việt', 'Language: English'),

  // Pause menu.
  entry('pause.title', 'TẠM DỪNG (PAUSED)', 'PAUSED'),
  entry('pause.resume', 'TIẾP TỤC (RESUME)', 'RESUME'),
  entry('pause.restart', 'CHƠI LẠI TỪ ĐẦU (RESTART)', 'RESTART'),
  entry('pause.restartConfirm', 'XÁC NHẬN CHƠI LẠI? (NHẤN LẦN NỮA)', 'RESTART? (PRESS AGAIN)'),
  entry('pause.soundOn', 'ÂM THANH: BẬT', 'SOUND: ON'),
  entry('pause.soundOff', 'ÂM THANH: TẮT', 'SOUND: OFF'),
  entry('pause.mainMenu', 'MÀN HÌNH CHÍNH (MAIN MENU)', 'MAIN MENU'),
  entry('pause.level', 'MÀN: {number} · {name}', 'LEVEL: {number} · {name}'),
  entry('pause.levelSteppable', 'MÀN: ◂ {number} · {name} ▸', 'LEVEL: ◂ {number} · {name} ▸'),
  entry('pause.levelConfirm', 'VÀO MÀN {number}? NHẤN LẦN NỮA', 'GO TO LEVEL {number}? PRESS AGAIN'),
  entry('pause.controls1', 'WASD/↑↓←→ Đi · ⇧ Chạy · E Tương tác · F Đèn', 'WASD/↑↓←→ Move · ⇧ Run · E Interact · F Lantern'),
  entry('pause.controls2', 'SPACE Xung sáng · J Sổ tay · H Gợi ý · ESC Tạm dừng', 'SPACE Light Pulse · J Journal · H Hint · ESC Pause'),

  // HUD key chips.
  entry('hud.move', 'Đi', 'Move'),
  entry('hud.run', 'Chạy', 'Run'),
  entry('hud.interact', 'Tương tác', 'Interact'),
  entry('hud.lantern', 'Đèn', 'Lantern'),
  entry('hud.pulse', 'Xung sáng', 'Pulse'),
  entry('hud.journal', 'Sổ tay', 'Journal'),
  entry('hud.hint', 'Gợi ý', 'Hint'),
  entry('hud.pause', 'Tạm dừng', 'Pause'),
  entry('hud.pulseCooldown', 'Xung sáng còn {seconds} giây', 'Light Pulse ready in {seconds}s'),

  // Shared dialogue prompt.
  entry('dialogue.next', '[E / Space] Tiếp →', '[E / Space] Next →'),

  // Prologue panel chrome.
  entry('prologue.hint', 'Nhấn [E / Enter / Space] hoặc click để tiếp tục', 'Press [E / Enter / Space] or click to continue'),
  entry('prologue.skip', '[Esc] Bỏ qua', '[Esc] Skip'),

  // ComingSoon screen.
  entry('soon.overline', 'THE LAST LANTERN · BẢN CHƠI THỬ', 'THE LAST LANTERN · DEMO'),
  entry('soon.demoTitle', 'BẢN CHƠI THỬ ĐẾN ĐÂY LÀ HẾT', 'THE DEMO ENDS HERE'),
  entry('soon.demoSubtitle', 'MÀN 01–04 · BẢN CHƠI THỬ', 'LEVELS 01–04 · DEMO'),
  entry('soon.demoBody',
    'Cảm ơn bạn đã khám phá 4 màn đầu tiên. Hành trình của Nhinh và Lumo vẫn còn tiếp tục.',
    'Thank you for exploring the first four levels. The journey of Nhinh and Lumo continues.'),
  entry('soon.blockedTitle', 'BẢN LƯU NÀY NGOÀI BẢN CHƠI THỬ', 'THIS SAVE IS OUTSIDE THE DEMO'),
  entry('soon.blockedSubtitle', 'TIẾN TRÌNH HIỆN TẠI KHÔNG THUỘC 4 MÀN ĐẦU', 'YOUR PROGRESS IS NOT FROM THE FIRST FOUR LEVELS'),
  entry('soon.blockedBody',
    'Bản lưu hiện tại nằm ngoài phạm vi bản chơi thử hoặc thuộc phiên bản cũ.',
    'The current save is outside the demo range or belongs to an older build.'),
  entry('soon.blockedNote',
    'Tiến trình của bạn vẫn được giữ nguyên — chưa có thao tác nào xóa hay ghi đè.',
    'Your progress is untouched — nothing has been erased or overwritten.'),
  entry('soon.unavailableTitle', 'MÀN NÀY CHƯA MỞ TRONG BẢN CHƠI NÀY', 'THIS LEVEL IS NOT OPEN IN THIS BUILD'),
  entry('soon.unavailableBody', 'Bản chơi hiện tại không mở màn này.', 'This build does not open this level.'),
  entry('soon.unavailableNote', 'Không có dữ liệu lưu nào bị thay đổi.', 'No save data has been changed.'),
  entry('soon.button', '▸ VỀ MÀN HÌNH CHÍNH', '▸ BACK TO MAIN MENU'),
  entry('soon.hint', '[E / Enter / ESC] Quay về màn hình chính', '[E / Enter / ESC] Back to main menu'),

  // Ending screen and credits.
  entry('ending.header', 'THE LAST DAWN — BÌNH MINH TRỞ LẠI', 'THE LAST DAWN — DAWN RETURNS'),
  entry('ending.body',
    'Ba mảnh trái tim Ký Ức • Hy Vọng • Cân Bằng đã hợp nhất.\nKhi Nhinh tự tay tắt ngọn đèn lồng, bóng tối và ánh sáng\nđã tìm lại nhịp thở hài hòa trên khắp khu rừng Elaria.\n\nCảm ơn bạn đã hoàn thành The Last Lantern — Khu Rừng Ánh Sáng!',
    'The three pieces of the heart — Memory, Hope and Balance — are one.\nWhen Nhinh put out the lantern by hand, darkness and light\nfound their shared breath again across the forest of Elaria.\n\nThank you for finishing The Last Lantern — The Forest of Light!'),
  entry('ending.playAgainConfirm', 'Chơi lại từ đầu sẽ xóa tiến trình hiện tại.', 'Starting over will erase your current progress.'),
  entry('ending.paused', 'Tạm dừng · ESC để tiếp tục', 'Paused · ESC to resume'),
  entry('ending.playAgain', 'PLAY AGAIN (CHƠI LẠI TỪ ĐẦU)', 'PLAY AGAIN'),
  entry('ending.mainMenu', 'MAIN MENU (MÀN HÌNH CHÍNH)', 'MAIN MENU'),
  entry('ending.cancel', 'Hủy', 'Cancel'),
  entry('ending.confirmPlayAgain', 'Chơi lại', 'Play again'),

  // Build tags (src/config/releaseConfig.ts).
  entry('release.playtest', 'PLAYTEST · MÀN 01–10', 'PLAYTEST · LEVELS 01–10'),
  entry('release.playtestBuild', 'PLAYTEST BUILD · MÀN 01–10', 'PLAYTEST BUILD · LEVELS 01–10'),
  entry('release.demo', 'DEMO · MÀN 01–04', 'DEMO · LEVELS 01–04'),
  entry('release.demoBuild', 'DEMO BUILD · MÀN 01–04', 'DEMO BUILD · LEVELS 01–04'),

  // V4 test room: title, objectives, status words, prompts, hints and the journal line.
  entry('v4.room.title', 'Phòng thử', 'Test Room'),
  entry('v4.room.objDoor', 'Mở cửa A và giữ nó mở.', 'Open door A and keep it open.'),
  entry('v4.room.objLumo', 'Nhờ Lumo mở cổng B.', 'Ask Lumo to open gate B.'),
  entry('v4.room.objDone', 'Đi qua cổng B.', 'Go through gate B.'),
  entry('v4.room.statusInHand', 'trong tay', 'in hand'),
  entry('v4.room.statusOnPedestal', 'trên bệ', 'on the pedestal'),
  entry('v4.room.statusLit', 'bật', 'lit'),
  entry('v4.room.statusUnlit', 'tắt', 'unlit'),
  entry('v4.room.doorA', 'Cửa A', 'Door A'),
  entry('v4.room.open', 'mở', 'open'),
  entry('v4.room.closed', 'đóng', 'closed'),
  entry('v4.room.latched', ', đã gài', ', latched'),
  entry('v4.room.lumo', 'Lumo', 'Lumo'),
  entry('v4.room.lumoFollow', 'theo Nhinh', 'following Nhinh'),
  entry('v4.room.lumoFlying', 'đang bay', 'flying'),
  entry('v4.room.lumoHolding', 'giữ ấn', 'holding the seal'),
  entry('v4.room.promptPlace', 'E: đặt đèn', 'E: place lantern'),
  entry('v4.room.promptTake', 'E: lấy đèn', 'E: take lantern'),
  entry('v4.room.promptEngage', 'E: gài chốt A', 'E: engage latch A'),
  entry('v4.room.promptRelease', 'E: mở chốt A', 'E: release latch A'),
  entry('v4.room.promptSend', 'E: gửi Lumo tới ấn', 'E: send Lumo to the seal'),
  entry('v4.room.promptRecall', 'E: gọi Lumo về', 'E: recall Lumo'),
  entry('v4.room.hintDoor1', 'Cửa A có mắt nhận ở phía bệ đèn.', 'Door A has a sensor on the pedestal side.'),
  entry('v4.room.hintDoor2', 'Đèn trên bệ mở cửa; chốt phía bên kia giữ cửa khi đèn đi nơi khác.',
    'A lantern on the pedestal opens the door; the latch on the far side holds it when the lantern moves.'),
  entry('v4.room.hintDoor3', 'Đặt đèn lên bệ, bật đèn, qua cửa và gài chốt A.',
    'Set the lantern on the pedestal, light it, go through the door and engage latch A.'),
  entry('v4.room.hintLumo1', 'Cổng B có một ấn ở trên cao.', 'Gate B has a seal up high.'),
  entry('v4.room.hintLumo2', 'Lumo giữ ấn thì cổng mở; gọi cậu về thì cổng đóng.',
    'While Lumo holds the seal the gate stays open; recall him and the gate closes.'),
  entry('v4.room.hintLumo3', 'Dùng mốc gọi để gửi Lumo tới ấn, rồi đi qua cổng B.',
    'Use the marker to send Lumo to the seal, then go through gate B.'),
  entry('v4.room.carving', 'Nét khắc: cửa A nhận ánh sáng từ bệ, không từ đèn cầm tay.',
    'Carving: door A takes its light from the pedestal, not from a lantern in hand.'),

  // V4 host scene: toasts, journal and pulse messages.
  entry('v4.toast.latchRefused', 'Chốt chỉ gài được khi cửa đang mở.', 'The latch can only engage while the door is open.'),
  entry('v4.toast.exit', 'Đã qua phòng thử.', 'Test room cleared.'),
  entry('v4.toast.journalAdded', 'Đã ghi vào sổ tay.', 'Written in the journal.'),
  entry('v4.toast.journalEmpty', 'Sổ tay chưa có ghi chép.', 'The journal has no entries yet.'),
  entry('v4.toast.pulseNeedsLantern', 'Xung sáng cần đèn trong tay và đang bật.', 'Light Pulse needs the lantern in hand and lit.'),
  entry('v4.toast.noHint', 'Không còn gợi ý cho bước này.', 'No more hints for this step.'),
  entry('v4.toast.lumoArrived', 'Lumo đã tới ấn.', 'Lumo has reached the seal.'),

  // V4 choice box and placeholder screen for a level that is not built yet.
  entry('v4.choice.hint', '[↑↓ / W S] Chọn · [E] Xác nhận · [ESC] Hủy', '[↑↓ / W S] Select · [E] Confirm · [ESC] Cancel'),
  entry('v4.placeholder.building', 'Màn {number} — đang dựng', 'Level {number} — under construction'),
  entry('v4.placeholder.back', '[ESC] Về màn hình chính', '[ESC] Back to main menu'),
];

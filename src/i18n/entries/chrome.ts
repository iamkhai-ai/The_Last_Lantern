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
  entry('menu.languageEn', 'Ngôn ngữ: English', 'Language: English'),

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
];

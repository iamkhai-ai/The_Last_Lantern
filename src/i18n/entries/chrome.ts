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

  // Shared dialogue prompt.
  entry('dialogue.next', '[E / Space] Tiếp →', '[E / Space] Next →'),

  // Prologue panel chrome.
  entry('prologue.hint', 'Nhấn [E / Enter / Space] hoặc click để tiếp tục', 'Press [E / Enter / Space] or click to continue'),
  entry('prologue.skip', '[Esc] Bỏ qua', '[Esc] Skip'),
];

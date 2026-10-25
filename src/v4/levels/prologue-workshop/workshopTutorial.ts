import type { TutorialStep } from '../../core/tutorial';

/**
 * Level 00 teaches the basic controls, in order: walk, run, use E on what is outlined, and where help lives. Each line
 * stays up until the player does it (help also leaves on its own after a while). Catalog: src/i18n/entries/workshop.ts.
 */
export const WORKSHOP_TUTORIAL: readonly TutorialStep[] = [
  {
    id: 'workshop-move',
    text: 'Di chuyển: WASD hoặc các phím mũi tên.',
    doneOn: ['moved'],
  },
  {
    id: 'workshop-run',
    text: 'Giữ Shift trong khi di chuyển để chạy nhanh hơn.',
    doneOn: ['ran'],
    expireMs: 9000,
  },
  {
    id: 'workshop-interact',
    text: 'Lại gần người hoặc đồ vật có viền sáng. Khi nhãn E hiện ra, nhấn E để xem hoặc nói chuyện; trong hội thoại, E hoặc Space để đọc tiếp.',
    doneOn: ['interacted'],
  },
  {
    id: 'workshop-help',
    text: 'Chưa biết làm gì tiếp? Nhấn H để xem gợi ý, J để mở sổ tay, Esc để tạm dừng.',
    doneOn: ['help'],
    expireMs: 10000,
  },
];

/**
 * Opening prologue — approved static copy.
 *
 * This module is deliberately data-only: it imports neither Phaser nor any image
 * file. The scene owns the four explicit runtime PNG imports.
 */
export interface PrologueLine {
  readonly speaker: string;
  readonly text: string;
}

export interface ProloguePanel {
  readonly id: string;
  readonly textureKey: string;
  readonly lines: readonly PrologueLine[];
}

export const PROLOGUE_PANELS: readonly ProloguePanel[] = [
  {
    id: '01-road-home',
    textureKey: 'prologue-01-road-home',
    lines: [{ speaker: 'Nhinh', text: 'Qua khúc đường này là tới làng rồi.' }],
  },
  {
    id: '02-voice-in-trees',
    textureKey: 'prologue-02-voice-in-trees',
    lines: [
      { speaker: 'Tiếng gọi', text: 'Có ai… nghe thấy tôi không?' },
      { speaker: 'Nhinh', text: 'Bạn bị lạc à?' },
      { speaker: 'Nhinh', text: 'Đợi nhé. Tôi tới đây.' },
    ],
  },
  {
    id: '03-path-disappears',
    textureKey: 'prologue-03-path-disappears',
    lines: [
      { speaker: 'Nhinh', text: 'Tiếng gọi vừa ở đây mà…' },
      { speaker: 'Nhinh', text: 'Mình vừa đi từ phía nào nhỉ?' },
    ],
  },
  {
    id: '04-waiting-for-morning',
    textureKey: 'prologue-04-waiting-for-morning',
    lines: [
      { speaker: 'Nhinh', text: 'Nghỉ một lát thôi.' },
      { speaker: 'Nhinh', text: 'Sáng lên rồi mình sẽ tìm được đường về.' },
    ],
  },
];

/**
 * Level 09 dialogue, verbatim from docs/scenario/09-dark-moon-observatory.md, as pure data so the checks can count
 * and compare it. No Phaser import. `speaker` values are the DialogueLine speakers used by the dialogue system.
 */
export interface ObservatoryLine {
  speaker: 'Nhinh' | 'Lumo' | 'The Shadow' | 'Người Bảo Vệ';
  text: string;
}

/** Scenario section 2, beat 1: wheel and arrival, played once in the entrance. */
export const OBSERVATORY_OPENING_ENTRANCE: readonly ObservatoryLine[] = [
  { speaker: 'Lumo', text: 'Tôi biết tiếng bánh xe này.' },
  { speaker: 'Nhinh', text: 'Nó vẫn quay à?' },
  { speaker: 'Lumo', text: 'Không. Tôi nhớ tiếng nó từng quay.' },
];

/** Scenario section 2, beat 2: recognition at the spiral tube, played the first time the corridor is entered. */
export const OBSERVATORY_OPENING_CORRIDOR: readonly ObservatoryLine[] = [
  { speaker: 'Lumo', text: 'Chính đường này. Tôi đã bay từ trạm nước lên đây.' },
  { speaker: 'Nhinh', text: 'Mình có thể đi chậm lại.' },
  { speaker: 'Lumo', text: 'Tôi muốn biết mình đã làm gì. Nhưng cậu ở gần nhé.' },
  { speaker: 'Nhinh', text: 'Tôi ở đây.' },
];

/** Section 4: the far door opened but the roots are still lit (G2 aimed straight at the Sun lock). */
export const OBSERVATORY_BEAT_ROOTS_LIT: readonly ObservatoryLine[] = [
  { speaker: 'Nhinh', text: 'Cửa đã mở. Ánh sáng lại đang phủ lên rễ.' },
  { speaker: 'Lumo', text: 'Có đường qua khung tượng. Ở điện thờ mình từng giữ được một vùng tối như thế.' },
];

/** Section 4: G0 was turned away while Lumo still holds the seal. */
export const OBSERVATORY_BEAT_NO_BEAM: readonly ObservatoryLine[] = [
  { speaker: 'Lumo', text: 'Tôi vẫn giữ ấn. Đường sáng từ tiền sảnh đang hướng đi chỗ khác.' },
];

/** Section 5, first part: the recording and the memory exchange. */
export const OBSERVATORY_MEMORY_RECORDING: readonly ObservatoryLine[] = [
  { speaker: 'Người Bảo Vệ', text: 'Bão đã tan. Họ bảo tôi để bánh xe ngày đêm chạy lại.' },
  { speaker: 'Người Bảo Vệ', text: 'Nhưng nếu đèn tắt đúng lúc con tìm được đường thì sao?' },
  { speaker: 'Người Bảo Vệ', text: 'Lumo, bay qua đường ống. Giữ mạch phía Bắc cho tôi. Chỉ thêm một đêm nữa.' },
  { speaker: 'Lumo', text: 'Tôi giữ được. Ông cứ chờ ở cửa sổ.' },
];

export const OBSERVATORY_MEMORY_CAPTION = 'Bánh xe bị chặn. Những tia sáng dồn về Cây Mẹ; dòng nước cạn dần. Một vết nứt chạy qua ba mạch rễ. Ánh trắng bùng lên, xóa phần cuối bản ghi.';
export const OBSERVATORY_MEMORY_MERGE_CAPTION = 'The Shadow bước vào vị trí Người Bảo Vệ vừa đứng. Hai hình chồng lên nhau rồi ký ức tan đi.';

/** Section 5, second part: Lumo remembers. */
export const OBSERVATORY_MEMORY_LUMO: readonly ObservatoryLine[] = [
  { speaker: 'Lumo', text: 'Tôi đã giữ ấn.' },
  { speaker: 'Lumo', text: 'Tôi tưởng mình đang giúp ông ấy đưa mọi người về.' },
  { speaker: 'Nhinh', text: 'Cậu nhớ lại rồi.' },
  { speaker: 'Lumo', text: 'Khi Cây Mẹ vỡ, mọi thứ trong đầu tôi cũng vỡ theo. Nhưng tôi vẫn nhớ rằng phải giữ đèn sáng.' },
];

/** Section 5, third part: the Shadow answers. The scene then holds a silence and adds nothing about the girl. */
export const OBSERVATORY_MEMORY_SHADOW: readonly ObservatoryLine[] = [
  { speaker: 'Nhinh', text: 'Ông là Người Bảo Vệ.' },
  { speaker: 'The Shadow', text: 'Ta là phần ký ức còn mắc lại trong đêm ấy. Ta đã đợi lâu đến mức quên cả việc cho khu rừng nghỉ.' },
  { speaker: 'Lumo', text: 'Và tôi đã giúp ông. Nếu tôi làm sai lần nữa thì sao?' },
  { speaker: 'Nhinh', text: 'Ở khu vườn, cậu đã giúp tôi tắt đèn. Ở điện thờ, cậu đã giữ bóng cho những mầm cây.' },
  { speaker: 'Nhinh', text: 'Lần này mình biết nhiều hơn. Mình cũng có thể dừng lại khi thấy điều gì không đúng.' },
  { speaker: 'The Shadow', text: 'Ta muốn dẫn một người về nhà. Rồi giữ cả khu rừng ở lại cùng nỗi chờ của mình.' },
  { speaker: 'Nhinh', text: 'Con gái ông đã trở về chưa?' },
  { speaker: 'The Shadow', text: 'Phần ký ức này không có câu trả lời đó.' },
];

/** Section 6. */
export const OBSERVATORY_CRYSTAL_LINES: readonly ObservatoryLine[] = [
  { speaker: 'The Shadow', text: 'Hãy đưa vòng ngày đêm đi tiếp. Khi tới lúc buông tay, đừng để nỗi sợ giữ tay con lại.' },
  { speaker: 'Lumo', text: 'Ông có đi cùng chúng tôi không?' },
  { speaker: 'The Shadow', text: 'Ta sẽ ở lại tới khi đêm này kết thúc.' },
];

/** Section 7. */
export const OBSERVATORY_EXIT_LINES: readonly ObservatoryLine[] = [
  { speaker: 'Lumo', text: 'Tôi vẫn sợ.' },
  { speaker: 'Nhinh', text: 'Cậu cứ nói khi sợ. Mình sẽ cùng nhìn lại đường đi.' },
  { speaker: 'Lumo', text: 'Vậy… mình về Cây Mẹ thôi.' },
];

export const OBSERVATORY_MEMORY_SPOKEN_LINES = [
  ...OBSERVATORY_MEMORY_RECORDING, ...OBSERVATORY_MEMORY_LUMO, ...OBSERVATORY_MEMORY_SHADOW,
] as const;

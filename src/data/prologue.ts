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
    lines: [
      { speaker: 'Lời dẫn', text: 'Chiều xuống trên con đường ven rừng. Dưới thung lũng, những ô cửa trong làng đã bắt đầu sáng đèn.' },
      { speaker: 'Nhinh', text: 'Mọi người thắp đèn cả rồi. Hôm nay mình về muộn quá.' },
      { speaker: 'Lời dẫn', text: 'Cậu kéo lại chiếc khăn, rảo bước về phía những mái nhà quen thuộc. Chỉ cần đi hết đoạn đường này, cậu sẽ về tới nhà.' },
      { speaker: 'Nhinh', text: 'May mà vẫn còn nhìn rõ đường.' },
    ],
  },
  {
    id: '02-voice-in-trees',
    textureKey: 'prologue-02-voice-in-trees',
    lines: [
      { speaker: 'Lời dẫn', text: 'Giữa tiếng lá xào xạc, một giọng nói rất khẽ vang lên. Nhinh dừng chân, lắng nghe.' },
      { speaker: 'Tiếng gọi', text: 'Có ai… nghe thấy tôi không?' },
      { speaker: 'Nhinh', text: 'Ai đấy? Bạn đang ở đâu?' },
      { speaker: 'Lời dẫn', text: 'Một đốm sáng vàng hiện lên giữa những thân cây, rồi khuất sau tán lá. Không có tiếng trả lời.' },
      { speaker: 'Nhinh', text: 'Bạn bị lạc à?' },
      { speaker: 'Lời dẫn', text: 'Nhinh ngoái nhìn về phía làng. Trời sắp tối. Cậu biết mình nên về — nhưng người kia có thể vẫn đang chờ một tiếng đáp.' },
      { speaker: 'Nhinh', text: 'Tôi nghe thấy rồi. Bạn cứ ở yên đó nhé.' },
      { speaker: 'Nhinh', text: 'Tôi sẽ tìm bạn, rồi mình cùng ra ngoài.' },
    ],
  },
  {
    id: '03-path-disappears',
    textureKey: 'prologue-03-path-disappears',
    lines: [
      { speaker: 'Lời dẫn', text: 'Sương dày lên quanh những gốc cây. Nhinh đi thêm một quãng, nhưng không còn thấy đốm sáng. Tiếng gọi cũng im bặt.' },
      { speaker: 'Nhinh', text: 'Tôi tới rồi đây. Bạn còn ở đó không?' },
      { speaker: 'Lời dẫn', text: 'Cậu đứng đợi. Chỉ có tiếng nước nhỏ từ những chiếc lá.' },
      { speaker: 'Nhinh', text: 'Vừa nãy rõ ràng là phía này mà…' },
      { speaker: 'Lời dẫn', text: 'Nhinh quay lại tìm lối cũ. Những ô cửa sáng đèn đã khuất. Giữa lớp sương, thân cây nào trông cũng giống thân cây cậu vừa đi qua.' },
      { speaker: 'Nhinh', text: 'Mình rẽ ở gốc cây kia… hay là chỗ này?' },
      { speaker: 'Nhinh', text: 'Bình tĩnh. Cứ quay lại từng đoạn một thôi.' },
      { speaker: 'Lời dẫn', text: 'Nhưng sau một hồi tìm kiếm, cậu vẫn không nhận ra chỗ rẽ ban đầu.' },
    ],
  },
  {
    id: '04-waiting-for-morning',
    textureKey: 'prologue-04-waiting-for-morning',
    lines: [
      { speaker: 'Lời dẫn', text: 'Khi đôi chân đã mỏi, Nhinh dừng dưới một gốc cây lớn. Bên cạnh đám rễ có một bia đá phủ rêu và chiếc đèn cũ không cháy.' },
      { speaker: 'Nhinh', text: 'Đi tiếp thế này chỉ lạc xa hơn thôi.' },
      { speaker: 'Lời dẫn', text: 'Cậu ngồi xuống, kéo chiếc khăn sát cổ. Trong rừng không còn tiếng bước chân nào ngoài tiếng của chính mình.' },
      { speaker: 'Nhinh', text: 'Người gọi lúc nãy… không biết đã tìm được đường ra chưa.' },
      { speaker: 'Lời dẫn', text: 'Nhinh lắng nghe thêm một lần nữa, rồi tựa lưng vào gốc cây.' },
      { speaker: 'Nhinh', text: 'Mình nghỉ một lát thôi. Đợi sương tan đã.' },
      { speaker: 'Nhinh', text: 'Sáng lên rồi mình sẽ tìm được đường về.' },
      { speaker: 'Lời dẫn', text: 'Cậu nhắm mắt. Trong đầu Nhinh, những ô cửa ở làng vẫn còn sáng.' },
    ],
  },
];

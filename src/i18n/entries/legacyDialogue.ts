/**
 * Legacy four-zone dialogue. Source: `src/data/dialogue.ts` (the older WorldScene story path).
 *
 * Keys are the authored Vietnamese lines copied byte for byte; ids mirror the source block name and
 * the line position inside it. Every line is static, so none carries a `{placeholder}`.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const LEGACY_DIALOGUE_ENTRIES: readonly CatalogEntry[] = [
  // intro_awaken
  entry('legacy.introAwaken.1', '“Có những nơi mà mặt trời đã quên đường trở về.”', '“There are places the sun has forgotten the way back to.”'),
  entry('legacy.introAwaken.2', 'Mình... đang ở rìa rừng Elaria sao? Chiếc đèn lồng cổ vẫn nằm ngay cạnh đây.', 'Am I... at the edge of the Elaria forest? The old lantern is still right here beside me.'),
  // intro_meet_lumo
  entry('legacy.introMeetLumo.1', 'Này! Cậu có nghe thấy tôi không?', 'Hey! Can you hear me?'),
  entry('legacy.introMeetLumo.2', 'Ai đó?', 'Who is there?'),
  entry('legacy.introMeetLumo.3', 'Ở đây! Phía trên đầu cậu!', 'Here! Right above your head!'),
  entry('legacy.introMeetLumo.4', 'Một... con đom đóm biết nói?', 'A... talking firefly?'),
  entry('legacy.introMeetLumo.5', 'Đừng quan tâm chuyện đó! Cậu có thể thắp chiếc đèn này lên được không? (Nhấn F để thắp đèn)', 'Never mind that! Can you light this lantern? (Press F to light the lantern)'),
  // intro_after_lamp
  entry('legacy.introAfterLamp.1', 'Ấm quá! Ánh sáng của chiếc đèn này có thể đánh thức những dấu vết cổ xưa.', "So warm! This lantern's light can wake the ancient traces."),
  entry('legacy.introAfterLamp.2', 'Hãy thử nhấn phím SPACE để phát xung ánh sáng (Light Pulse) tìm lối dẫn về Cây Mẹ phía bắc nhé!', 'Try pressing SPACE to cast a Light Pulse and find the way back to the Mother Tree in the north!'),
  // hub_first_inspect
  entry('legacy.hubFirstInspect.1', 'Cậu thấy ba hốc trống kia chứ? Ba mảnh trái tim của Cây Mẹ đã biến mất từ đêm bão năm xưa...', "See those three empty hollows? Three pieces of the Mother Tree's heart have been missing since the old storm..."),
  entry('legacy.hubFirstInspect.2', 'Cây cổ thụ đang khô héo dần. Chúng ta phải tìm lại các tinh thể ở đâu?', 'The ancient tree is withering. Where do we find the crystals?'),
  entry('legacy.hubFirstInspect.3', 'Hãy bắt đầu từ lối mòn phía Bắc dẫn vào Rừng Đom Đóm (Whispering Woods). Tinh thể Ký Ức đang đợi ở đó!', 'Start on the trail north into the Whispering Woods. The Memory Crystal is waiting there!'),
  // hub_after_woods_tree
  entry('legacy.hubAfterWoodsTree.1', 'Nhìn kìa! Tinh thể Ký Ức vừa đặt vào đã làm một chùm lá non đâm chồi trên cành Cây Mẹ!', "Look! The Memory Crystal is barely in place and the Mother Tree's branches are already sprouting new leaves!"),
  entry('legacy.hubAfterWoodsTree.2', 'Lối đi phía Đông dẫn ra Suối Trăng (Moonlit Creek) cũng vừa tan bớt sương mù rồi.', 'The fog on the east path out to Moonlit Creek has thinned as well.'),
  // hub_after_creek_tree
  entry('legacy.hubAfterCreekTree.1', 'Tinh thể Hy Vọng đã khơi lại dòng nước mát quanh rễ cây và những đốm sao lấp lánh!', 'The Hope Crystal has brought back the cool water around the roots and the glittering stars!'),
  entry('legacy.hubAfterCreekTree.2', 'Chỉ còn mảnh ghép cuối cùng ở Tàn Tích Lặng Im (Silent Ruins) về phía Nam.', 'Only the last piece is left, in the Silent Ruins to the south.'),
  // hub_ready_finale_hint
  entry('legacy.hubReadyFinaleHint.1', 'Chúng ta đã tìm đủ cả ba mảnh: Ký Ức, Hy Vọng và Cân Bằng. Hãy đến gần Cây Mẹ và nhấn E để khôi phục trái tim của rừng!', 'We have found all three pieces now: Memory, Hope and Balance. Go to the Mother Tree and press E to restore the heart of the forest!'),
  // woods_entry
  entry('legacy.woodsEntry.1', 'Đom đóm vẫn nhớ con đường. Nhưng chúng không thể mở cổng được nữa.', 'The fireflies still remember the path. But they can no longer open the gate.'),
  entry('legacy.woodsEntry.2', 'Có những ký tự trên bia đá... hay là chúng ta thử ánh sáng? (Nhấn SPACE để phát Light Pulse làm lộ cổ tự)', 'There are symbols on the stone tablet... should we try light? (Press SPACE to cast a Light Pulse and reveal the runes)'),
  // woods_gate_inscription
  entry('legacy.woodsGateInscription.1', 'Dòng chữ khắc bên cổng đá cổ: “Trăng soi lá, lá dẫn sao.” (Thứ tự kích hoạt: Trăng -> Lá -> Sao)', 'Carved on the ancient stone gate: “The moon lights the leaves, the leaves lead to the stars.” (Activation order: Moon -> Leaf -> Star)'),
  // woods_crystal_memory
  entry('legacy.woodsCrystalMemory.1', '[Tinh thể Ký Ức tỏa sáng vàng ấm — hình ảnh khu rừng Elaria thuở xưa hiện về với ngày và đêm luân phiên hài hòa...]', '[The Memory Crystal glows warm gold — an image of the old Elaria forest returns, with day and night turning in harmony...]'),
  entry('legacy.woodsCrystalMemory.2', 'Đó là Elaria... trước khi mọi thứ thay đổi.', "That's Elaria... before everything changed."),
  entry('legacy.woodsCrystalMemory.3', 'Mình có cảm giác đã từng nhìn thấy nơi này. Hãy mang Tinh thể Ký Ức trở về Cây Mẹ ở phía Nam.', 'I feel I have seen this place before. We should take the Memory Crystal back to the Mother Tree in the south.'),
  // creek_entry
  entry('legacy.creekEntry.1', 'Người xưa đã dùng ánh sáng để tạo ra những con đường.', 'Long ago, people used light to make paths.'),
  entry('legacy.creekEntry.2', 'Nếu đưa ánh sáng đến bờ bên kia thì sao? Có một bệ đặt đèn và hai chiếc gương xoay ở đây.', 'What if we send the light to the far bank? There is a lamp stand here, and two rotating mirrors.'),
  // creek_mural
  entry('legacy.creekMural.1', '[Bức phù điêu cổ khắc họa một người bảo vệ cầm đèn lồng cố giữ ánh sáng vĩnh cửu trong cơn bão, khiến trái tim Cây Mẹ quá tải và vỡ làm ba mảnh...]', "[An ancient relief shows a guardian holding a lantern, trying to keep an eternal light through the storm, causing the Mother Tree's heart to overload and break into three pieces...]"),
  entry('legacy.creekMural.2', 'Chiếc đèn này... đã từng thuộc về người đó sao?', 'Did this lantern... once belong to that person?'),
  entry('legacy.creekMural.3', 'Ta không nhớ rõ. Ký ức của ta cũng đang phai dần.', "I don't remember clearly. My memory is fading as well."),
  // creek_crystal_hope
  entry('legacy.creekCrystalHope.1', 'Bạn đã thu nhận Tinh thể Hy Vọng (Xanh lam). Ánh sáng dịu nhẹ phản chiếu trên mặt suối.', 'You received the Hope Crystal (Blue). Its soft light reflects on the surface of the creek.'),
  entry('legacy.creekCrystalHope.2', 'Người bảo vệ xưa chỉ vì sợ bóng tối mà làm vỡ trái tim khu rừng... Hãy mang mảnh tinh thể này về Cây Mẹ thôi!', "The old guardian broke the forest's heart just from fear of the dark... Let's take this crystal shard back to the Mother Tree!"),
  // ruins_entry
  entry('legacy.ruinsEntry.1', 'Ta không thích nơi đây...', "I don't like this place..."),
  entry('legacy.ruinsEntry.2', 'Vì quá tối sao?', 'Because it is too dark?'),
  entry('legacy.ruinsEntry.3', 'Không... vì ta cảm giác bóng tối đang nhìn chúng ta.', 'No... because I feel the darkness is watching us.'),
  // ruins_inscription
  entry('legacy.ruinsInscription.1', 'Bia cổ trước cổng: “Ngày rực sáng, đêm tĩnh lặng, rồi bình minh lại lên.” (Chuỗi khóa: Mặt Trời [Đèn BẬT] -> Mặt Trăng [Đèn TẮT] -> Mặt Trời [Đèn BẬT])', 'Ancient tablet before the gate: “Day blazing bright, night still and silent, then dawn rises again.” (Lock sequence: Sun [Lantern ON] -> Moon [Lantern OFF] -> Sun [Lantern ON])'),
  // ruins_shadow_encounter
  entry('legacy.ruinsShadowEncounter.1', 'Tại sao ngươi mang ánh sáng đến đây?', 'Why have you brought light here?'),
  entry('legacy.ruinsShadowEncounter.2', 'Để cứu khu rừng.', 'To save the forest.'),
  entry('legacy.ruinsShadowEncounter.3', 'Vậy ngươi nghĩ bóng tối là điều xấu sao?', 'So you think the darkness is a bad thing?'),
  entry('legacy.ruinsShadowEncounter.4', 'Nếu không có đêm, những hạt giống sẽ nghỉ ngơi lúc nào?', 'If there were no night, when would the seeds rest?'),
  entry('legacy.ruinsShadowEncounter.5', 'Nếu không có bóng tối, làm sao người ta nhìn thấy những vì sao?', 'If there were no darkness, how would anyone see the stars?'),
  entry('legacy.ruinsShadowEncounter.6', 'Ánh sáng dẫn đường. Bóng tối cho sự sống thời gian nghỉ ngơi.', 'Light shows the way. Darkness gives life time to rest.'),
  entry('legacy.ruinsShadowEncounter.7', 'Hình bóng ấy tan biến rồi... Ra là vậy, nhiệm vụ của chúng ta không phải là xóa bỏ bóng tối, mà là khôi phục lại bình minh!', "That figure has faded away... So that's it — our task is not to erase the darkness but to restore the dawn!"),
  // ruins_crystal_balance
  entry('legacy.ruinsCrystalBalance.1', 'Bạn đã thu nhận Tinh thể Cân Bằng (Tím). Hãy quay về Cây Mẹ ở phía Bắc để hoàn tất hành trình.', 'You received the Balance Crystal (Purple). Return to the Mother Tree in the north to complete the journey.'),
  // finale_overload_start
  entry('legacy.finaleOverloadStart.1', 'Ba tinh thể đang hợp nhất... Nhưng khoan đã! Quá nhiều ánh sáng! Nó đang lặp lại chuyện cũ!', "The three crystals are merging... But wait — too much light! It's repeating what happened before!"),
  entry('legacy.finaleOverloadStart.2', 'Ánh sáng từ chiếc đèn lồng đang làm trái tim Cây Mẹ quá tải... Mình phải tự tay tắt đèn (Nhấn F) để trả lại sự cân bằng!', "The lantern's light is overloading the heart of the Mother Tree... I have to put it out myself (Press F) to restore the balance!"),
  // finale_dawn_dialogue
  entry('legacy.finaleDawnDialogue.1', 'Cậu làm được rồi.', 'You did it.'),
  entry('legacy.finaleDawnDialogue.2', 'Không. Chúng ta làm được.', 'No. We did it.'),
  entry('legacy.finaleDawnDialogue.3', 'Cậu sẽ ở lại chứ?', "You'll stay, won't you?"),
  entry('legacy.finaleDawnDialogue.4', 'Có lẽ mình còn những con đường khác phải đi.', 'Perhaps I still have other roads to walk.'),
  entry('legacy.finaleDawnDialogue.5', 'Vậy nhớ giữ chiếc đèn đó nhé. Không phải nơi nào cũng có ánh mặt trời.', 'Then remember to keep that lantern with you. Not every place has sunlight.'),
];

/**
 * Sleepless Tower (level 06, `src/levels/SleeplessTowerLevel.ts`), Sleeping Garden (level 07,
 * `src/levels/SleepingGardenLevel.ts`) and Shattered Creek (level 04,
 * `src/scenes/ShatteredCreekController.ts`) player-visible copy.
 *
 * Covers opening and story dialogue, every `say([...])` array, the looped hint ladders, objectives,
 * interaction prompts, the tower captions, journal lines, completion refusals and the mechanism
 * labels drawn in the scene. Keys are the authored Vietnamese sentences, copied byte for byte;
 * template literals with `${…}` interpolations are runtime-composed and are skipped.
 *
 * `E · Thu hồi đèn` is one row because the tower and creek stands share the exact same sentence.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const TOWER_GARDEN_CREEK_ENTRIES: readonly CatalogEntry[] = [
  // ── Sleepless Tower (l6) ───────────────────────────────────────────────────
  // Opening.
  entry('l6.intro.1', 'Nước đang biến thành ánh sáng ở đây.', 'The water is turning into light here.'),
  entry('l6.intro.2',
    'Ngọn tháp dẫn đường cho người đi rừng. Nó từng chỉ sáng khi trời tối.',
    'The tower guides travellers through the forest. It used to light only when the sky was dark.'),
  entry('l6.intro.3',
    'Giờ nó lấy cả phần nước của Cây Mẹ.',
    "Now it is taking the Mother Tree's share of water too."),
  entry('l6.intro.4',
    'Nếu dừng nó… người lạc đường sẽ tìm về bằng gì?',
    'If we stop it… what will lost travellers follow home?'),
  entry('l6.intro.5',
    'Mình xem cách máy hoạt động trước. Có thể nó vẫn còn một chế độ khác.',
    'Let us see how the machine works first. It may still have another mode.'),

  // The test bench.
  entry('l6.bench.1', 'Một tia có thể chia làm hai.', 'One beam can be split in two.'),
  entry('l6.bench.2',
    'Nhưng nếu xoay gương đầu vào đi chỗ khác, cả hai nhánh đều mất.',
    'But if you turn the input mirror elsewhere, both branches are lost.'),
  entry('l6.bench.3',
    'Vậy phải nhìn cả hệ thống, không chỉ chiếc gương đang xoay.',
    'So we have to watch the whole system, not just the mirror being turned.'),

  // Reading the three circuits.
  entry('l6.oneCircuit.1', 'Một vòng máy đã chạy. Hai vòng còn lại vẫn đứng.', 'One circuit is running. The other two are still standing.'),
  entry('l6.oneCircuit.2',
    'Và vòng trước dừng khi mình đổi tia. Chúng cần hoạt động cùng nhau.',
    'And the first one stopped when I changed the beam. They need to run together.'),
  entry('l6.callC.1', 'Cậu giữ ấn cuối nhé. Tôi chỉnh hai nhánh này.', 'You hold the last plate. I will adjust these two branches.'),
  entry('l6.callC.2', 'Tôi ở đây. Cậu cứ thử từng gương.', "I'm here. Just try the mirrors one at a time."),
  entry('l6.callC.3', 'Ở đây không có chốt nào giữ thay tôi, đúng không?', 'There is no latch here to hold for me instead, is there?'),
  entry('l6.callC.4', 'Ừ. Cậu giữ tới khi máy chuyển chế độ.', 'Yes. You hold on until the machine changes mode.'),
  entry('l6.leftSeal.1', 'Tôi rời ấn rồi. Vòng thứ ba vừa dừng.', 'I have left the plate. The third circuit just stopped.'),
  entry('l6.threeCircuits.1', 'Cả ba vòng đều đang quay!', 'All three circuits are turning!'),
  entry('l6.threeCircuits.2', 'Tôi sẽ chuyển cần. Cậu giữ nguyên một chút.', 'I will move the lever. Hold still a moment.'),

  // Captions drawn over the scene.
  entry('l6.caption.switch',
    'Bánh răng khóa ở chế độ Trả dòng. Đèn tháp dịu xuống, nước chảy xuống rừng. Cửa buồng mở.',
    'The gear locks into Return Flow. The tower lamp dims, water runs down to the forest. The chamber door opens.'),
  entry('l6.caption.recordOpen',
    'Ngăn bản ghi mở. Tiếng mưa, rồi giọng một người đàn ông.',
    "The record compartment opens. Rain, then a man's voice."),
  entry('l6.caption.recordFade',
    'Tiếng máy trong bản ghi tăng lên, rồi tắt. Nhinh nhìn chiếc khăn trên bậu cửa.',
    'The machine noise on the recording rises, then stops. Nhinh looks at the scarf on the sill.'),

  // After the lever.
  entry('l6.switched.1',
    'Xong rồi. Máy tự giữ chế độ mới. Cậu về được rồi, Lumo.',
    'Done. The machine keeps the new mode by itself. You can go back now, Lumo.'),
  entry('l6.switched.2', 'Tôi nghe tiếng suối!', 'I can hear the creek!'),

  // The voice on the record.
  entry('l6.recordVoice.1',
    'Đội tìm kiếm đã trở về. Con bé vẫn chưa có mặt.',
    'The search party has returned. The girl is still missing.'),
  entry('l6.recordVoice.2',
    'Tôi sẽ giữ ngọn tháp sáng thêm một đêm. Nếu con nhìn thấy, cứ đi về phía ánh đèn. Cha ở đây.',
    'I shall keep the tower lit one more night. If you see it, walk toward the light. Father is here.'),

  // Talking it over.
  entry('l6.record.1', 'Ông ấy đang đợi con gái.', 'He is waiting for his daughter.'),
  entry('l6.record.2', 'Tôi nhớ chiếc khăn này. Nó từng đỏ.', 'I remember this scarf. It used to be red.'),
  entry('l6.record.3', 'Cậu có nhớ cô bé trở về không?', 'Do you remember the girl coming back?'),
  entry('l6.record.4', 'Không. Tôi chỉ nhớ ánh đèn không được tắt.', 'No. I only remember that the light must not go out.'),
  entry('l6.record.5',
    'Mình đã trả nước cho rừng. Nhưng vẫn cần biết chuyện gì xảy ra ở Cây Mẹ.',
    'We gave the water back to the forest. But we still need to know what happened at the Mother Tree.'),
  entry('l6.recordRepeat.1', 'Ông đã đứng ở đây qua bao nhiêu đêm?', 'How many nights did he stand here?'),

  // Leaving for the garden.
  entry('l6.ending.1',
    'Nước đã trở lại. Sao những cây nhỏ vẫn cúi đầu?',
    'The water is back. Why are the small trees still bowing their heads?'),
  entry('l6.ending.2', 'Mình xuống gần xem.', 'Let us go down and look closer.'),

  // Hint ladder — the placing and main puzzle share one ladder.
  entry('l6.hint.puzzle.1',
    'Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử cho thấy cách tách tia.',
    'Three rings on the machine lead to two stone eyes and the plate meant for me. The test bench shows how the beam splits.'),
  entry('l6.hint.puzzle.2',
    'Gương chung phải cấp cho lăng kính để hai nhánh cùng sáng. Tôi giữ điều kiện thứ ba.',
    'The shared mirror has to feed the prism so both branches light together. I hold the third condition.'),
  entry('l6.hint.puzzle.3',
    'Hướng G0 vào lăng kính, G1 vào A, G2 vào B. Gọi tôi tới C rồi dùng cần Trả dòng khi cả ba sáng.',
    'Aim G0 into the prism, G1 at A, G2 at B. Call me to plate C, then pull the Return Flow lever when all three are lit.'),

  // Hint ladder — the optional bench.
  entry('l6.hint.practice.1',
    'Ba vòng trên máy nối tới hai mắt đá và ấn dành cho tôi. Bàn thử ở góc trên bên trái cho thấy cách tách tia.',
    'Three rings on the machine lead to two stone eyes and the plate meant for me. The test bench in the top-left corner shows how the beam splits.'),
  entry('l6.hint.practice.2',
    'Bàn thử chỉ để học, không bắt buộc. Muốn thử: đặt đèn vào bệ bàn thử rồi xoay gương đầu vào cho tia đi qua lăng kính.',
    'The test bench is only for practice, not required. To try it: set the lantern on the bench stand, then turn the input mirror so the beam passes through the prism.'),
  entry('l6.hint.practice.3',
    'Muốn vào thẳng máy chính: đặt đèn lên bệ giữa phòng và bật bằng F.',
    'To go straight to the main machine: set the lantern on the stand in the middle of the room and light it with F.'),

  // Hint ladder — the steps after the switch.
  entry('l6.hint.retrieve.1',
    'Máy đã tự giữ chế độ mới. Thu hồi đèn khỏi bệ bằng E.',
    'The machine keeps the new mode by itself. Take the lantern back from the stand with E.'),
  entry('l6.hint.crystal.1',
    'Buồng đã mở. Nhấn E trước buồng để nhận Tinh thể Hy Vọng.',
    'The chamber is open. Press E in front of it to take the Hope Crystal.'),
  entry('l6.hint.record.1',
    'Ngăn bản ghi dưới cửa sổ đã mở. Đứng phía trước ngăn, nhấn E để nghe.',
    'The record compartment under the window is open. Stand in front of it and press E to listen.'),
  entry('l6.hint.recall.1', 'Nhấn E ở mốc gọi để gọi Lumo trở về.', 'Press E at the call mark to call Lumo back.'),
  entry('l6.hint.exit.1', 'Hai đứa xuống theo bậc thang góc dưới bên trái.', 'We both go down by the stairs in the bottom-left corner.'),
  entry('l6.hint.recallFollowing.1',
    'Lumo đang bay về. Đứng gần cậu ấy rồi xuống bậc thang góc dưới bên trái.',
    'Lumo is flying back. Stand close, then go down the stairs in the bottom-left corner.'),

  // Objective banner.
  entry('l6.objective.practice', 'Thử lăng kính (tuỳ chọn) · Đặt đèn.', 'Try the prism (optional) · Set the lantern.'),
  entry('l6.objective.place', 'Đặt đèn lên bệ chính; bật bằng F.', 'Set the lantern on the main stand; light it with F.'),
  entry('l6.objective.main', 'Hướng G0, G1, G2 để sáng A + B.', 'Aim G0, G1, G2 to light A + B.'),
  entry('l6.objective.call', 'A + B sáng. Gọi Lumo tới C.', 'A + B lit. Call Lumo to C.'),
  entry('l6.objective.switch', 'Ba mạch sáng. Gạt cần Trả dòng.', 'Three circuits lit. Pull the Return Flow lever.'),
  entry('l6.objective.retrieve', 'Thu hồi đèn khỏi bệ bằng E.', 'Take the lantern back from the stand with E.'),
  entry('l6.objective.crystal', 'Nhận Tinh thể Hy Vọng trong buồng.', 'Take the Hope Crystal in the chamber.'),
  entry('l6.objective.record', 'Nghe bản ghi dưới cửa sổ.', 'Listen to the record under the window.'),
  entry('l6.objective.recall', 'Gọi Lumo về ở mốc gọi.', 'Call Lumo back at the call mark.'),
  entry('l6.objective.exit', 'Xuống vườn qua bậc thang.', 'Go down to the garden by the stairs.'),
  entry('l6.objective.lanternOff', 'Đèn tắt · Nhấn F để bật.', 'Lantern off · Press F to light it.'),
  entry('l6.objective.recallWaiting',
    'Lumo đang về. Đợi cậu ấy rồi xuống vườn.',
    'Lumo is coming back. Wait for Lumo, then go down to the garden.'),

  // Refusals at the stairs.
  entry('l6.exitRefusal.power',
    'Máy vẫn đang hút nước lên. Mình cần chuyển cần Trả dòng trước.',
    'The machine is still drawing water up. I need to switch the Return Flow lever first.'),
  entry('l6.exitRefusal.lamp',
    'Đèn còn nằm trên bệ. Mình cần thu hồi đèn đã.',
    'The lantern is still on the stand. I need to take it back first.'),
  entry('l6.exitRefusal.crystal',
    'Buồng đã mở rồi. Mình cần nhận Tinh thể Hy Vọng.',
    'The chamber is open. I need to take the Hope Crystal.'),
  entry('l6.exitRefusal.record', 'Còn bản ghi dưới cửa sổ chưa nghe.', 'There is still a record under the window I have not heard.'),
  entry('l6.exitRefusal.companion',
    'Gọi Lumo về ở mốc gọi, rồi đứng gần cậu ấy mới xuống được.',
    'Call Lumo back at the call mark, then stand close before we can go down.'),

  // Journal.
  entry('l6.journal.1',
    'Bảng điều tiết ghi: ba mạch cùng ổn định, sau đó mới chuyển từ giữ sáng sang trả dòng.',
    'The control panel says: steady all three circuits first, then change from holding light to returning flow.'),
  entry('l6.journal.2',
    'Lăng kính chia một tia thành hai; xoay gương đầu vào đi chỗ khác thì cả hai nhánh tắt.',
    'The prism splits one beam into two; turn the input mirror elsewhere and both branches go dark.'),
  entry('l6.journal.3',
    'Ba vòng cùng sáng khi G0 vào lăng kính, G1 vào A, G2 vào B, và tôi giữ ấn C.',
    'All three rings light when G0 enters the prism, G1 points at A, G2 at B, and I hold plate C.'),
  entry('l6.journal.4',
    'Bản ghi: người cha giữ đèn sáng thêm một đêm, đợi con theo ánh sáng về.',
    'The record: a father kept the lamp lit one more night, waiting for his child to follow the light home.'),
  entry('l6.journal.tally',
    'Những dấu nhỏ (2/5): vạch đếm trên khung cửa sổ, mỗi vạch có thể là một đêm.',
    'Small marks (2/5): tally marks on the window frame; each one may be a night.'),

  // Optional side path: the tally marks by the window (scenario 06 §5).
  entry('l6.tally.1', 'Những vạch đếm… nhiều quá.', 'So many tally marks…'),
  entry('l6.tally.2', 'Mỗi vạch là một đêm?', 'Is each mark one night?'),

  // Answers at the lever and the chamber.
  entry('l6.lever.alreadyReturned',
    'Máy đang tự giữ chế độ Trả dòng. Không cần chuyển lại.',
    'The machine holds Return Flow by itself. No need to switch again.'),
  entry('l6.chamber.locked',
    'Buồng tinh thể chỉ mở khi máy chuyển sang chế độ Trả dòng.',
    'The crystal chamber only opens when the machine shifts to Return Flow.'),
  entry('l6.chamber.empty', 'Ngăn chứa đã trống.', 'The compartment is empty.'),

  // Interaction prompts.
  entry('l6.prompt.inputMirror', 'E · Xoay gương đầu vào', 'E · Turn the input mirror'),
  entry('l6.prompt.g0', 'E · Xoay gương chung G0', 'E · Turn the shared mirror G0'),
  entry('l6.prompt.g1', 'E · Xoay gương nhánh G1', 'E · Turn branch mirror G1'),
  entry('l6.prompt.g2', 'E · Xoay gương nhánh G2', 'E · Turn branch mirror G2'),
  entry('l6.prompt.callPlate', 'E · Gọi Lumo tới ấn C', 'E · Call Lumo onto plate C'),
  entry('l6.prompt.lumoReunited', 'Lumo đang ở bên Nhinh', 'Lumo is beside Nhinh'),
  entry('l6.prompt.lumoReturning', 'Lumo đang bay về', 'Lumo is flying back'),
  entry('l6.prompt.leverHeld', 'E · Cần đang giữ chế độ Trả dòng', 'E · Lever held in Return Flow'),
  entry('l6.prompt.leverPull', 'E · Gạt cần Trả dòng', 'E · Pull the Return Flow lever'),
  entry('l6.prompt.chamberLocked', 'E · Buồng tinh thể còn khóa', 'E · Crystal chamber is still locked'),
  entry('l6.prompt.chamberCrystal', 'E · Nhận Tinh thể Hy Vọng', 'E · Take the Hope Crystal'),
  entry('l6.prompt.chamberEmpty', 'E · Ngăn chứa đã trống', 'E · The compartment is empty'),
  entry('l6.prompt.recordAgain', 'E · Nghe lại bản ghi', 'E · Hear the record again'),
  entry('l6.prompt.recordOnce', 'E · Nghe bản ghi bên cửa sổ', 'E · Hear the record by the window'),
  entry('l6.prompt.exitOpen', 'E · Xuống khu vườn', 'E · Down to the garden'),
  entry('l6.prompt.exitCheck', 'E · Kiểm tra lối xuống', 'E · Check the way down'),
  // Shared with the Shattered Creek lamp stands: one row, one sentence.
  entry('l6.prompt.takeLantern', 'E · Thu hồi đèn', 'E · Take back the lantern'),
  entry('l6.prompt.placeLantern', 'E · Đặt đèn', 'E · Set the lantern'),

  // Scene label.
  entry('l6.label.bench', 'Bàn thử', 'Test bench'),

  // ── Sleeping Garden (l7) ───────────────────────────────────────────────────
  // Opening.
  entry('l7.intro.1', 'Hoa ở đây vẫn nở. Tôi tưởng vậy là tốt.', 'The flowers here are still blooming. I thought that was good.'),
  entry('l7.intro.2', 'Nhưng cây non dưới này không có lá mới.', 'But the young trees down here have no new leaves.'),
  entry('l7.intro.3', 'Nước đã về rồi mà.', 'But the water is back already.'),
  entry('l7.intro.4', 'Ánh từ bể kia vẫn chiếu xuống. Thử che nó lại xem.', 'The light from that reservoir still falls on them. Let us try covering it.'),

  // Closing the shutter.
  entry('l7.canopy.1', 'Tối đi thật.', 'It really does get dark.'),
  entry('l7.canopy.2', 'Nghe kìa.', 'Listen.'),

  // The two practice pots.
  entry('l7.practice.1',
    'Hoa cần sáng để nâng thanh. Rễ chỉ vươn khi đèn tắt.',
    'The flowers need light to lift the bar. The roots reach out only when the lantern is off.'),
  entry('l7.practice.2', 'Ánh của tôi không làm rễ co lại.', "My light doesn't make the roots pull back."),
  entry('l7.practice.3', 'Cậu có thể đi cùng tôi lúc tắt đèn.', 'You can come with me when I put the lantern out.'),

  // The bar and the bridge.
  entry('l7.retract.1', 'Mở được cửa thì lại mất cầu.', 'Open the gate and we lose the bridge.'),
  entry('l7.retract.2', 'Tay chốt sau cửa có giữ được thanh chắn không?', 'Can the latch behind the gate hold the bar?'),
  entry('l7.held.1', 'Cửa vẫn mở. Rễ cũng đã nối lại rồi.', 'The gate is still open. The roots have joined up again too.'),
  entry('l7.held.2', 'Giờ chúng không cần cùng phản ứng theo chiếc đèn nữa.', 'Now they no longer have to answer the lantern together.'),

  // In the nursery.
  entry('l7.nursery.1', 'Nó vừa mọc thêm một chiếc lá.', 'It just grew another leaf.'),
  entry('l7.nursery.2', 'Có nước. Có lúc nghỉ. Có lẽ nó đã đợi cả hai.', 'Water, and a time to rest. Maybe it was waiting for both.'),
  entry('l7.nursery.3', 'Tôi cứ nghĩ nếu làm mọi nơi sáng hơn…', 'I kept thinking that if I made everywhere brighter…'),
  entry('l7.nursery.4', 'Cậu muốn giúp rừng tỉnh dậy.', 'You wanted to help the forest wake up.'),
  entry('l7.nursery.5', 'Nhưng có những thứ cần được ngủ.', 'But some things need to sleep.'),
  entry('l7.nursery.6', 'Mình biết thêm được một điều rồi.', 'We know one more thing now.'),
  entry('l7.nursery.7', 'Cứ ngủ đi. Chúng tôi sẽ giữ đường nước mở.', 'Sleep now. We will keep the waterway open.'),

  // The side path.
  entry('l7.sideLatched.1', 'Chốt đá đã gài. Lối đá phụ mở rồi.', 'The stone latch is set. The side path is open.'),
  entry('l7.sideLatched.2',
    'Lối về này không cần ánh sáng. Cây non có nước và có lúc nghỉ.',
    'This way back needs no light. The young tree has water and a time to rest.'),

  // The sprout.
  entry('l7.sprout.before', 'Mầm cây vẫn khép. Nó cần nước và một khoảng tối để nghỉ.', 'The sprout is still closed. It needs water and a stretch of dark to rest.'),
  entry('l7.sprout.after.1', 'Lá mới mềm hơn những chiếc cũ.', 'The new leaf is softer than the old ones.'),
  entry('l7.sprout.after.2', 'Ngày mai chắc nó sẽ lớn thêm. Khi ngày mai trở lại.', 'Tomorrow it will surely grow more. When tomorrow comes again.'),

  // The silhouette at the gate.
  entry('l7.ending.1', 'Có ai ở đó.', 'There is someone there.'),
  entry('l7.ending.2', 'Người ấy vừa che ánh sáng khỏi luống cây.', 'That person just shielded the light from the seedbeds.'),
  entry('l7.ending.3', 'Giống việc mình vừa làm?', 'Like what we just did?'),
  entry('l7.ending.4', 'Mình tới hỏi xem.', 'Let us go and ask.'),

  // Objective banner.
  
  
  
  
  
  
  
  
  
  

  // Hint ladder — the reservoir shutter.
  entry('l7.hint.canopy.1', 'Cả khu vườn đang được bể tích quang nuôi sáng.', 'The whole garden is being kept lit by the reservoir.'),
  entry('l7.hint.canopy.2', 'Có một tay màn che ở khe tường phía tây bắc, cạnh bể.', 'There is a shutter handle in the northwest wall gap, beside the reservoir.'),
  entry('l7.hint.canopy.3', 'Đi vòng lên phía bắc, vào khe tường và nhấn E ở tay màn che.', 'Go around to the north, step into the wall gap and press E at the shutter handle.'),

  // Hint ladder — the main puzzle.
  entry('l7.hint.main.1', 'Hai chậu thử phản ứng trái ngược. Sau thanh chắn có một tay chốt.', 'The two practice pots answer in opposite ways. Beyond the bar there is a latch handle.'),
  entry('l7.hint.main.2',
    'Giữ thanh chắn bằng chốt, rồi tắt đèn để rễ làm cầu. Một phần đường phải tự giữ trước khi phần kia xuất hiện.',
    'Hold the bar with the latch, then put the lantern out so the roots make a bridge. One part of the way must hold itself before the next appears.'),
  entry('l7.hint.main.3',
    'Bật đèn, qua thanh chắn và gài chốt. Tắt đèn, qua cầu rễ, mở cống rồi tới điện thờ.',
    'Light the lantern, pass the bar and set the latch. Put it out, cross the root bridge, open the drain, then go to the shrine.'),

  // Hint ladder — Lumo by the sprout (after the water).
  entry('l7.hint.story.1', 'Nước đã chảy tới vườn ươm. Lumo có điều muốn nói.', 'Water has reached the nursery. Lumo has something to say.'),
  entry('l7.hint.story.2', 'Lumo đang ở gần mầm cây trong vườn ươm.', 'Lumo is near the sprout in the nursery.'),
  entry('l7.hint.story.3', 'Nhấn E ở mầm cây để nghe Lumo.', 'Press E at the sprout to hear Lumo.'),

  // Hint ladder — the gate.
  entry('l7.hint.exit.1', 'Cả vườn đã được chăm lại. Cổng điện thờ nằm ở góc đông bắc.', 'The whole garden has been tended again. The shrine gate is in the northeast corner.'),
  entry('l7.hint.exit.2', 'Đi theo vườn ươm lên bậc đá phía đông rồi rẽ lên walkway.', 'Follow the nursery up the eastern stone steps, then turn up onto the walkway.'),
  entry('l7.hint.exit.3', 'Tới cổng và nhấn E.', 'Go to the gate and press E.'),

  // Journal.
  entry('l7.journal.1', 'Khu vườn ngủ dưới ánh của bể tích quang.', 'The garden sleeps under the light of the reservoir.'),
  entry('l7.journal.2',
    'Khi màn che đóng, chỉ còn đèn của mình đánh thức được cây cối.',
    'When the shutter is closed, only our lantern can wake the plants.'),
  entry('l7.journal.3',
    'Hoa Nhật nở khi có sáng và nâng thanh chắn. Chốt đá giữ được nó cả khi tắt đèn.',
    'The Sun Flower opens in light and lifts the bar. The stone latch holds it even with the lantern out.'),
  entry('l7.journal.4', 'Rễ Nguyệt vươn khi tối và bắc thành cầu qua mương.', 'The Moon Roots reach out in the dark and bridge the ditch.'),
  entry('l7.journal.5',
    'Vườn ươm cần nước rồi cần một khoảng tối để nghỉ. Lối đá phụ là lối về không cần sáng.',
    'The nursery needs water, then a stretch of dark to rest. The side path is a way back that needs no light.'),
  entry('l7.journal.6',
    'Không phải chỗ nào cũng cần sáng hơn. Có nơi cần được ngủ.',
    'Not every place needs more light. Some places need to sleep.'),
  entry('l7.journal.7',
    'Những dấu nhỏ: một bàn tay nhỏ in trên đá ướt. Không ai nói đó là tay của ai.',
    'Small marks: a small handprint on wet stone. No one says whose hand it was.'),

  // Scenario v2 07 §4/§5: Lumo's guide on the root bridge and the handprint on the wet stone.
  entry('l7.bridgeGuide.1', 'Đi theo ánh của tôi. Nó không làm rễ co lại đâu.', "Follow my light. It won't make the roots pull back."),
  entry('l7.handprint.1', 'Có một bàn tay nhỏ in trên đá. Nước vừa làm nó hiện lên.', 'There is a small handprint on the stone. The water has just brought it up.'),
  entry('l7.handprint.2', 'Ai đó từng chơi ở đây, lúc đá còn ướt.', 'Someone once played here, back when the stone was still wet.'),

  // Status row: root bridge state.
  entry('l7.state.bridgeYes', 'có', 'yes'),
  entry('l7.state.bridgeNo', 'không', 'no'),

  // Setting the bar latch.
  entry('l7.latchWest.1', 'Chốt đá đã giữ thanh chắn.', 'The stone latch holds the bar.'),
  entry('l7.latchWest.2', 'Giờ bóng tối cũng không đóng được lối này.', 'Now even the dark cannot close this way.'),
  entry('l7.inspectLatchWest.1',
    'Thanh chắn đang hạ nên chốt chưa khớp. Bật đèn (F) cho Hoa Nhật nâng nó lên, rồi gài chốt.',
    'The bar is down, so the latch does not fit yet. Turn the lantern on (F) so the Sun Flower lifts it, then set the latch.'),
  entry('l7.inspectLatchEast.1',
    'Chốt này chỉ khớp khi nước đã chảy tới vườn ươm. Mở cống trước đã.',
    'This latch only fits once water has reached the nursery. Open the drain first.'),

  // Refusals at the shrine gate.
  entry('l7.exitBlock.canopy', 'Cổng còn khép. Mình phải che bể tích quang trước đã.', 'The gate is still shut. I need to cover the reservoir first.'),
  entry('l7.exitBlock.bar', 'Thanh chắn chưa được giữ. Cần gài chốt trước khi cổng mở.', 'The bar is not held. I need to set the latch before the gate opens.'),
  entry('l7.exitBlock.drain', 'Vườn ươm còn thiếu nước. Mở cống rồi quay lại.', 'The nursery still lacks water. Open the drain and come back.'),
  entry('l7.exitBlock.lumo', 'Lumo vẫn đang đợi bên mầm cây.', 'Lumo is still waiting by the sprout.'),

  // Interaction prompts.
  entry('l7.prompt.handle', 'E · Kéo màn che bể tích quang', 'E · Pull the reservoir shutter'),
  entry('l7.prompt.latchWest', 'E · Gài chốt thanh chắn', 'E · Set the bar latch'),
  entry('l7.prompt.inspectLatchWest', 'E · Xem chốt đá (chưa gài được)', 'E · Look at the stone latch (not ready to set)'),
  entry('l7.prompt.drain', 'E · Mở cống vườn ươm', 'E · Open the nursery drain'),
  entry('l7.prompt.latchEast', 'E · Gài chốt lối đá phụ', 'E · Set the side-path latch'),
  entry('l7.prompt.inspectLatchEast', 'E · Xem chốt lối đá phụ (chưa gài được)', 'E · Look at the side-path latch (not ready to set)'),
  entry('l7.prompt.sprout', 'E · Ngắm mầm cây', 'E · Look at the sprout'),
  entry('l7.prompt.exitOpen', 'E · Qua cổng điện thờ', 'E · Through the shrine gate'),
  entry('l7.prompt.exitClosed', 'Cổng điện thờ đang khép · chăm khu vườn trước', 'The shrine gate is shut · tend the garden first'),

  // ── Shattered Creek (l4) ───────────────────────────────────────────────────
  // Opening.
  entry('l4c.intro.1', 'Suối chỉ còn ngần này nước thôi sao?', 'Is this all the water the creek has left?'),
  entry('l4c.intro.2', 'Trước kia, nước chảy suốt ngày đêm ở đây.', 'Long ago, water ran here day and night.'),
  entry('l4c.intro.3', 'Cây lớn phía kia… là Cây Mẹ à?', 'That great tree over there… is that the Mother Tree?'),
  entry('l4c.intro.4', 'Ừ. Ba hốc trống trên thân là chỗ đặt những mảnh tinh thể.', 'Yes. The three empty hollows in its trunk are where the crystal shards go.'),
  entry('l4c.intro.5', 'Vậy mình đang đi đúng hướng. Nhưng làm sao sang được bờ bên kia?', 'Then we are going the right way. But how do we get to the far bank?'),
  entry('l4.intro.6', 'Những cây cầu ở đây cần ánh sáng mới hiện ra.', 'The bridges here only appear with light.'),
  entry('l4.intro.7',
    'Có bệ đèn với một chiếc gương nhỏ cạnh lối vào. Mình thử ở đó trước nhé?',
    'There is a lamp stand and a small mirror by the entrance. Shall we try there first?'),

  // The stone flower.
  entry('l4.practice.1', 'Bông hoa bằng đá mà cũng mở được!', 'Even a stone flower opens!'),
  entry('l4.practice.2', 'Cậu vừa dùng gương đưa ánh sáng tới nó đấy.', 'You just used the mirror to send light to it.'),
  entry('l4.practice.3', 'Vậy mình thử với những chiếc gương bên suối xem. Để tôi lấy đèn đã.', 'Then let us try the mirrors by the creek. Let me get the lantern first.'),

  // The first bridge and its latch.
  entry('l4.firstBridge.1', 'Có cầu rồi! Nhưng mới tới hòn đảo.', 'There is a bridge! But it only reaches the island.'),
  entry('l4.firstBridge.2',
    'Tay chốt kia nối với chân cầu. Thử gài xem có giữ được nó không.',
    'That latch handle is joined to the bridge foot. Let us see whether setting it holds it.'),
  entry('l4.latchA.1', 'Khớp rồi. Chốt đã giữ cầu lại.', 'It fits. The latch holds the bridge.'),

  // Turning the beam to the island.
  entry('l4.reroute.1', 'Tia đã đổi hướng mà cầu vẫn còn!', 'The beam turned and the bridge is still there!'),
  entry('l4.reroute.2',
    'Giờ ánh sáng đã tới được chiếc gương trên đảo. Mình thử xoay nó nhé.',
    'Now the light reaches the mirror on the island. Let us try turning it.'),

  // The second bridge.
  entry('l4.latchB.1', 'Cả hai đoạn cầu đã giữ chắc rồi. Mình quay lại lấy đèn thôi.', 'Both bridge spans are held fast. Let us go back for the lantern.'),
  entry('l4.latchUnpowered.1', 'Chốt chưa ăn khớp. Có lẽ cầu phải hiện lên trước.', 'The latch will not catch. Maybe the bridge has to appear first.'),
  entry('l4.latchRepeat.1',
    'Chốt vẫn chắc. Đổi hướng ánh sáng cũng không làm cầu mất nữa.',
    'The latch still holds. Turning the light no longer takes the bridge away.'),

  // Refusing an unsafe light change.
  entry('l4.unsafe.onBridge.1', 'Khoan đã. Mình phải lên bờ trước khi đổi ánh sáng.', 'Wait. I have to get onto the bank before I change the light.'),
  entry('l4.unsafe.returnPath.1',
    'Đổi tia lúc này sẽ mất đường về. Mình phải gài chốt trước đã.',
    'Turning the beam now would cut off the way back. I need to set the latch first.'),

  // The relief on the far bank.
  entry('l4.relief.lampReminder.1', 'Suýt nữa thì quên đèn. Mình quay lại lấy đã.', 'I nearly forgot the lantern. Let me go back for it.'),
  entry('l4.relief.first.1', 'Những tia sáng này… đều hướng về Cây Mẹ.', 'These beams… all of them point to the Mother Tree.'),
  entry('l4.relief.first.2',
    'Người này cũng mang một chiếc đèn. Có phải người trong bức tranh ở thư viện không?',
    'This person carries a lantern too. Is it the one from the painting in the library?'),
  entry('l4.relief.first.3', 'Mưa… Đêm đó mưa lớn lắm.', 'Rain… that night the rain was heavy.'),
  entry('l4.relief.first.4',
    'Có phải người này đang thắp sáng để dẫn người đi lạc về không?',
    'Is this person keeping the light for those who are lost?'),
  entry('l4.relief.first.5',
    'Tôi không biết. Tôi chỉ nhớ tiếng chuông trên tháp. Nó kêu mãi giữa tiếng mưa.',
    "I don't know. I only remember the bell on the tower. It kept ringing through the rain."),
  entry('l4.relief.first.6',
    'Nhưng trong hình, nước vẫn chảy tới gốc cây. Chuyện gì đã làm nó ngừng lại nhỉ?',
    'But in the picture the water still runs to the base of the tree. What made it stop?'),
  entry('l4.relief.first.7',
    'Đường nước đi qua trạm phía trước. Có lẽ ở đó còn ghi lại chuyện đã xảy ra.',
    'The waterway runs through the station ahead. Perhaps it still records what happened.'),
  entry('l4.relief.repeat.1',
    'Ánh sáng hướng về Cây Mẹ, còn nước vẫn chảy dưới chân tháp.',
    'The light points to the Mother Tree, and the water still runs at the foot of the tower.'),

  // Leaving.
  entry('l4.exit.leaveLamp.1', 'Đèn vẫn còn trên bệ. Mình phải mang theo.', 'The lantern is still on the stand. I have to take it with me.'),
  entry('l4.exit.unreadRelief.1', 'Mình chưa xem bức phù điêu kia. Biết đâu có thêm manh mối.', 'I have not looked at that relief yet. There may be another clue.'),
  entry('l4.exit.next.1', 'Chỗ đó vừa sáng khi tôi tới gần.', 'That spot lit up as I came near.'),
  entry('l4.exit.next.2', 'Có lẽ trạm này vẫn còn hoạt động. Mình vào xem nhé?', 'Perhaps this station still works. Shall we go in?'),

  // Hint ladder.
  entry('l4.hint.practice.1', 'Bệ nhỏ và gương thử cạnh lối vào không nối với cầu.', 'The small stand and test mirror by the entrance are not connected to the bridges.'),
  entry('l4.hint.practice.2', 'E đặt đèn lên bệ nhỏ; E ở gương xoay qua các hướng.', 'E sets the lantern on the small stand; E at the mirror turns it through its angles.'),
  entry('l4.hint.practice.3', 'Xoay gương thử cho tia chạm bông hoa đá.', 'Turn the test mirror until the beam touches the stone flower.'),
  entry('l4.hint.pickup.1', 'Đèn đang nằm trên bệ thử. E sẽ thu hồi đèn bất cứ lúc nào an toàn.', 'The lantern is on the test stand. E takes it back whenever it is safe.'),
  entry('l4.hint.pickup.2', 'Đứng cạnh bệ thử và nhấn E để lấy đèn.', 'Stand by the test stand and press E to take the lantern.'),
  entry('l4.hint.main.1', 'Đặt đèn lên bệ chính ở bờ Tây.', 'Set the lantern on the main stand on the west bank.'),
  entry('l4.hint.main.2', 'G1 và G2 điều hướng tia. Xoay từng gương bằng E rồi nhìn đường sáng.', 'G1 and G2 steer the beam. Turn each mirror with E and watch the line of light.'),
  entry('l4.hint.latchA.1', 'Mắt nhận A đã sáng. Tay chốt nằm cạnh chân cầu phía Tây.', 'Receiver A is lit. The latch handle is beside the western bridge foot.'),
  entry('l4.hint.latchA.2', 'Gài chốt A trước khi đổi hướng tia.', 'Set latch A before turning the beam.'),
  entry('l4.hint.reroute.1', 'Hãy giữ cầu A trước khi đổi tia.', 'Hold bridge A before turning the beam.'),
  entry('l4.hint.reroute.2', 'Từ G2, hướng tia sang gương G3 trên đảo.', 'From G2, send the beam to mirror G3 on the island.'),
  entry('l4.hint.latchB.1', 'Mắt nhận B đã sáng. Gài chốt thứ hai ngay trên đảo.', 'Receiver B is lit. Set the second latch on the island.'),
  entry('l4.hint.retrieve.1', 'Hai chốt đã giữ cầu. Quay về bờ Tây và thu hồi đèn.', 'Both latches hold the bridges. Go back to the west bank and take the lantern.'),
  entry('l4.hint.relief.1', 'Thu hồi đèn rồi đọc phù điêu ở bờ Đông.', 'Take the lantern back, then read the relief on the east bank.'),
  entry('l4.hint.exit.1', 'Đến vòm trạm dẫn nước và nhấn E.', 'Go to the arch of the water station and press E.'),

  // Hint ladder — the specific thing still missing.
  entry('l4.hintExtra.testOff.1', 'Đèn thử đang tắt. Nhấn F để bật tia sáng.', 'The test lantern is off. Press F to start the beam.'),
  entry('l4.hintExtra.carryMain.1',
    'Đèn đang ở trong tay. Tới bệ chính ở bờ Tây và nhấn E để đặt xuống.',
    'The lantern is in hand. Go to the main stand on the west bank and press E to set it down.'),
  entry('l4.hintExtra.placeMain.1',
    'Đặt đèn lên bệ chính bằng E; khi nằm yên, đèn sẽ giữ đường tia.',
    'Set the lantern on the main stand with E; once it rests, it holds the beam line.'),
  entry('l4.hintExtra.mainOff.1', 'Đèn chính đang tắt. Nhấn F để bật tia sáng.', 'The main lantern is off. Press F to start the beam.'),
  entry('l4.hintExtra.aimG1.1', 'Bệ chính ở bờ Tây. Tia cần tới G1.', 'The main stand is on the west bank. The beam needs to reach G1.'),
  entry('l4.hintExtra.g3Off.1',
    'Đèn đang tắt. Nhấn F để bật tia rồi tiếp tục dẫn sáng tới G3.',
    'The lantern is off. Press F to start the beam again, then carry the light on to G3.'),
  entry('l4.hintExtra.holdA.1', 'Giữ cầu A bằng chốt trước khi đổi tia.', 'Hold bridge A with the latch before turning the beam.'),
  entry('l4.hintExtra.g2toG3.1', 'Xoay G2 sang / để gửi tia tới G3.', 'Turn G2 to / to send the beam to G3.'),
  entry('l4.hintExtra.mainStand.1', 'Hai chốt đã giữ cầu. Bệ đèn chính ở bờ Tây.', 'Both latches hold the bridges. The main lamp stand is on the west bank.'),
  entry('l4.hintExtra.extend.1',
    'Đặt đèn lên bệ chính rồi nhấn E lần nữa để thu hồi.',
    'Set the lantern on the main stand, then press E again to take it back.'),

  // Journal.
  entry('l4.journal.practice.1',
    'Ghi chép: tia sáng đổi hướng khi gương xoay; đèn có thể thu hồi.',
    'Note: the beam turns when the mirror turns; the lantern can be taken back.'),
  entry('l4.journal.latch.1',
    'Ghi chép: chốt cơ khí giữ cầu khi tia sáng đổi hướng.',
    'Note: the mechanical latch holds the bridge when the beam turns.'),
  entry('l4.journal.relief.1',
    'Ghi chép — phù điêu: những tia sáng đều hướng về Cây Mẹ. Đêm ấy có một cơn bão lớn và tiếng chuông tháp còn in trong ký ức.',
    'Note — the relief: all the beams point to the Mother Tree. That night there was a great storm, and the sound of the tower bell is still in memory.'),
  entry('l4.journal.relief.2',
    'Ghi chép — trong phù điêu, dòng nước vẫn chảy. Chưa rõ điều gì xảy ra sau đó; trạm phía trước có thể giữ thêm manh mối.',
    'Note — in the relief the water still flows. It is not clear what happened after; the station ahead may hold more clues.'),
  entry('l4.journal.empty.1', 'Chưa có ghi chép mới từ suối.', 'No new notes from the creek yet.'),

  // Objective banner.
  entry('l4.objective.practice', 'Thử đặt đèn và gương nhỏ cạnh lối vào.', 'Try the lamp stand and small mirror by the entrance.'),
  entry('l4.objective.pickup', 'Thu hồi đèn bằng E.', 'Take the lantern back with E.'),
  entry('l4.objective.main', 'Đặt đèn chính rồi điều hướng tia qua gương.', 'Set the main lantern, then steer the beam through the mirrors.'),
  entry('l4.objective.latchA', 'Gài chốt cầu đầu bên bờ Tây.', 'Latch the first bridge on the west bank.'),
  entry('l4.objective.reroute', 'Giữ cầu đầu rồi điều hướng tia sang gương trên đảo.', 'Hold the first bridge, then steer the beam to the mirror on the island.'),
  entry('l4c.objective.latchB', 'Gài chốt cầu thứ hai trên đảo.', 'Latch the second bridge on the island.'),
  entry('l4.objective.retrieveLamp', 'Thu hồi đèn khỏi bệ.', 'Take the lantern back from the stand.'),
  entry('l4.objective.retrieveSet', 'Đặt đèn lên bệ chính rồi thu hồi.', 'Set the lantern on the main stand, then take it back.'),
  entry('l4.objective.relief', 'Đọc phù điêu bờ Đông.', 'Read the relief on the east bank.'),
  entry('l4c.objective.exit', 'Đến trạm dẫn nước.', 'Reach the water station.'),
  entry('l4.objective.lanternOff', 'Đèn đang tắt. Nhấn F để bật tia sáng.', 'The lantern is off. Press F to start the beam.'),
  entry('l4.objective.placeMain', 'Đặt đèn lên bệ chính bằng E.', 'Set the lantern on the main stand with E.'),

  // Interaction prompts.
  entry('l4.prompt.testMirror', 'E · Xoay gương thử', 'E · Turn the test mirror'),
  entry('l4.prompt.latchHeld', 'E · Chốt đã giữ chắc', 'E · The latch holds fast'),
  entry('l4.prompt.relief', 'E · Đọc phù điêu', 'E · Read the relief'),
  entry('l4.prompt.stationOpen', 'E · Qua trạm dẫn nước', 'E · Through the water station'),
  entry('l4.prompt.stationClosed', 'E · Kiểm tra trạm dẫn nước', 'E · Check the water station'),

  // Scene labels.
  entry('l4.label.testStand', 'Bệ thử', 'Test stand'),
  entry('l4.label.testMirror', 'Gương thử', 'Test mirror'),
  entry('l4.label.lampStand', 'Bệ đèn', 'Lamp stand'),
];

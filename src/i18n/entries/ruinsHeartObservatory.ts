/**
 * Chapters 08–09 player-facing copy, translated from the runtime Vietnamese.
 *
 * Sources:
 *   `src/levels/RuinsOfTwoHalvesLevel.ts` — The Ruins of Two Halves (`l8.*`)
 *   `src/levels/HeartOfElariaLevel.ts`     — The Heart of Elaria (`l9.*`)
 *   `src/data/observatoryStory.ts`         — Dark Moon Observatory story data (`l8obs.*`)
 *
 * Keys are the authored Vietnamese sentences copied byte for byte; `tools/verify-entries.mjs`
 * checks that every key still exists in `src/`. Template literals that carry a `${…}` are
 * composed at the call site and get no entry: only the static sentences do.
 *
 * Voice, per `docs/i18n/glossary.md`: Nhinh has no contractions, Lumo has light ones, and
 * The Shadow / The Guardian speaks formally, without any.
 */
import { entry, type CatalogEntry } from '../entry.ts';

export const RUINS_HEART_OBSERVATORY_ENTRIES: readonly CatalogEntry[] = [
  /* ------------------------------------------------------------ Ruins — opening */
  entry('l8.opening.1', 'Hình bóng đó lại ở kia.', "That figure's over there again."),
  entry('l8.opening.2', 'Nó không tiến về phía mình. Nó đang nhìn xuống đất.',
    'It is not coming toward us. It is looking down at the ground.'),
  entry('l8.opening.3', 'Hạ ánh sáng xuống.', 'Lower your light.'),
  entry('l8.opening.4', 'Chúng tôi đến để cứu Cây Mẹ!', 'We came to save the Mother Tree!'),
  entry('l8.opening.5', 'Vậy hãy nhìn thứ đang ở dưới chân ngươi.', 'Then look at what lies at your feet.'),
  entry('l8.opening.6', 'Cây non. Giống trong khu vườn.', 'Seedlings. The same as in the garden.'),
  entry('l8.opening.7', 'Chúng ta sẽ giữ đèn cách xa.', "We'll keep the lantern far away."),

  /* ------------------------------------------------------------ Ruins — the ring latches */
  entry('l8.latch.1', 'Vòng trên bệ sáng đều. Điện thờ đã gài.',
    'The ring on the pedestal glows steady. The sanctuary is latched.'),
  entry('l8.latch.2', 'Màn đá trượt tới che luống cây. The Shadow thôi giơ tay chắn sáng.',
    'The stone screen slides across to cover the seed bed. The Shadow stops shielding the light with his hand.'),
  entry('l8.latch.3', 'Dưới chân ông, lá nhỏ ngẩng lên.', 'At his feet, small leaves lift their heads.'),

  /* ------------------------------------------------------------ Ruins — The Shadow */
  entry('l8.shadowTalk.1', 'Ông đã bảo vệ chúng suốt thời gian này?', 'You have been protecting them all this time?'),
  entry('l8.shadowTalk.2', 'Chúng là những mầm cuối cùng còn biết chờ đêm.',
    'They are the last shoots that still know how to wait for the night.'),
  entry('l8.shadowTalk.3', 'Tôi tưởng ông muốn giữ rừng trong bóng tối.',
    'I thought you wanted to keep the forest in darkness.'),
  entry('l8.shadowTalk.4', 'Ta chỉ còn nhớ cách che cho chúng. Có quá nhiều điều ta đã đánh mất.',
    'I remember only how to shelter them. I have lost so much else.'),
  entry('l8.shadowTalk.5', 'Chúng tôi tìm được hai tinh thể. Mảnh cuối ở đâu?',
    'We found two crystals. Where is the last piece?'),
  entry('l8.shadowTalk.6', 'Trên đài nhìn trăng. Nơi ta đã dừng vòng trời.',
    'On the moon-watching platform. Where I stopped the turning of the sky.'),
  entry('l8.shadowTalk.7', 'Ông nói… ta?', 'You said… “I”?'),
  entry('l8.shadowTalk.8', 'Hãy đọc bản ghi. Đừng chỉ nghe điều ta còn có thể nói.',
    'Read the record. Do not listen only to what I can still say.'),
  entry('l8.shadowTalk.9', 'The Shadow chạm vào một dấu vòng xoắn trên cửa Bắc.',
    'The Shadow touches a spiral mark on the north door.'),
  entry('l8.shadowTalk.10', 'Dấu này ở đường hầm dẫn nước.', 'This mark was in the water tunnel.'),
  entry('l8.shadowTalk.11', 'Mình mang ký ức tới đài thiên văn. Có lẽ chúng sẽ ghép lại ở đó.',
    'I will bring the memories to the observatory. Perhaps they will fit together there.'),

  /* ------------------------------------------------------------ Ruins — ending */
  entry('l8.ending.1', 'Tôi sợ điều mình sắp nhớ ra.', "I'm scared of what I'm about to remember."),
  entry('l8.ending.2', 'Mình sẽ đọc cùng nhau.', 'We will read it together.'),

  /* ------------------------------------------------------------ Ruins — inscription */
  // Composed into the `Bia đá: …` line, so the surrounding template gets no entry of its own.
  entry('l8.inscription',
    'Mặt trời giữ đường đi. Mặt trăng giữ giờ nghỉ. Đừng đặt một bên vào chỗ của cả hai.',
    'The sun keeps the path. The moon keeps the hour of rest. Do not set one in the place of both.'),

  /* ------------------------------------------------------------ Ruins — hint ladders */
  // The main ladder opens on this same line, so it is kept once, here.
  entry('l8.hint.practice.1', 'Cột ở tiền sảnh tạo bóng. Bức tượng giữa sân có đế xoay giống vậy.',
    'The column in the entrance hall casts a shadow. The statue in the courtyard has a turning base just like it.'),
  entry('l8.hint.practice.2', 'Bật đèn bằng F. Mặt rộng của cột chắn ánh sáng, mặt hẹp thì ánh sáng lọt qua.',
    'Turn the lantern on with F. The wide face of the column blocks the light; the narrow face lets it through.'),
  entry('l8.hint.practice.3', 'Đứng ở mép nam cột đá thử và nhấn E để xoay. Xem phiến Nguyệt trên nền đổi trạng thái.',
    'Stand at the south edge of the practice column and press E to turn it. Watch the Moon slab on the floor change state.'),

  entry('l8.hint.place.1', 'Khóa Nhật cần ánh sáng từ bệ chính.',
    'The Sun Lock needs light from the main pedestal.'),
  entry('l8.hint.place.2', 'Bộ chia tia trên bệ chỉ chạy khi đèn nằm ngay trên bệ.',
    'The splitter on the pedestal only works while the lantern sits on it.'),
  entry('l8.hint.place.3', 'Đứng ở mép nam bệ chính và nhấn E để đặt đèn.',
    'Stand at the south edge of the main pedestal and press E to set the lantern down.'),

  entry('l8.hint.main.2', 'Hai khóa Nhật cần sáng cùng lúc. Khóa Nguyệt cần bóng của tượng, trong khi đèn vẫn bật.',
    "Both Sun Locks must be lit at once. The Moon Lock needs the statue's shadow while the lantern stays on."),
  entry('l8.hint.main.3', 'Đặt đèn, hướng hai gương vào hai Nhật. Xoay mặt rộng của tượng chắn luồng giữa tới Nguyệt, rồi xác nhận ở bệ.',
    "Set the lantern down and aim both mirrors at the two Sun Locks. Turn the statue's wide face to block the centre beam to the Moon Lock, then confirm at the pedestal."),

  entry('l8.hint.confirm.1', 'Hai Nhật sáng và Nguyệt đã tối cùng lúc.',
    'Both Sun Locks are lit and the Moon has gone dark at the same moment.'),
  entry('l8.hint.confirm.2', 'Vòng trên bệ chính đang sáng đều.', 'The ring on the main pedestal glows steady.'),
  entry('l8.hint.confirm.3', 'Đứng ở mép nam bệ chính và nhấn E để gài điện thờ.',
    'Stand at the south edge of the main pedestal and press E to latch the sanctuary.'),

  entry('l8.hint.retrieve.1', 'Điện thờ đã gài. Đèn vẫn nằm trên bệ.',
    'The sanctuary is latched. The lantern is still on the pedestal.'),
  entry('l8.hint.retrieve.2', 'Nhinh cần đèn trong tay để đi tiếp.', 'Nhinh needs the lantern in hand to go on.'),
  entry('l8.hint.retrieve.3', 'Đứng ở mép nam bệ chính và nhấn E để nhận lại đèn.',
    'Stand at the south edge of the main pedestal and press E to take the lantern back.'),

  entry('l8.hint.shadow.1', 'Màn đá đã trượt che luống mầm. The Shadow đã thôi giơ tay chắn sáng.',
    'The stone screen has slid over the seed bed. The Shadow no longer holds a hand against the light.'),
  entry('l8.hint.shadow.2', 'Ông đang đứng cạnh luống mầm, ở phía tây bắc sân.',
    'He is standing beside the seed bed, north-west of the courtyard.'),
  entry('l8.hint.shadow.3', 'Tới gần The Shadow và nhấn E để nói chuyện.',
    'Go up to The Shadow and press E to talk.'),

  entry('l8.hint.exit.1', 'The Shadow đi trước trên cầu thang Bắc.',
    'The Shadow walks ahead on the north stair.'),
  entry('l8.hint.exit.2', 'Ông dừng lại mỗi khi Nhinh và Lumo chưa theo kịp.',
    'He stops whenever Nhinh and Lumo fall behind.'),
  entry('l8.hint.exit.3', 'Tới cửa Bắc và nhấn E.', 'Go to the north door and press E.'),

  /* ------------------------------------------------------------ Ruins — interaction prompts */
  entry('l8.prompt.practiceColumn', 'E · Xoay cột đá thử', 'E · Turn the practice column'),
  entry('l8.prompt.statue', 'E · Xoay tượng', 'E · Turn the statue'),
  entry('l8.prompt.seedBed', 'E · Xem luống mầm', 'E · Inspect the seed bed'),
  entry('l8.prompt.shadow', 'E · Nói chuyện với The Shadow', 'E · Talk to The Shadow'),
  entry('l8.prompt.inscription', 'E · Đọc bia điện thờ', 'E · Read the sanctuary tablet'),

  entry('l8.prompt.pedestal.retrieve', 'E · Nhận lại đèn', 'E · Take back the lantern'),
  entry('l8.prompt.pedestal.taken', 'E · Bệ chính (đèn đã thu hồi)',
    'E · Main pedestal (lantern retrieved)'),
  entry('l8.prompt.pedestal.place', 'E · Đặt đèn lên bệ', 'E · Set the lantern on the pedestal'),
  entry('l8.prompt.pedestal.needLamp', 'E · Bệ chính (cần đèn trong tay)',
    'E · Main pedestal (lantern needed in hand)'),
  entry('l8.prompt.pedestal.latch', 'E · Gài điện thờ', 'E · Latch the sanctuary'),
  entry('l8.prompt.pedestal.check', 'E · Kiểm tra bàn xác nhận', 'E · Check the confirmation table'),

  entry('l8.prompt.exit.open', 'E · Qua cửa Bắc', 'E · Through the north door'),
  entry('l8.prompt.exit.latch', 'E · Cửa Bắc (cần gài điện thờ)',
    'E · North door (sanctuary must be latched)'),
  entry('l8.prompt.exit.lamp', 'E · Cửa Bắc (cần thu hồi đèn)',
    'E · North door (lantern must be retrieved)'),
  entry('l8.prompt.exit.shadow', 'E · Cửa Bắc (cần gặp The Shadow)',
    'E · North door (meet The Shadow first)'),

  /* ------------------------------------------------------------ Ruins — control replies */
  entry('l8.action.column.dark', 'Cột đã xoay, nhưng chưa có ánh sáng nào đi qua đây. Bật đèn bằng F.',
    'The column has turned, but no light passes here yet. Turn the lantern on with F.'),
  entry('l8.action.column.shadowed', 'Bóng đã phủ phiến Nguyệt. Ánh sáng không tới được nữa.',
    'Shadow now covers the Moon slab. The light no longer reaches it.'),
  entry('l8.action.column.lit', 'Mặt hẹp của cột để ánh sáng lọt qua. Phiến Nguyệt lại sáng.',
    "The column's narrow face lets the light through. The Moon slab is lit again."),

  entry('l8.action.statue.latched', 'Vòng trên bệ đã giữ. Mình không cần xoay tượng nữa.',
    'The ring on the pedestal is holding. I do not need to turn the statue any more.'),
  entry('l8.action.statue.covered', 'Bóng của tượng phủ trọn khóa Nguyệt.',
    "The statue's shadow covers the Moon Lock completely."),
  entry('l8.action.statue.aside', 'Bóng nghiêng đi. Khóa Nguyệt vẫn nằm ngoài vùng tối.',
    'The shadow falls aside. The Moon Lock is still outside the dark.'),

  entry('l8.action.mirror.latched', 'Vòng trên bệ đã giữ. Hai gương đang đúng hướng, mình để nguyên vậy.',
    'The ring on the pedestal is holding. Both mirrors are aimed right, so I will leave them.'),

  entry('l8.action.pedestal.recoverLamp', 'Đèn đã về tay. Tới The Shadow thôi.',
    'The lantern is back in hand. Time to see The Shadow.'),
  entry('l8.action.pedestal.lampInHand', 'Điện thờ đã gài. Đèn ở trong tay rồi, mình tới The Shadow.',
    'The sanctuary is latched. The lantern is in hand, so I will go to The Shadow.'),
  entry('l8.action.pedestal.noLamp', 'Đèn không nằm trong tay. Mình cần tìm lại nó.',
    'The lantern is not in my hand. I need to find it again.'),
  entry('l8.action.pedestal.splitter', 'Bộ chia tia đã hiện đường nhánh. Hai nhánh bên đi qua hai gương.',
    'The splitter has shown its branch lines. The two side branches run through the two mirrors.'),

  entry('l8.action.bed.curtainShut', 'Màn đá đã che kín luống mầm. Bên trong chỉ còn một khoảng tối dịu.',
    'The stone screen has closed over the seed bed. Inside there is only a soft patch of dark.'),

  entry('l8.action.shadow.alreadyMet', 'Đừng chỉ nghe điều ta còn có thể nói. Hãy đọc bản ghi trên đài nhìn trăng.',
    'Do not listen only to what I can still say. Read the record on the moon-watching platform.'),
  entry('l8.action.shadow.notLatched', 'Hạ ánh sáng xuống. Điện thờ còn khóa, và luống mầm vẫn chờ một khoảng tối.',
    'Lower your light. The sanctuary is still locked, and the seed bed still waits for a patch of dark.'),
  entry('l8.action.shadow.lampFirst', 'Mình phải thu hồi đèn ở bệ chính trước đã.',
    'I must take the lantern back from the main pedestal first.'),

  entry('l8.action.exit.needsPlace', 'Cửa Bắc còn khóa. Bệ chính đang trống: đứng ở mép nam bệ và nhấn E để đặt đèn lên.',
    'The north door is still locked. The main pedestal is empty: stand at its south edge and press E to set the lantern down.'),
  entry('l8.action.exit.needsSuns', 'Cửa Bắc còn khóa. Hai khóa Nhật chưa cùng sáng: xoay các gương (E ở mép nam từng gương).',
    'The north door is still locked. The two Sun Locks are not both lit: turn the mirrors (E at the south edge of each).'),
  entry('l8.action.exit.needsMoon', 'Cửa Bắc còn khóa. Khóa Nguyệt chưa nằm trong bóng: xoay tượng giữa sân (E ở mép nam tượng).',
    'The north door is still locked. The Moon Lock is not in shadow yet: turn the statue in the courtyard (E at its south edge).'),
  entry('l8.action.exit.readyToLatch', 'Mọi khóa đã đúng. Nhấn E ở mép nam bệ chính để gài điện thờ.',
    'Every lock is set. Press E at the south edge of the main pedestal to latch the sanctuary.'),
  entry('l8.action.exit.needsLamp', 'Đèn vẫn nằm trên bệ chính. Đứng ở mép nam bệ và nhấn E để thu hồi trước khi lên cầu thang.',
    'The lantern is still on the main pedestal. Stand at its south edge and press E to take it back before climbing the stair.'),
  entry('l8.action.exit.needsShadow', 'The Shadow đang đứng cạnh luống mầm, phía tây bắc sân. Mình nhấn E để nói chuyện với ông trước.',
    "The Shadow is standing beside the seed bed, north-west of the courtyard. I will press E to talk to him first."),

  /* ------------------------------------------------------------ Ruins — live story beats */
  entry('l8.beat.practice.1', 'Không cần tắt cả chiếc đèn. Chỉ cần che đúng chỗ.',
    'No need to put the lantern out. Just to shield the right spot.'),
  entry('l8.beat.practice.2', 'Phía ngoài vẫn sáng, còn sau cột thì tối.',
    'Outside stays bright, and behind the column it is dark.'),
  entry('l8.beat.twoSuns.1', 'Hai bên đã đáp lại. Khóa giữa vẫn im.',
    'Both sides answered. The middle lock is still silent.'),
  entry('l8.beat.twoSuns.2', 'Ánh từ bệ vẫn rọi vào nó. Bức tượng có thể chắn luồng giữa.',
    'Light from the pedestal still falls on it. The statue could block the centre flow.'),
  entry('l8.beat.shadow.1', 'Giữ khoảng tối ấy.', 'Keep that patch of dark.'),
  entry('l8.beat.shadow.2', 'Tôi thấy rồi. Hai nửa có thể cùng tồn tại.',
    'I see it now. Two halves can exist together.'),

  /* ------------------------------------------------------------ Ruins — objective line */
  entry('l8.objective.practice', 'Thử ở tiền sảnh: bật đèn, xoay cột đá cho bóng phủ phiến Nguyệt.',
    'Try it in the entrance hall: turn the lantern on, then turn the column so its shadow covers the Moon slab.'),
  entry('l8.objective.place', 'Đặt đèn lên bệ chính ở phía đông nam sân.',
    'Set the lantern on the main pedestal in the south-east of the courtyard.'),
  entry('l8.objective.sunsDark', 'Đặt đèn đang bật lên bệ chính.',
    'Set the lit lantern on the main pedestal.'),
  entry('l8.objective.sunsNone', 'Xoay hai gương bên để tia sáng chiếu vào hai khóa Nhật.',
    'Turn the two side mirrors so the beam strikes both Sun Locks.'),
  entry('l8.objective.sunsOne', 'Một khóa Nhật đã sáng. Xoay gương còn lại cho tia bật lên khóa kia.',
    'One Sun Lock is lit. Turn the other mirror so its beam strikes the other lock.'),
  entry('l8.objective.moon', 'Xoay tượng giữa sân cho bóng phủ khóa Nguyệt.',
    'Turn the statue in the courtyard so its shadow covers the Moon Lock.'),
  entry('l8.objective.confirm', 'Điều kiện đã đủ. Nhấn E ở bệ chính để gài điện thờ.',
    'The conditions are met. Press E at the main pedestal to latch the sanctuary.'),
  entry('l8.objective.retrieve', 'Thu hồi đèn ở bệ chính.', 'Take the lantern back from the main pedestal.'),
  entry('l8.objective.shadow', 'Tới The Shadow ở phía đông bắc và nhấn E.',
    'Go to The Shadow in the north-east and press E.'),
  entry('l8.objective.exit', 'Tới cửa Bắc và nhấn E để đi tiếp.', 'Go to the north door and press E to go on.'),

  /* ------------------------------------------------------------ Ruins — journal */
  // The shared journal opener (`Sổ tay giữ …`) and its empty fallback (`Chưa ghi thêm …`) appear
  // in several levels; each is catalogued once, under the level-04 journal block, and this key
  // serves the Ruins too.
  entry('l8.journal.light', 'Một vật chắn sáng tạo ra một vùng tối. Mặt rộng của cột chắn, mặt hẹp thì không.',
    "Something that blocks light makes a patch of dark. The column's wide face blocks it; the narrow face does not."),
  entry('l8.journal.twoSuns', 'Hai khóa Nhật sáng cùng lúc vẫn chưa đủ. Khóa Nguyệt cần ở trong bóng.',
    'Both Sun Locks lit at once is still not enough. The Moon Lock must be in shadow.'),
  entry('l8.journal.shadow', 'Bóng đổ có thể bảo vệ một vùng. Ba khóa phải đúng cùng một lúc.',
    'A cast shadow can shelter a patch. All three locks must be right at the same time.'),
  entry('l8.journal.spiral', 'Dấu vòng xoắn trên cửa Bắc giống dấu ở đường hầm dẫn nước.',
    'The spiral mark on the north door is the same as the one in the water tunnel.'),

  /* ------------------------------------------------------------ Heart — opening */
  entry('l9.openingHeart.1', 'Trước đây tôi nghĩ chỉ cần đặt đủ tinh thể rồi thắp tất cả lên.',
    'I used to think we just had to set all the crystals and light them all up.'),
  entry('l9.openingHeart.2', 'Giờ mình biết Cây Mẹ còn cần điều gì nữa.',
    'Now I know what else the Mother Tree needs.'),
  entry('l9.opening.3', 'Nước, ký ức… và một đêm được đi hết.',
    'Water, memory… and a night allowed to finish.'),
  entry('l9.opening.4', 'Mình bắt đầu từ ba mạch rễ.', 'I will start with the three root channels.'),

  /* ------------------------------------------------------------ Heart — placements and rules */
  entry('l9.placed.1', 'Các mạch đã nhận tinh thể. Nhưng chúng chưa nối thành vòng.',
    'The channels have taken the crystals. But they are not joined into a ring yet.'),
  entry('l9.placed.2', 'Tôi thấy ấn của mình ở phía Hy Vọng. Cậu chỉnh đường sáng, tôi giữ phần đó.',
    "I can see my seal on the Hope side. You adjust the light path; I'll hold that part."),

  entry('l9.teach.1', 'Các dấu giống những nơi mình vừa đi qua.',
    'These marks are like the places we just came through.'),
  entry('l9.teach.2', 'Khu rừng đã cho mình học từng phần trước khi trở về đây.',
    'The forest let us learn it piece by piece before we came back here.'),

  /* ------------------------------------------------------------ Heart — branch state beats */
  entry('l9.stable.1', 'Ba màu đã nối thành một vòng!', 'The three colours have joined into one ring!'),
  entry('l9.stable.2', 'Tôi sẽ khóa đường rễ. Cậu giữ ở đó thêm một chút.',
    'I will lock the root path. Hold there a moment longer.'),
  entry('l9.dropped.1', 'Có một mạch vừa ngừng. Tôi vẫn đang giữ ấn.',
    "One channel just stopped. I'm still holding the seal."),
  entry('l9.dropped.2', 'Đường sáng chung đã đổi. Tôi sẽ xem lại từ lăng kính.',
    'The shared light path has changed. I will check again from the prism.'),

  /* ------------------------------------------------------------ Heart — latched and overload */
  entry('l9.latched.1', 'Rễ đã tự giữ rồi. Lumo, về đây.',
    'The roots are holding by themselves. Lumo, come back here.'),
  entry('l9.latched.2', 'Cậu nghe không? Nó đang thở.', "Can you hear that? It's breathing."),

  entry('l9.overload.1', 'Đèn trên tay vẫn đang cấp thêm ánh sáng.',
    'The lantern in hand is still feeding in more light.'),
  entry('l9.overload.2', 'Giống đêm ấy…', 'Like that night…'),
  entry('l9.overload.3', 'Cây Mẹ đã có đủ rồi.', 'The Mother Tree has enough now.'),

  /* ------------------------------------------------------------ Heart — rule models */
  entry('l9.model.1', 'Mô hình gương: một mạch chỉ sáng khi tia từ bệ đèn đi đúng tới tinh thể.',
    'Mirror model: a channel lights only when the beam from the lamp stand reaches the crystal.'),
  entry('l9.model.2', 'Mô hình chiếc ấn: màn Hy Vọng chỉ mở khi Lumo còn đang đứng giữ.',
    'Seal model: the Hope curtain opens only while Lumo still stands and holds.'),
  entry('l9.model.3', 'Mô hình lõi Nguyệt: hai mắt Nhật ngoài phải sáng, còn lõi giữa phải nằm trong bóng tượng.',
    "Moon core model: the two outer Sun eyes must be lit, and the middle core must lie in the statue's shadow."),
  entry('l9.model.4', 'Mô hình bộ chia: lăng kính gửi một nhánh sang Ký Ức và một nhánh sang Cân Bằng.',
    'Splitter model: the prism sends one branch to Memory and one branch to Balance.'),

  /* ------------------------------------------------------------ Heart — Pulse toast */
  entry('l9.toast.lanes', 'Pulse làm các đường nối bị rêu che hiện ra. Thông tin đã được ghi vào sổ.',
    'Pulse reveals the moss-covered connections. The information has been written into the journal.'),

  /* ------------------------------------------------------------ Heart — hint ladders */
  entry('l9.hint.puzzle.1', 'Xem đường nối từ bệ và dấu sáng trên cả ba nhánh. Nhánh nào chưa giữ được trạng thái?',
    'Look at the links from the pedestal and the lit marks on all three branches. Which branch is not holding its state?'),
  entry('l9.hint.puzzle.2', 'Lăng kính phải cấp cả Ký Ức lẫn Cân Bằng. Tôi mở màn Hy Vọng; bóng tượng giữ lõi giữa tối.',
    "The prism must feed both Memory and Balance. I open the Hope curtain; the statue's shadow keeps the middle core dark."),
  entry('l9.hint.puzzle.3', 'Gọi tôi tới ấn, hướng G0 vào lăng kính, chỉnh nhánh vàng tới tinh thể và nhánh tím qua tượng. Khi hai mắt ngoài sáng, lõi tối và ba rễ nối đều, xác nhận ở giữa.',
    'Call me to the seal, aim G0 into the prism, set the gold branch to the crystal and the purple branch past the statue. When both outer eyes are lit, the core is dark and all three roots connect, confirm in the middle.'),

  entry('l9.hint.crystals.1', 'Ba hốc nằm quanh thân Cây Mẹ: bên trái, chính giữa và bên phải.',
    "Three sockets ring the Mother Tree's trunk: left, centre and right."),
  entry('l9.hint.crystals.2', 'Đứng trên từng hốc có biểu tượng tinh thể rồi nhấn E.',
    'Stand on each socket marked with a crystal symbol, then press E.'),
  entry('l9.hint.crystals.3', 'Đặt Ký Ức vào hốc vàng, Hy Vọng vào hốc xanh, Cân Bằng vào hốc tím.',
    'Place Memory in the gold socket, Hope in the blue one and Balance in the purple one.'),

  entry('l9.hint.teach.1', 'Có một bàn rễ thấp cạnh bệ đèn ở phía tây.',
    'There is a low root table beside the lamp stand to the west.'),
  entry('l9.hint.teach.2', 'Nhấn E trên bàn rễ để xem lại từng mô hình quy tắc. SPACE gần đó sẽ soi các đường nối.',
    'Press E at the root table to review each rule model. SPACE nearby will light up the connections.'),
  entry('l9.hint.teach.3', 'Ba quy tắc: một mạch nhận ánh sáng, một ấn do Lumo giữ, hai mắt Nhật quanh một lõi Nguyệt cần bóng.',
    'Three rules: a channel takes light, a seal held by Lumo, and two Sun eyes around a Moon core that needs shadow.'),

  entry('l9.hint.retrieve.1', 'Cây Mẹ đã tự giữ mạch. Chiếc đèn không cần ở lại nữa.',
    'The Mother Tree holds the channel itself. The lantern does not need to stay.'),
  entry('l9.hint.retrieve.2', 'Bệ dẫn sáng vẫn giữ chiếc đèn ở góc tây.',
    'The light pedestal still holds the lantern in the west corner.'),
  entry('l9.hint.retrieve.3', 'Đứng ở mép nam bệ và nhấn E để lấy lại đèn.',
    'Stand at the south edge of the pedestal and press E to take the lantern back.'),

  entry('l9.hint.overload.1', 'Nhìn chiếc đèn và đường sáng còn nối từ tay cậu vào thân cây.',
    'Look at the lantern and the line of light still running from your hand into the trunk.'),
  entry('l9.hint.overload.2', 'Tinh thể đã tự nuôi mạch rễ. Ánh đèn đang làm nó nhận quá nhiều.',
    "The crystals feed the root channel themselves now. The lantern's light is making it take too much."),
  entry('l9.hint.overload.3', 'Nhấn F để tự tay tắt đèn.', 'Press F to put the lantern out yourself.'),

  entry('l9.hint.done.1', 'Đêm đã đi hết con đường của nó.', 'The night has walked its whole road.'),
  entry('l9.hint.done.2', 'Bình minh đang trở lại trên khu rừng.', 'Dawn is coming back over the forest.'),
  entry('l9.hint.done.3', 'Nhấn E để đi tiếp đoạn kết.', 'Press E to go on to the ending.'),

  /* ------------------------------------------------------------ Heart — objective line */
  entry('l9.objective.teach', 'Đọc bàn rễ cạnh bệ đèn để nhắc lại ba quy tắc.',
    'Read the root table beside the lamp stand to review the three rules.'),
  entry('l9.objective.source', 'Đặt chiếc đèn đang bật lên bệ dẫn sáng ở phía tây.',
    'Set the lit lantern on the light pedestal to the west.'),
  entry('l9.objective.sealWait', 'Chờ Lumo tới ấn Hy Vọng và đứng giữ.',
    'Wait for Lumo to reach the Hope seal and hold it.'),
  entry('l9.objective.sealCall', 'Gọi Lumo tới ấn Hy Vọng rồi để cậu ấy giữ.',
    'Call Lumo to the Hope seal, then let him hold it.'),
  entry('l9.objective.routeReady', 'Ba nhánh đã sẵn sàng. Tới nút rễ trung tâm ở giữa nền đất.',
    'All three branches are ready. Go to the central root node in the middle of the ground.'),
  entry('l9.objective.confirm', 'Nhấn E ở nút rễ trung tâm để khóa cấu hình ba nhánh.',
    'Press E at the central root node to lock the three-branch configuration.'),
  entry('l9.objective.retrieve', 'Lấy lại chiếc đèn ở bệ dẫn sáng.',
    'Take the lantern back from the light pedestal.'),
  entry('l9.objective.overload', 'Nhấn F để tắt đèn — nguồn sáng đang quá tải.',
    'Press F to put the lantern out — the light source is overloading.'),
  entry('l9.objective.done', 'Đêm đã đi hết. Nhấn E để đi tiếp đoạn kết.',
    'The night is over. Press E to go on to the ending.'),

  /* ------------------------------------------------------------ Heart — interaction prompts */
  entry('l9.prompt.sealHeld', 'Ấn Hy Vọng đã được chốt rễ giữ',
    'The Hope seal is held by the root latch'),
  entry('l9.prompt.sealCall', 'E · Gọi Lumo tới ấn Hy Vọng', 'E · Call Lumo to the Hope seal'),
  entry('l9.prompt.sealRecall', 'E · Gọi Lumo về bên cạnh', 'E · Call Lumo back to your side'),

  entry('l9.prompt.eyeLeft', 'E · Kiểm tra mắt nắng trái', 'E · Check the left sun eye'),
  entry('l9.prompt.eyeRight', 'E · Kiểm tra mắt nắng phải', 'E · Check the right sun eye'),
  entry('l9.prompt.moonCore', 'E · Kiểm tra lõi Nguyệt', 'E · Check the Moon core'),

  entry('l9.prompt.rootsHeld', 'Rễ đã giữ cấu hình', 'The roots hold the configuration'),
  entry('l9.prompt.rootsLock', 'E · Khóa vòng rễ', 'E · Lock the root ring'),
  entry('l9.prompt.rootsCheck', 'E · Kiểm tra vòng rễ', 'E · Check the root ring'),

  entry('l9.prompt.pedestalTake', 'E · Lấy đèn về tay', 'E · Take the lantern back in hand'),
  entry('l9.prompt.pedestalOccupied', 'Đèn đang ở trên bệ', 'The lantern is on the pedestal'),
  entry('l9.prompt.pedestalPlace', 'E · Đặt đèn lên bệ dẫn sáng', 'E · Set the lantern on the light pedestal'),

  entry('l9.prompt.g0Clipped', 'E · Xem G0 (đã chốt rễ)', 'E · Inspect G0 (root-latched)'),
  entry('l9.prompt.memoryMirrorClipped', 'E · Xem gương Ký Ức (đã chốt rễ)',
    'E · Inspect the Memory mirror (root-latched)'),
  entry('l9.prompt.balanceMirrorClipped', 'E · Xem gương Cân Bằng (đã chốt rễ)',
    'E · Inspect the Balance mirror (root-latched)'),
  entry('l9.prompt.statueClipped', 'E · Xem tượng (đã chốt rễ)', 'E · Inspect the statue (root-latched)'),

  /* ------------------------------------------------------------ Heart — control replies */
  entry('l9.action.socket.memory', 'Hốc Ký Ức đã khớp. Màu vàng đang chảy dọc theo rễ.',
    'The Memory socket is seated. Gold is running along the root.'),
  entry('l9.action.socket.hope', 'Hốc Hy Vọng đã khớp. Nhánh xanh đang giữ nhịp đều.',
    'The Hope socket is seated. The blue branch holds a steady beat.'),
  entry('l9.action.socket.balance', 'Hốc Cân Bằng đã khớp. Nhánh tím vẫn chờ bóng tượng.',
    "The Balance socket is seated. The purple branch still waits for the statue's shadow."),
  entry('l9.action.socket.placed', 'Tinh thể đã vào hốc. Màu chạy dọc rễ rồi dừng trước đoạn đứt.',
    'The crystal is in its socket. Colour runs along the root and stops at the break.'),

  entry('l9.action.seal.latched', 'Ấn Hy Vọng đã nằm trong cấu hình được chốt rễ giữ.',
    'The Hope seal is part of the configuration the root latch holds.'),

  entry('l9.action.moonCore.covered', 'Lõi Nguyệt đang nằm trong bóng tượng.',
    "The Moon core lies in the statue's shadow."),

  /* ------------------------------------------------------------ Heart — check replies with a runtime value */
  entry('l9.action.eye.lit', 'Mắt nắng {side} đang nhận tia sáng.',
    'The {side} sun eye is taking the beam.'),
  entry('l9.action.eye.reason.light', 'đèn chưa ở trên bệ hoặc đang tắt',
    'the lantern is not on the pedestal or is out'),
  entry('l9.action.eye.reason.splitter', 'bộ chia chưa nhận được tia từ G0 và gương Cân Bằng',
    'the splitter is not receiving a beam from G0 and the Balance mirror'),
  entry('l9.action.eye.reason.statue', 'tượng đang chắn ngay trước mắt này',
    'the statue is standing right in front of this eye'),
  entry('l9.action.eye.dark', 'Mắt nắng {side} vẫn tối: còn {reasons}.',
    'The {side} sun eye is still dark: {reasons}.'),
  entry('l9.action.moon.reason.splitter', 'nhánh Cân Bằng chưa nhận được tia từ bộ chia',
    'the Balance branch is not receiving a beam from the splitter'),
  entry('l9.action.moon.reason.statue', 'tượng chưa xoay cho bóng phủ lên hốc',
    'the statue is not turned so its shadow covers the socket'),
  entry('l9.action.moon.dark', 'Lõi Nguyệt vẫn còn sáng: còn {reasons}.',
    'The Moon core is still lit: {reasons}.'),

  entry('l9.action.confirm.latched', 'Chốt rễ đã giữ cấu hình. Cây Mẹ đang tự nuôi mạch.',
    'The root latch holds the configuration. The Mother Tree feeds the channel itself now.'),
  entry('l9.action.confirm.notHolding', 'Ba nhánh chưa cùng giữ được cấu hình.',
    'The three branches are not all holding the configuration.'),

  entry('l9.action.pedestal.stays', 'Đèn phải ở lại bệ cho tới khi ba nhánh giữ được cấu hình.',
    'The lantern must stay on the pedestal until the three branches hold the configuration.'),
  entry('l9.action.pedestal.lightPlaced', 'Ánh sáng đã được đặt ở tâm dẫn.',
    'The light has been placed at the centre of the channel.'),

  entry('l9.action.g0.latched', 'G0 đang bị chốt rễ giữ. Cấu hình không đổi nữa.',
    'G0 is held by the root latch. The configuration does not change any more.'),
  entry('l9.action.g0.prism', 'G0 hướng vào lăng kính: tia được chia sang cả hai nhánh.',
    'G0 faces the prism: the beam is split to both branches.'),
  entry('l9.action.g0.memory', 'G0 chiếu thẳng tới Ký Ức: chỉ nhánh vàng nhận được tia.',
    'G0 shines straight at Memory: only the gold branch receives the beam.'),

  entry('l9.action.config.latched', 'Cấu hình đã được chốt rễ giữ.',
    'The configuration is held by the root latch.'),

  entry('l9.action.statue.moon', 'Bóng tượng đang phủ lên hốc Nguyệt.',
    "The statue's shadow covers the Moon socket."),
  entry('l9.action.statue.leftEye', 'Tượng đang chắn mắt nắng trái.',
    'The statue is blocking the left sun eye.'),
  entry('l9.action.statue.rightEye', 'Tượng đang chắn mắt nắng phải.',
    'The statue is blocking the right sun eye.'),
  entry('l9.action.statue.aside', 'Bóng tượng đã rời khỏi hốc Nguyệt.',
    "The statue's shadow has left the Moon socket."),

  entry('l9.action.key.pedestalHint', 'Đứng ở mép nam bệ đèn rồi nhấn F để tắt đèn.',
    'Stand at the south edge of the lamp stand, then press F to put the lantern out.'),
  entry('l9.action.key.pedestalStays', 'Đèn phải ở lại bệ cho tới khi ba nhánh giữ được cấu hình. Cậu giữ Lumo ở ấn nhé.',
    'The lantern has to stay on the pedestal until the three branches hold the configuration. Keep Lumo at the seal.'),

  entry('l9.action.lumo.arrived', 'Tôi tới rồi. Ấn này giữ được.', "I'm here. This seal holds."),
  entry('l9.action.lumo.stay', 'Cậu đứng yên ở đó nhé. Mình sẽ điều chỉnh đường sáng.',
    'Stay right there. I will adjust the light path.'),
  entry('l9.action.lumo.recall', 'Lumo, về đây với mình một chút.',
    'Lumo, come back here with me a moment.'),
  // His answer, `Tôi về ngay.`, is the same sentence the level-04 recall uses; it is catalogued
  // once, under `l4.recall.2`.
  entry('l9.action.lumo.called', 'Lumo, tới ấn Hy Vọng giữ giúp mình nhé.',
    'Lumo, go to the Hope seal and hold it for me.'),
  entry('l9.action.lumo.sealHere', 'Tôi thấy ấn của mình ở đây. Cậu chỉnh đường sáng, tôi giữ phần này.',
    "I can see my seal here. You adjust the light path; I'll hold this part."),

  /* ------------------------------------------------------------ Heart — HUD status */
  entry('l9.hud.lumo.holding', 'LUMO · đang giữ ấn Hy Vọng', 'LUMO · holding the Hope seal'),
  entry('l9.hud.lumo.travelling', 'LUMO · đang tới ấn', 'LUMO · on the way to the seal'),
  entry('l9.hud.lumo.follow', 'LUMO · E gọi tới ấn', 'LUMO · E to call to the seal'),

  /* ------------------------------------------------------------ Heart — journal */
  entry('l9.journal.rules', 'Bàn rễ nhắc lại: một mạch nhận ánh sáng, một ấn do Lumo giữ, hai mắt Nhật quanh một lõi Nguyệt cần bóng.',
    'The root table recalls: a channel takes light, a seal held by Lumo, and two Sun eyes around a Moon core that needs shadow.'),
  entry('l9.journal.lanes', 'Pulse soi được các đường nối bị rêu che giữa ba hốc và tâm rễ.',
    'Pulse lights up the moss-covered connections between the three sockets and the root heart.'),
  entry('l9.journal.latched', 'Chốt rễ đang tự giữ cấu hình, nên Lumo không cần đứng ở ấn nữa.',
    'The root latch holds the configuration itself, so Lumo no longer needs to stand at the seal.'),
  entry('l9.journal.carried', 'Đèn đã trở về tay Nhinh và vẫn đang cấp thêm ánh sáng.',
    "The lantern is back in Nhinh's hand and still feeding in more light."),
  entry('l9.journal.empty', 'Sổ tay còn trống. Ba hốc quanh Cây Mẹ vẫn đang chờ tinh thể.',
    'The journal is still empty. The three sockets around the Mother Tree are still waiting for crystals.'),

  /* ------------------------------------------------------------ Observatory — entrance and corridor */
  entry('l8obs.openingEntrance.1', 'Tôi biết tiếng bánh xe này.', 'I know the sound of this wheel.'),
  entry('l8obs.openingEntrance.2', 'Nó vẫn quay à?', 'Is it still turning?'),
  entry('l8obs.openingEntrance.3', 'Không. Tôi nhớ tiếng nó từng quay.', 'No. I remember the sound of it turning, long ago.'),

  entry('l8obs.openingCorridor.1', 'Chính đường này. Tôi đã bay từ trạm nước lên đây.',
    'This is the way. I flew up here from the water station.'),
  entry('l8obs.openingCorridor.2', 'Mình có thể đi chậm lại.', 'We can slow down.'),
  entry('l8obs.openingCorridor.3', 'Tôi muốn biết mình đã làm gì. Nhưng cậu ở gần nhé.',
    'I want to know what I did. But stay close, all right?'),
  entry('l8obs.openingCorridor.4', 'Tôi ở đây.', 'I am here.'),

  /* ------------------------------------------------------------ Observatory — live beats */
  entry('l8obs.rootsLit.1', 'Cửa đã mở. Ánh sáng lại đang phủ lên rễ.',
    'The door is open. And the light is falling on the roots again.'),
  entry('l8obs.rootsLit.2', 'Có đường qua khung tượng. Ở điện thờ mình từng giữ được một vùng tối như thế.',
    "There's a way through the statue's frame. At the sanctuary we once kept a patch of dark like that."),

  entry('l8obs.noBeam.1', 'Tôi vẫn giữ ấn. Đường sáng từ tiền sảnh đang hướng đi chỗ khác.',
    "I'm still holding the seal. The light path from the entrance hall is aimed somewhere else."),

  /* ------------------------------------------------------------ Observatory — the recording */
  entry('l8obs.recording.1', 'Bão đã tan. Họ bảo tôi để bánh xe ngày đêm chạy lại.',
    'The storm has passed. They told me to let the day-and-night wheel run again.'),
  entry('l8obs.recording.2', 'Nhưng nếu đèn tắt đúng lúc con tìm được đường thì sao?',
    'But what if the lantern goes out just as you find the way?'),
  entry('l8obs.recording.3', 'Lumo, bay qua đường ống. Giữ mạch phía Bắc cho tôi. Chỉ thêm một đêm nữa.',
    'Lumo, fly through the duct. Hold the northern channel for me. Just one more night.'),
  entry('l8obs.recording.4', 'Tôi giữ được. Ông cứ chờ ở cửa sổ.',
    'I can hold it. You wait at the window.'),

  /* ------------------------------------------------------------ Observatory — captions */
  entry('l8obs.caption.memory',
    'Bánh xe bị chặn. Những tia sáng dồn về Cây Mẹ; dòng nước cạn dần. Một vết nứt chạy qua ba mạch rễ. Ánh trắng bùng lên, xóa phần cuối bản ghi.',
    'The wheel is blocked. The beams gather on the Mother Tree; the water runs low. A crack runs through the three root channels. White light flares and erases the end of the record.'),
  entry('l8obs.caption.merge',
    'The Shadow bước vào vị trí Người Bảo Vệ vừa đứng. Hai hình chồng lên nhau rồi ký ức tan đi.',
    'The Shadow steps into the place where the Guardian had just stood. The two figures overlap, and then the memory dissolves.'),

  /* ------------------------------------------------------------ Observatory — what Lumo remembers */
  entry('l8obs.memoryLumo.1', 'Tôi đã giữ ấn.', 'I held the seal.'),
  entry('l8obs.memoryLumo.2', 'Tôi tưởng mình đang giúp ông ấy đưa mọi người về.',
    'I thought I was helping him bring everyone home.'),
  entry('l8obs.memoryLumo.3', 'Cậu nhớ lại rồi.', 'You remember now.'),
  entry('l8obs.memoryLumo.4', 'Khi Cây Mẹ vỡ, mọi thứ trong đầu tôi cũng vỡ theo. Nhưng tôi vẫn nhớ rằng phải giữ đèn sáng.',
    'When the Mother Tree broke, everything in my head broke with it. But I still remembered that I had to keep the lantern lit.'),

  /* ------------------------------------------------------------ Observatory — the Shadow answers */
  entry('l8obs.memoryShadow.1', 'Ông là Người Bảo Vệ.', 'You are the Guardian.'),
  entry('l8obs.memoryShadow.2', 'Ta là phần ký ức còn mắc lại trong đêm ấy. Ta đã đợi lâu đến mức quên cả việc cho khu rừng nghỉ.',
    'I am the part of the memory still caught in that night. I have waited so long that I forgot to let the forest rest.'),
  entry('l8obs.memoryShadow.3', 'Và tôi đã giúp ông. Nếu tôi làm sai lần nữa thì sao?',
    'And I helped you. What if I get it wrong again?'),
  entry('l8obs.memoryShadow.4', 'Ở khu vườn, cậu đã giúp tôi tắt đèn. Ở điện thờ, cậu đã giữ bóng cho những mầm cây.',
    'In the garden, you helped me put the lantern out. At the sanctuary, you kept the shadow over the seedlings.'),
  entry('l8obs.memoryShadow.5', 'Lần này mình biết nhiều hơn. Mình cũng có thể dừng lại khi thấy điều gì không đúng.',
    'This time I know more. I can also stop when something is wrong.'),
  entry('l8obs.memoryShadow.6', 'Ta muốn dẫn một người về nhà. Rồi giữ cả khu rừng ở lại cùng nỗi chờ của mình.',
    'I wanted to lead one person home. And I kept the whole forest here with my waiting.'),
  entry('l8obs.memoryShadow.7', 'Con gái ông đã trở về chưa?', 'Has your daughter come back yet?'),
  entry('l8obs.memoryShadow.8', 'Phần ký ức này không có câu trả lời đó.',
    'This part of the memory does not hold that answer.'),

  /* ------------------------------------------------------------ Observatory — the crystal and the exit */
  entry('l8obs.crystal.1', 'Hãy đưa vòng ngày đêm đi tiếp. Khi tới lúc buông tay, đừng để nỗi sợ giữ tay con lại.',
    'Carry the day-and-night wheel onward. When the moment comes to let go, do not let fear hold your hand back.'),
  entry('l8obs.crystal.2', 'Ông có đi cùng chúng tôi không?', 'Are you coming with us?'),
  entry('l8obs.crystal.3', 'Ta sẽ ở lại tới khi đêm này kết thúc.', 'I shall stay until this night ends.'),

  entry('l8obs.exit.1', 'Tôi vẫn sợ.', "I'm still afraid."),
  entry('l8obs.exit.2', 'Cậu cứ nói khi sợ. Mình sẽ cùng nhìn lại đường đi.',
    'Say it whenever you are afraid. We will look back over the road together.'),
  entry('l8obs.exit.3', 'Vậy… mình về Cây Mẹ thôi.', "Then… let's go home to the Mother Tree."),
];

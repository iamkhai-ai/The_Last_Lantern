/**
 * The eleven narrated pages shown before a new game enters the workshop.
 *
 * Pure data: no Phaser, no asset imports. `key` is the texture key the illustration loader builds
 * (`src/v4/scene/illustrationFiles.ts`: `ill_` plus the file name without the extension), and `caption` is the
 * Vietnamese narration, which is also the i18n catalog key for the English line
 * (`src/i18n/entries/workshop.ts`, `v4.workshop.intro01`…`intro11`).
 *
 * Art and text come from `assets/prologue/opening-narrative-v1/production-plan.json` (pages[].file/.vi); the pictures
 * themselves live in `assets/levels/00-workshop/illustrations/intro-NN-*.png`. Nothing here may spoil later levels:
 * the Guardian is only a story the children of the harbour grow up with.
 */
export interface OpeningPage {
  /** Illustration texture key (`ill_` plus the file name, see illustrationFiles.ts). */
  readonly key: string;
  /** Narration under the picture: Vietnamese, and the catalog lookup key for the English line. */
  readonly caption: string;
}

export const OPENING_PAGES: readonly OpeningPage[] = [
  {
    key: 'ill_intro-01-town',
    caption: 'Bến Sương là một thị trấn nhỏ bên sông, có bến thuyền, chợ sớm, những xưởng sửa chữa và các ngôi nhà dựng sát mép nước.',
  },
  {
    key: 'ill_intro-02-night-lights',
    caption: 'Ban ngày, nơi này khá bình thường. Khi đêm xuống và sương phủ mặt sông, dãy đèn dọc bờ dẫn thuyền về bến; cũng nguồn ấy giữ cho các trạm bơm chạy.',
  },
  {
    key: 'ill_intro-03-elaria-source',
    caption: 'Nguồn sáng ấy không sinh ra ở Bến Sương. Nó đi xuống từ Elaria, khu rừng ở đầu nguồn, qua những tuyến dẫn và các trạm bảo trì dọc đường.',
  },
  {
    key: 'ill_intro-04-stored-sunlight',
    caption: 'Người dân được dạy rằng rừng Elaria có thể tích ánh mặt trời rồi chia một phần cho con người. Nhờ nguồn sáng ấy, đèn ở bến vẫn sáng khi đêm xuống.',
  },
  {
    key: 'ill_intro-05-storm-rescue',
    caption: 'Trẻ con ở bến lớn lên cùng câu chuyện về Người Bảo Vệ: trong một trận bão lớn năm xưa, ông đã thắp sáng dòng sông và cứu hàng trăm người.',
  },
  {
    key: 'ill_intro-06-failing-lights',
    caption: 'Nhưng nhiều năm gần đây, những đợt mất sáng đến thường hơn. Nước ở trạm bơm yếu đi, thuyền phải chờ ngoài bến, còn thợ sửa mãi chưa tìm ra nguyên nhân.',
  },
  {
    key: 'ill_intro-07-home-workshop',
    caption: 'Mẹ của Nhinh lo bảo trì các trạm quanh bến. Hai mẹ con sống ở tầng trên xưởng sửa đèn, giữa những hộp linh kiện và tiếng khách gọi cửa.',
  },
  {
    key: 'ill_intro-08-mothers-lesson',
    caption: 'Từ nhỏ, Nhinh đã quen nghe mẹ nói: “Ngoài kia còn người đợi đèn để về.” Với mẹ, sửa một chiếc đèn cũng là giúp ai đó trở về an toàn.',
  },
  {
    key: 'ill_intro-09-apprentice',
    caption: 'Giờ Nhinh chừng mười bảy tuổi, đang học nghề của mẹ. Cô khéo tay, tò mò, hơi nóng vội, và hay giữ đồ hỏng vì tin rằng mình sẽ sửa được.',
  },
  {
    key: 'ill_intro-10-earned-trust',
    caption: 'Điều cô mong rất đời thường: được mẹ tin giao một việc lớn, được người trong thị trấn nhìn nhận như một người thợ thực thụ.',
  },
  {
    key: 'ill_intro-11-boatmans-visit',
    caption: 'Chiều hôm ấy, bác lái đò quen mang tới xưởng một chiếc đèn hỏng. Hồi Nhinh còn bé, bác vẫn chở cô qua sông mà không lấy tiền.',
  },
];

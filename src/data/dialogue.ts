import { DialogueLine } from '../types/gameTypes';

export const DIALOGUE_DATA: Record<string, DialogueLine[]> = {
  intro_awaken: [
    { speaker: 'Ký Ức', text: '“Có những nơi mà mặt trời đã quên đường trở về.”' },
    { speaker: 'Nhinh', text: 'Mình... đang ở rìa rừng Elaria sao? Chiếc đèn lồng cổ vẫn nằm ngay cạnh đây.' },
  ],
  intro_meet_lumo: [
    { speaker: 'Lumo', text: 'Này! Cậu có nghe thấy tôi không?' },
    { speaker: 'Nhinh', text: 'Ai đó?' },
    { speaker: 'Lumo', text: 'Ở đây! Phía trên đầu cậu!' },
    { speaker: 'Nhinh', text: 'Một... con đom đóm biết nói?' },
    { speaker: 'Lumo', text: 'Đừng quan tâm chuyện đó! Cậu có thể thắp chiếc đèn này lên được không? (Nhấn F để thắp đèn)' },
  ],
  intro_after_lamp: [
    { speaker: 'Lumo', text: 'Ấm quá! Ánh sáng của chiếc đèn này có thể đánh thức những dấu vết cổ xưa.' },
    { speaker: 'Lumo', text: 'Hãy thử nhấn phím SPACE để phát xung ánh sáng (Light Pulse) tìm lối dẫn về Cây Mẹ phía bắc nhé!' },
  ],
  hub_first_inspect: [
    { speaker: 'Lumo', text: 'Cậu thấy ba hốc trống kia chứ? Ba mảnh trái tim của Cây Mẹ đã biến mất từ đêm bão năm xưa...' },
    { speaker: 'Nhinh', text: 'Cây cổ thụ đang khô héo dần. Chúng ta phải tìm lại các tinh thể ở đâu?' },
    { speaker: 'Lumo', text: 'Hãy bắt đầu từ lối mòn phía Bắc dẫn vào Rừng Đom Đóm (Whispering Woods). Tinh thể Ký Ức đang đợi ở đó!' },
  ],
  hub_after_woods_tree: [
    { speaker: 'Lumo', text: 'Nhìn kìa! Tinh thể Ký Ức vừa đặt vào đã làm một chùm lá non đâm chồi trên cành Cây Mẹ!' },
    { speaker: 'Nhinh', text: 'Lối đi phía Đông dẫn ra Suối Trăng (Moonlit Creek) cũng vừa tan bớt sương mù rồi.' },
  ],
  hub_after_creek_tree: [
    { speaker: 'Lumo', text: 'Tinh thể Hy Vọng đã khơi lại dòng nước mát quanh rễ cây và những đốm sao lấp lánh!' },
    { speaker: 'Nhinh', text: 'Chỉ còn mảnh ghép cuối cùng ở Tàn Tích Lặng Im (Silent Ruins) về phía Nam.' },
  ],
  hub_ready_finale_hint: [
    { speaker: 'Lumo', text: 'Chúng ta đã tìm đủ cả ba mảnh: Ký Ức, Hy Vọng và Cân Bằng. Hãy đến gần Cây Mẹ và nhấn E để khôi phục trái tim của rừng!' },
  ],
  woods_entry: [
    { speaker: 'Lumo', text: 'Đom đóm vẫn nhớ con đường. Nhưng chúng không thể mở cổng được nữa.' },
    { speaker: 'Nhinh', text: 'Có những ký tự trên bia đá... hay là chúng ta thử ánh sáng? (Nhấn SPACE để phát Light Pulse làm lộ cổ tự)' },
  ],
  woods_gate_inscription: [
    { speaker: 'Hệ thống', text: 'Dòng chữ khắc bên cổng đá cổ: “Trăng soi lá, lá dẫn sao.” (Thứ tự kích hoạt: Trăng -> Lá -> Sao)' },
  ],
  woods_crystal_memory: [
    { speaker: 'Ký Ức', text: '[Tinh thể Ký Ức tỏa sáng vàng ấm — hình ảnh khu rừng Elaria thuở xưa hiện về với ngày và đêm luân phiên hài hòa...]' },
    { speaker: 'Lumo', text: 'Đó là Elaria... trước khi mọi thứ thay đổi.' },
    { speaker: 'Nhinh', text: 'Mình có cảm giác đã từng nhìn thấy nơi này. Hãy mang Tinh thể Ký Ức trở về Cây Mẹ ở phía Nam.' },
  ],
  creek_entry: [
    { speaker: 'Lumo', text: 'Người xưa đã dùng ánh sáng để tạo ra những con đường.' },
    { speaker: 'Nhinh', text: 'Nếu đưa ánh sáng đến bờ bên kia thì sao? Có một bệ đặt đèn và hai chiếc gương xoay ở đây.' },
  ],
  creek_mural: [
    { speaker: 'Ký Ức', text: '[Bức phù điêu cổ khắc họa một người bảo vệ cầm đèn lồng cố giữ ánh sáng vĩnh cửu trong cơn bão, khiến trái tim Cây Mẹ quá tải và vỡ làm ba mảnh...]' },
    { speaker: 'Nhinh', text: 'Chiếc đèn này... đã từng thuộc về người đó sao?' },
    { speaker: 'Lumo', text: 'Ta không nhớ rõ. Ký ức của ta cũng đang phai dần.' },
  ],
  creek_crystal_hope: [
    { speaker: 'Hệ thống', text: 'Bạn đã thu nhận Tinh thể Hy Vọng (Xanh lam). Ánh sáng dịu nhẹ phản chiếu trên mặt suối.' },
    { speaker: 'Lumo', text: 'Người bảo vệ xưa chỉ vì sợ bóng tối mà làm vỡ trái tim khu rừng... Hãy mang mảnh tinh thể này về Cây Mẹ thôi!' },
  ],
  ruins_entry: [
    { speaker: 'Lumo', text: 'Ta không thích nơi đây...' },
    { speaker: 'Nhinh', text: 'Vì quá tối sao?' },
    { speaker: 'Lumo', text: 'Không... vì ta cảm giác bóng tối đang nhìn chúng ta.' },
  ],
  ruins_inscription: [
    { speaker: 'Hệ thống', text: 'Bia cổ trước cổng: “Ngày rực sáng, đêm tĩnh lặng, rồi bình minh lại lên.” (Chuỗi khóa: Mặt Trời [Đèn BẬT] -> Mặt Trăng [Đèn TẮT] -> Mặt Trời [Đèn BẬT])' },
  ],
  ruins_shadow_encounter: [
    { speaker: 'Shadow', text: 'Tại sao ngươi mang ánh sáng đến đây?' },
    { speaker: 'Nhinh', text: 'Để cứu khu rừng.' },
    { speaker: 'Shadow', text: 'Vậy ngươi nghĩ bóng tối là điều xấu sao?' },
    { speaker: 'Shadow', text: 'Nếu không có đêm, những hạt giống sẽ nghỉ ngơi lúc nào?' },
    { speaker: 'Shadow', text: 'Nếu không có bóng tối, làm sao người ta nhìn thấy những vì sao?' },
    { speaker: 'Shadow', text: 'Ánh sáng dẫn đường. Bóng tối cho sự sống thời gian nghỉ ngơi.' },
    { speaker: 'Lumo', text: 'Hình bóng ấy tan biến rồi... Ra là vậy, nhiệm vụ của chúng ta không phải là xóa bỏ bóng tối, mà là khôi phục lại bình minh!' },
  ],
  ruins_crystal_balance: [
    { speaker: 'Hệ thống', text: 'Bạn đã thu nhận Tinh thể Cân Bằng (Tím). Hãy quay về Cây Mẹ ở phía Bắc để hoàn tất hành trình.' },
  ],
  finale_overload_start: [
    { speaker: 'Lumo', text: 'Ba tinh thể đang hợp nhất... Nhưng khoan đã! Quá nhiều ánh sáng! Nó đang lặp lại chuyện cũ!' },
    { speaker: 'Nhinh', text: 'Ánh sáng từ chiếc đèn lồng đang làm trái tim Cây Mẹ quá tải... Mình phải tự tay tắt đèn (Nhấn F) để trả lại sự cân bằng!' },
  ],
  finale_dawn_dialogue: [
    { speaker: 'Lumo', text: 'Cậu làm được rồi.' },
    { speaker: 'Nhinh', text: 'Không. Chúng ta làm được.' },
    { speaker: 'Lumo', text: 'Cậu sẽ ở lại chứ?' },
    { speaker: 'Nhinh', text: 'Có lẽ mình còn những con đường khác phải đi.' },
    { speaker: 'Lumo', text: 'Vậy nhớ giữ chiếc đèn đó nhé. Không phải nơi nào cũng có ánh mặt trời.' },
  ],
};

import { GameProgress, ZoneId } from '../types/gameTypes';

export const ZONE_TITLES: Record<ZoneId, string> = {
  hub: 'THE HEART TREE',
  woods: 'WHISPERING WOODS',
  creek: 'MOONLIT CREEK',
  ruins: 'SILENT RUINS',
};

export const ZONE_SUBTITLES_VI: Record<ZoneId, string> = {
  hub: 'Cây Mẹ Trung Tâm',
  woods: 'Chương 1: Rừng Đom Đóm',
  creek: 'Chương 2: Suối Trăng',
  ruins: 'Chương 3: Tàn Tích Lặng Im',
};

export function getObjectiveText(progress: GameProgress, lanternPlaced: boolean): string {
  const count =
    (progress.crystals.memory ? 1 : 0) +
    (progress.crystals.hope ? 1 : 0) +
    (progress.crystals.balance ? 1 : 0);

  if (progress.stage === 'intro') {
    if (!progress.lanternPickedUp) {
      return 'Tiến tới bia đá phát sáng để gặp Lumo (WASD di chuyển)';
    }
    if (!progress.lanternOn) {
      return 'Nhấn [F] để thắp sáng chiếc đèn lồng';
    }
    if (!progress.tutorialPulseDone) {
      return 'Nhấn [SPACE] phát Light Pulse soi dấu chân ẩn về Cây Mẹ';
    }
    return 'Tiến lên phía Bắc và tương tác [E] với Cây Mẹ';
  }

  if (progress.stage === 'finale_overload') {
    return 'CẢNH BÁO QUÁ TẢI ÁNH SÁNG — Nhấn [F] để tắt đèn, trả lại sự cân bằng!';
  }

  if (progress.stage === 'victory') {
    return 'Bình minh đã trở lại với rừng Elaria';
  }

  if (count === 3) {
    if (progress.currentZone !== 'hub') {
      return 'Đã đủ 3/3 Tinh thể — Quay về Cây Mẹ ở khu trung tâm';
    }
    return 'Khôi phục Cây Mẹ (3/3 tinh thể) — Nhấn [E] tại gốc Cây Mẹ';
  }

  if (progress.currentZone === 'woods') {
    if (progress.crystals.memory) {
      return 'Đã có Tinh thể Ký Ức (1/3) — Đi về phía Nam để quay lại Cây Mẹ';
    }
    if (progress.woodsRuneSequence < 3) {
      return `Giải bia cổ: Nhấn [SPACE] soi ký hiệu & [E] kích hoạt theo thứ tự Trăng → Lá → Sao (${progress.woodsRuneSequence}/3)`;
    }
    return 'Cổng cổ đã mở — Nhấn [E] thu thập Tinh thể Ký Ức (Vàng)';
  }

  if (progress.currentZone === 'creek') {
    if (progress.crystals.hope) {
      return 'Đã có Tinh thể Hy Vọng (2/3) — Đi về phía Tây để quay lại Cây Mẹ';
    }
    if (!progress.creekBridgeActive) {
      if (!lanternPlaced) {
        return 'Đặt đèn lên bệ đá [E] gần bờ suối để chiếu tia sáng qua gương';
      }
      return 'Xoay 2 gương phản chiếu [E] để dẫn tia sáng tới viên đá thu năng lượng bên kia suối';
    }
    return 'Đi qua cầu đá sang bờ bên kia để xem phù điêu & thu nhận Tinh thể Hy Vọng [E]';
  }

  if (progress.currentZone === 'ruins') {
    if (progress.crystals.balance) {
      return 'Đã có đủ 3/3 Tinh thể — Đi về phía Bắc để quay lại Cây Mẹ';
    }
    if (progress.ruinsLockSequence < 3) {
      const stepLabels = ['Mặt Trời (Đèn BẬT)', 'Mặt Trăng (Đèn TẮT)', 'Mặt Trời (Đèn BẬT)'];
      return `Giải khóa Cân Bằng (${progress.ruinsLockSequence}/3): Tiếp theo cần ${stepLabels[progress.ruinsLockSequence]}`;
    }
    if (!progress.shadowSeen) {
      return 'Tiến vào điện thờ và trò chuyện [E] với Hình Bóng (The Shadow)';
    }
    return 'Nhấn [E] thu nhận Tinh thể Cân Bằng (Tím)';
  }

  // Ở Hub:
  if (!progress.crystals.memory) {
    return `Khôi phục Cây Mẹ (${count}/3 tinh thể) — Đi lên phía Bắc vào Rừng Đom Đóm`;
  }
  if (!progress.crystals.hope) {
    return `Khôi phục Cây Mẹ (${count}/3 tinh thể) — Đi sang phía Đông tới Suối Trăng`;
  }
  return `Khôi phục Cây Mẹ (${count}/3 tinh thể) — Đi xuống phía Nam tới Tàn Tích Lặng Im`;
}

export function getLumoHint(progress: GameProgress, lanternPlaced: boolean): string {
  if (progress.currentZone === 'woods' && !progress.crystals.memory) {
    return 'Lumo: “Trăng soi lá, lá dẫn sao... Hãy nhấn SPACE gần các bia đá để nhìn thấy ký hiệu ẩn nhé!”';
  }
  if (progress.currentZone === 'creek' && !progress.creekBridgeActive) {
    if (!lanternPlaced) {
      return 'Lumo: “Hãy đặt chiếc đèn của cậu lên bệ đá cạnh bờ suối bằng phím E trước đã!”';
    }
    return 'Lumo: “Xoay gương dưới hướng lên trên, rồi xoay gương trên hướng sang phải về phía viên đá bên kia suối!”';
  }
  if (progress.currentZone === 'ruins' && progress.ruinsLockSequence < 3) {
    return 'Lumo: “Khóa Mặt Trời cần bật đèn [F], còn khóa Mặt Trăng cần tắt đèn [F]. Thứ tự là Nhật -> Nguyệt -> Nhật!”';
  }
  if (progress.stage === 'finale_overload') {
    return 'Lumo: “Nhấn phím F để tắt đèn ngay! Đừng để ánh sáng nuốt chửng bóng tối!”';
  }
  return 'Lumo: “Ánh sáng dẫn đường, nhưng bóng tối mới cho khu rừng giấc nghỉ ngơi êm đềm.”';
}

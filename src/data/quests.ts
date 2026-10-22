import { tr } from '../i18n/catalog.ts';
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
      return tr('Tiến tới bia đá phát sáng để gặp Lumo (WASD di chuyển)');
    }
    if (!progress.lanternOn) {
      return tr('Nhấn [F] để thắp sáng chiếc đèn lồng');
    }
    if (!progress.tutorialPulseDone) {
      return tr('Nhấn [SPACE] phát Light Pulse soi dấu chân ẩn về Cây Mẹ');
    }
    return tr('Tiến lên phía Bắc và tương tác [E] với Cây Mẹ');
  }

  if (progress.stage === 'finale_overload') {
    return tr('CẢNH BÁO QUÁ TẢI ÁNH SÁNG — Nhấn [F] để tắt đèn, trả lại sự cân bằng!');
  }

  if (progress.stage === 'victory') {
    return tr('Bình minh đã trở lại với rừng Elaria');
  }

  if (count === 3) {
    if (progress.currentZone !== 'hub') {
      return tr('Đã đủ 3/3 Tinh thể — Quay về Cây Mẹ ở khu trung tâm');
    }
    return tr('Khôi phục Cây Mẹ (3/3 tinh thể) — Nhấn [E] tại gốc Cây Mẹ');
  }

  if (progress.currentZone === 'woods') {
    if (progress.crystals.memory) {
      return tr('Đã có Tinh thể Ký Ức (1/3) — Đi về phía Nam để quay lại Cây Mẹ');
    }
    if (progress.woodsRuneSequence < 3) {
      return tr('Giải bia cổ: Nhấn [SPACE] soi ký hiệu & [E] kích hoạt theo thứ tự Trăng → Lá → Sao ({count}/3)', { count: progress.woodsRuneSequence });
    }
    return tr('Cổng cổ đã mở — Nhấn [E] thu thập Tinh thể Ký Ức (Vàng)');
  }

  if (progress.currentZone === 'creek') {
    if (progress.crystals.hope) {
      return tr('Đã có Tinh thể Hy Vọng (2/3) — Đi về phía Tây để quay lại Cây Mẹ');
    }
    if (!progress.creekBridgeActive) {
      if (!lanternPlaced) {
        return tr('Đặt đèn lên bệ đá [E] gần bờ suối để chiếu tia sáng qua gương');
      }
      return tr('Xoay 2 gương phản chiếu [E] để dẫn tia sáng tới viên đá thu năng lượng bên kia suối');
    }
    return tr('Đi qua cầu đá sang bờ bên kia để xem phù điêu & thu nhận Tinh thể Hy Vọng [E]');
  }

  if (progress.currentZone === 'ruins') {
    if (progress.crystals.balance) {
      return tr('Đã có đủ 3/3 Tinh thể — Đi về phía Bắc để quay lại Cây Mẹ');
    }
    if (progress.ruinsLockSequence < 3) {
      const stepLabels = [tr('Mặt Trời (Đèn BẬT)'), tr('Mặt Trăng (Đèn TẮT)'), tr('Mặt Trời (Đèn BẬT)')];
      return tr('Giải khóa Cân Bằng ({count}/3): Tiếp theo cần {step}', { count: progress.ruinsLockSequence, step: stepLabels[progress.ruinsLockSequence] });
    }
    if (!progress.shadowSeen) {
      return tr('Tiến vào điện thờ và trò chuyện [E] với Hình Bóng (The Shadow)');
    }
    return tr('Nhấn [E] thu nhận Tinh thể Cân Bằng (Tím)');
  }

  // Ở Hub:
  if (!progress.crystals.memory) {
    return tr('Khôi phục Cây Mẹ ({count}/3 tinh thể) — Đi lên phía Bắc vào Rừng Đom Đóm', { count });
  }
  if (!progress.crystals.hope) {
    return tr('Khôi phục Cây Mẹ ({count}/3 tinh thể) — Đi sang phía Đông tới Suối Trăng', { count });
  }
  return tr('Khôi phục Cây Mẹ ({count}/3 tinh thể) — Đi xuống phía Nam tới Tàn Tích Lặng Im', { count });
}

export function getLumoHint(progress: GameProgress, lanternPlaced: boolean): string {
  if (progress.currentZone === 'woods' && !progress.crystals.memory) {
    return tr('Lumo: “Trăng soi lá, lá dẫn sao... Hãy nhấn SPACE gần các bia đá để nhìn thấy ký hiệu ẩn nhé!”');
  }
  if (progress.currentZone === 'creek' && !progress.creekBridgeActive) {
    if (!lanternPlaced) {
      return tr('Lumo: “Hãy đặt chiếc đèn của cậu lên bệ đá cạnh bờ suối bằng phím E trước đã!”');
    }
    return tr('Lumo: “Xoay gương dưới hướng lên trên, rồi xoay gương trên hướng sang phải về phía viên đá bên kia suối!”');
  }
  if (progress.currentZone === 'ruins' && progress.ruinsLockSequence < 3) {
    return tr('Lumo: “Khóa Mặt Trời cần bật đèn [F], còn khóa Mặt Trăng cần tắt đèn [F]. Thứ tự là Nhật -> Nguyệt -> Nhật!”');
  }
  if (progress.stage === 'finale_overload') {
    return tr('Lumo: “Nhấn phím F để tắt đèn ngay! Đừng để ánh sáng nuốt chửng bóng tối!”');
  }
  return tr('Lumo: “Ánh sáng dẫn đường, nhưng bóng tối mới cho khu rừng giấc nghỉ ngơi êm đềm.”');
}

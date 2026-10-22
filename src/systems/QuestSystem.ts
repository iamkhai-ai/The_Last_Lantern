import { tr } from '../i18n/catalog.ts';
import { CrystalId, GameProgress, QuestStage, ZoneId } from '../types/gameTypes';
import { SaveSystem } from './SaveSystem';

export class QuestSystem {
  public progress: GameProgress;

  constructor(initialProgress?: GameProgress) {
    this.progress = initialProgress ?? SaveSystem.load();
  }

  public getCrystalCount(): number {
    return (
      (this.progress.crystals.memory ? 1 : 0) +
      (this.progress.crystals.hope ? 1 : 0) +
      (this.progress.crystals.balance ? 1 : 0)
    );
  }

  public canEnterZone(zone: ZoneId): { allowed: boolean; reason?: string } {
    if (zone === 'hub') return { allowed: true };

    if (this.progress.stage === 'intro') {
      return {
        allowed: false,
        reason: tr('Hãy thắp đèn [F], phát xung sáng [SPACE] và xem xét Cây Mẹ trước khi rời khu trung tâm.'),
      };
    }

    if (zone === 'woods') {
      return { allowed: true };
    }

    if (zone === 'creek') {
      if (!this.progress.crystals.memory) {
        return {
          allowed: false,
          reason: tr('Sương mù dày đặc đang chặn lối Đông. Hãy tìm Tinh thể Ký Ức ở Rừng Đom Đóm (phía Bắc) trước!'),
        };
      }
      return { allowed: true };
    }

    if (zone === 'ruins') {
      if (!this.progress.crystals.memory || !this.progress.crystals.hope) {
        return {
          allowed: false,
          reason: tr('Cổ ngữ phong ấn lối Nam. Hãy thu thập Tinh thể Ký Ức (Bắc) và Tinh thể Hy Vọng (Đông) trước!'),
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }

  public setStage(stage: QuestStage, persist = true): void {
    this.progress.stage = stage;
    if (persist) {
      SaveSystem.save(this.progress);
    }
  }

  public setZone(zone: ZoneId): void {
    this.progress.currentZone = zone;
    if (zone === 'woods' && this.progress.stage === 'hub_initial') {
      this.progress.stage = 'woods';
    } else if (zone === 'creek' && this.progress.stage === 'hub_after_woods') {
      this.progress.stage = 'creek';
    } else if (zone === 'ruins' && this.progress.stage === 'hub_after_creek') {
      this.progress.stage = 'ruins';
    }
    SaveSystem.save(this.progress);
  }

  public collectCrystal(id: CrystalId): boolean {
    if (this.progress.crystals[id]) return false;
    this.progress.crystals[id] = true;

    if (id === 'memory') {
      this.progress.woodsRuneSequence = 3;
      this.progress.stage = 'hub_after_woods';
    } else if (id === 'hope') {
      this.progress.creekBridgeActive = true;
      this.progress.stage = 'hub_after_creek';
    } else if (id === 'balance') {
      this.progress.ruinsLockSequence = 3;
      this.progress.shadowSeen = true;
      this.progress.stage = 'hub_final';
    }

    if (this.getCrystalCount() === 3 && this.progress.shadowSeen) {
      this.progress.stage = 'hub_final';
    }

    SaveSystem.save(this.progress);
    return true;
  }

  public isReadyForFinale(): boolean {
    return (
      this.progress.crystals.memory &&
      this.progress.crystals.hope &&
      this.progress.crystals.balance &&
      this.progress.shadowSeen
    );
  }

  public save(): void {
    SaveSystem.save(this.progress);
  }
}

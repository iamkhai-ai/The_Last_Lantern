import Phaser from 'phaser';
import { getNhinhTexture } from '../art/CampaignArt';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { CampaignSaveSystem } from '../systems/CampaignSaveSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { WorldFactory } from '../world/WorldFactory';

export class EndingScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private campaignEnding = false;

  constructor() {
    super({ key: 'EndingScene' });
  }

  public create(data?: { showCredits?: boolean; campaign?: boolean }): void {
    this.campaignEnding = data?.campaign === true;
    const showCredits = data?.showCredits === true || !this.campaignEnding;
    this.selectedIndex = 0;
    this.buttons = [];

    // Build Dawn Heart Tree backdrop matching 05_final_dawn.png
    WorldFactory.buildZone(this, 'hub', 3, true);

    const endingNhinh = getNhinhTexture('idle', 'up', 0);
    if (!endingNhinh) throw new Error('Missing required Nhinh ending frame: idle/up/0');
    const linh = this.add.sprite(306, 295, endingNhinh);
    linh.setDepth(22);

    const lumo = this.add.sprite(348, 266, 'lumo_0');
    lumo.setDepth(25);
    this.tweens.add({
      targets: lumo,
      y: 260,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects('hub', true);

    // Victory & Credits Card
    const card = this.add.graphics();
    card.setDepth(85);
    card.fillStyle(0x081b21, 0.9);
    card.lineStyle(1.5, 0xf2d58b, 0.95);
    card.fillRoundedRect(90, 42, 460, 276, 10);
    card.strokeRoundedRect(90, 42, 460, 276, 10);

    const header = this.add.text(320, 74, 'THE LAST DAWN — BÌNH MINH TRỞ LẠI', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffe6b0',
    });
    header.setOrigin(0.5, 0.5);
    header.setDepth(86);

    const quote = this.add.text(
      320,
      114,
      showCredits ? '“Even the smallest light can lead us home.”' : 'ĐÊM ĐI HẾT CON ĐƯỜNG CỦA NÓ',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        fontStyle: 'italic',
        color: '#f2d58b',
      }
    );
    quote.setOrigin(0.5, 0.5);
    quote.setDepth(86);

    const body = this.add.text(
      320,
      168,
      showCredits ? 'Ba mảnh trái tim Ký Ức • Hy Vọng • Cân Bằng đã hợp nhất.\nKhi Nhinh tự tay tắt ngọn đèn lồng, bóng tối và ánh sáng\nđã tìm lại nhịp thở hài hòa trên khắp khu rừng Elaria.\n\nCảm ơn bạn đã hoàn thành The Last Lantern — Khu Rừng Ánh Sáng!' : 'Nhinh tắt đèn. Những tia sáng cũ rút khỏi Cây Mẹ; vòng ngày đêm lại chuyển động.\n\nNhinh: “Lumo?”\n\nMột tiếng dế vang lên. Nước chảy qua suối, lá khẽ lay.\n\nLumo: “Tôi đây.”  Nhinh: “Tôi vẫn thấy cậu.”',
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11.5px',
        color: '#dfeee8',
        align: 'center',
        lineSpacing: 5,
      }
    );
    body.setOrigin(0.5, 0.5);
    body.setDepth(86);

    const options = [
      {
        label: 'PLAY AGAIN (CHƠI LẠI TỪ ĐẦU)',
        action: () => this.playAgain(),
      },
      {
        label: 'MAIN MENU (MÀN HÌNH CHÍNH)',
        action: () => this.goToMainMenu(),
      },
    ];

    options.forEach((opt, idx) => {
      const btn = this.add.text(320, 248 + idx * 32, opt.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#cddbd8',
      });
      btn.setOrigin(0.5, 0.5);
      btn.setDepth(87);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        this.selectedIndex = idx;
        this.refreshHighlight();
      });
      btn.on('pointerdown', () => {
        this.selectedIndex = idx;
        opt.action();
      });
      this.buttons.push(btn);
      btn.setVisible(showCredits);
    });

    if (!showCredits && this.input.keyboard) {
      const pages = [
        'Nhinh tắt đèn. Những tia sáng cũ rút khỏi Cây Mẹ; vòng ngày đêm lại chuyển động.\n\nNhinh: “Lumo?”\n\nMột tiếng dế vang lên. Nước chảy qua suối, lá khẽ lay.\n\nLumo: “Tôi đây.”  Nhinh: “Tôi vẫn thấy cậu.”',
        'Bình minh đi qua khu vườn, dòng suối và những ô cửa trên tháp.\n\nThe Shadow nhìn về chân trời.\n\nThe Shadow: “Trời sáng rồi.”\n\nLumo: “Lần này, chúng ta đã để đêm đi hết con đường của nó.”',
        'Lumo đậu lên quai chiếc đèn đã tắt. Một chiếc lá non mắc trên quai.\n\nNhinh: “Trước hết, mình đi xem khu rừng vào ban ngày.”\n\nLumo: “Tôi đi cùng được không?”\n\nNhinh: “Đó là lối đi cho hai người mà.”',
      ];
      let page = 0;
      body.setText(pages[page]);
      quote.setText('BÌNH MINH TỰ TÌM ĐƯỢC ĐƯỜNG VỀ');
      const advance = () => {
        page += 1;
        if (page < pages.length) body.setText(pages[page]);
        else this.scene.restart({ showCredits: true, campaign: this.campaignEnding });
      };
      this.input.keyboard.on('keydown-E', advance);
    } else if (showCredits) {
      quote.setText('“Even the smallest light can lead us home.”');
    }

    this.refreshHighlight();

    if (this.input.keyboard && showCredits) {
      this.input.keyboard.on('keydown-UP', () => this.moveSelection(-1));
      this.input.keyboard.on('keydown-W', () => this.moveSelection(-1));
      this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(1));
      this.input.keyboard.on('keydown-S', () => this.moveSelection(1));
      this.input.keyboard.on('keydown-ENTER', () => this.triggerSelected());
      this.input.keyboard.on('keydown-SPACE', () => this.triggerSelected());
      this.input.keyboard.on('keydown-E', () => this.triggerSelected());
    }
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + 2) % 2;
    SoundSystem.playMirrorRotate();
    this.refreshHighlight();
  }

  private triggerSelected(): void {
    if (this.selectedIndex === 0) {
      this.playAgain();
    } else {
      this.goToMainMenu();
    }
  }

  private refreshHighlight(): void {
    const labels = [
      'PLAY AGAIN (CHƠI LẠI TỪ ĐẦU)',
      'MAIN MENU (MÀN HÌNH CHÍNH)',
    ];
    this.buttons.forEach((btn, idx) => {
      const sel = idx === this.selectedIndex;
      btn.setText(sel ? `▸ ${labels[idx]} ◂` : labels[idx]);
      btn.setColor(sel ? '#ffe680' : '#cddbd8');
    });
  }

  public playAgain(): void {
    if (this.campaignEnding) {
      CampaignSaveSystem.clear();
      SoundSystem.playLanternToggle(true);
      this.scene.start('CampaignScene', { newGame: true });
      return;
    }
    SaveSystem.clear();
    const fresh = SaveSystem.createDefaultProgress();
    SaveSystem.save(fresh);
    SoundSystem.playLanternToggle(true);
    this.scene.start('WorldScene', { progress: fresh });
  }

  public goToMainMenu(): void {
    SoundSystem.playMirrorRotate();
    this.scene.start('MenuScene');
  }

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
  }
}

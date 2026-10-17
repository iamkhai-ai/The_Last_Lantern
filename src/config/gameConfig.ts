import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { CampaignScene } from '../scenes/CampaignScene';
import { ComingSoonScene } from '../scenes/ComingSoonScene';
import { EndingScene } from '../scenes/EndingScene';
import { MenuScene } from '../scenes/MenuScene';
import { WorldScene } from '../scenes/WorldScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640,
  height: 360,
  backgroundColor: '#081d26',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, CampaignScene, ComingSoonScene, WorldScene, EndingScene],
};

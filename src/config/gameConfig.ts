import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ComingSoonScene } from '../scenes/ComingSoonScene';
import { MenuScene } from '../scenes/MenuScene';
import { IllustrationScene } from '../v4/scene/IllustrationScene';
import { V4Scene } from '../v4/scene/V4Scene';

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
  scene: [BootScene, MenuScene, V4Scene, IllustrationScene, ComingSoonScene],
};

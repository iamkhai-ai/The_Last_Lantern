import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

function bootGame(): void {
  if ((window as unknown as { __LAST_LANTERN_GAME__?: Phaser.Game }).__LAST_LANTERN_GAME__) {
    return;
  }
  const game = new Phaser.Game(gameConfig);
  (window as unknown as { __LAST_LANTERN_GAME__: Phaser.Game }).__LAST_LANTERN_GAME__ = game;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

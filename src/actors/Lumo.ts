import Phaser from 'phaser';

export class Lumo {
  public sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private timeElapsed = 0;
  private trailTimer = 0;
  private visible = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, 'lumo_0');
    this.sprite.setDepth(55);
  }

  public setVisible(vis: boolean): void {
    this.visible = vis;
    this.sprite.setVisible(vis);
  }

  public update(dt: number, targetX: number, targetY: number): void {
    if (!this.visible) return;
    this.timeElapsed += dt * 0.004;

    // Hover gracefully near Linh's shoulder
    const desiredX = targetX + 18 + Math.cos(this.timeElapsed * 0.9) * 5;
    const desiredY = targetY - 12 + Math.sin(this.timeElapsed * 1.6) * 4;

    this.sprite.x += (desiredX - this.sprite.x) * Math.min(1, dt * 0.008);
    this.sprite.y += (desiredY - this.sprite.y) * Math.min(1, dt * 0.008);

    const frame = Math.floor(this.timeElapsed * 2) % 2;
    this.sprite.setTexture(`lumo_${frame}`);

    // Emit subtle glowing dust mote trail
    this.trailTimer += dt;
    if (this.trailTimer >= 260) {
      this.trailTimer = 0;
      const mote = this.scene.add.image(
        this.sprite.x + (Math.random() - 0.5) * 4,
        this.sprite.y + (Math.random() - 0.5) * 4,
        'particle_firefly'
      );
      mote.setDepth(54);
      mote.setScale(0.55);
      mote.setAlpha(0.65);
      this.scene.tweens.add({
        targets: mote,
        y: mote.y - 6,
        alpha: 0,
        scale: 0.2,
        duration: 520,
        onComplete: () => mote.destroy(),
      });
    }
  }
}

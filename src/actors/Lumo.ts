import Phaser from 'phaser';

export class Lumo {
  public sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private timeElapsed = 0;
  private trailTimer = 0;
  private visible = true;
  private frameCount = 2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, 'lumo_0');
    this.sprite.setDepth(55);
    // Use 4-frame atlas animation when extra poses exist, else classic 2-frame.
    if (scene.textures.exists('lumo_2') && scene.textures.exists('lumo_3')) {
      this.frameCount = 4;
    }
  }

  public setVisible(vis: boolean): void {
    this.visible = vis;
    this.sprite.setVisible(vis);
  }

  public update(dt: number, targetX: number, targetY: number, moveWhenHidden = false): void {
    if (!this.visible && !moveWhenHidden) return;
    this.timeElapsed += dt * 0.004;

    // Hover gracefully near Nhinh's shoulder
    const desiredX = targetX + 18 + Math.cos(this.timeElapsed * 0.9) * 5;
    const desiredY = targetY - 12 + Math.sin(this.timeElapsed * 1.6) * 4;

    this.sprite.x += (desiredX - this.sprite.x) * Math.min(1, dt * 0.008);
    this.sprite.y += (desiredY - this.sprite.y) * Math.min(1, dt * 0.008);

    this.animate(dt);
  }

  /**
   * Flies at a constant `speed` (px/s) toward (x, y), with no hover offset, so a seal can be reached exactly.
   * Returns true once Lumo is within 3px of the point; he then sits on it.
   */
  public flyTo(dt: number, x: number, y: number, speed: number): boolean {
    this.timeElapsed += dt * 0.004;
    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = (speed * dt) / 1000;
    if (distance <= step) {
      this.sprite.setPosition(x, y);
    } else {
      this.sprite.x += (dx / distance) * step;
      this.sprite.y += (dy / distance) * step;
    }
    this.animate(dt);
    return Math.hypot(x - this.sprite.x, y - this.sprite.y) <= 3;
  }

  /** Wing frame and dust trail; shared by hovering and flying. */
  private animate(dt: number): void {
    const frame = Math.floor(this.timeElapsed * 2) % this.frameCount;
    this.sprite.setTexture(`lumo_${frame}`);

    // Keep off-view route movement quiet while Lumo is in another room.
    if (!this.visible) return;

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

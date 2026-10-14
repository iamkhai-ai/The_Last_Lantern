import Phaser from 'phaser';

export type FacingDirection =
  | 'down'
  | 'downleft'
  | 'downright'
  | 'left'
  | 'right'
  | 'up'
  | 'upleft'
  | 'upright';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public facing: FacingDirection = 'down';
  private scene: Phaser.Scene;
  private walkSpeed = 105;
  private runSpeed = 150;
  private animTimer = 0;
  private animStep = 0;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player_down_lit_0');
    this.sprite.setDepth(20);
    this.sprite.setCollideWorldBounds(true);

    // Compact foot hitbox for smooth top-down navigation around trees & rocks
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(14, 10);
      body.setOffset(9, 27);
    }

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SHIFT: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      };
    }
  }

  public update(
    dt: number,
    canMove: boolean,
    hasLanternInHand: boolean,
    lanternOn: boolean
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!canMove) {
      body.setVelocity(0, 0);
      this.updateTexture(false, hasLanternInHand, lanternOn);
      return;
    }

    let vx = 0;
    let vy = 0;

    const left = Boolean(this.cursors?.left?.isDown || this.keys?.A?.isDown);
    const right = Boolean(this.cursors?.right?.isDown || this.keys?.D?.isDown);
    const up = Boolean(this.cursors?.up?.isDown || this.keys?.W?.isDown);
    const down = Boolean(this.cursors?.down?.isDown || this.keys?.S?.isDown);

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      // Normalize diagonal movement vector so diagonal speed equals cardinal speed
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;

      const isRunning = Boolean(this.keys?.SHIFT?.isDown || this.cursors?.shift?.isDown);
      const speed = isRunning ? this.runSpeed : this.walkSpeed;

      body.setVelocity(vx * speed, vy * speed);

      if (vx !== 0 && vy !== 0) {
        // Diagonal: combine vertical + horizontal (screen +y = down).
        if (vy < 0) {
          this.facing = vx < 0 ? 'upleft' : 'upright';
        } else {
          this.facing = vx < 0 ? 'downleft' : 'downright';
        }
      } else if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx < 0 ? 'left' : 'right';
      } else {
        this.facing = vy < 0 ? 'up' : 'down';
      }

      this.animTimer += dt * (isRunning ? 1.35 : 1);
      if (this.animTimer >= 150) {
        this.animTimer = 0;
        this.animStep = (this.animStep + 1) % 4;
      }
    } else {
      body.setVelocity(0, 0);
      this.animStep = 0;
      this.animTimer = 0;
    }

    this.updateTexture(isMoving, hasLanternInHand, lanternOn);
    this.sprite.setDepth(10 + Math.floor(this.sprite.y / 10));
  }

  private updateTexture(
    isMoving: boolean,
    hasLanternInHand: boolean,
    lanternOn: boolean
  ): void {
    const state = !hasLanternInHand ? 'nolamp' : lanternOn ? 'lit' : 'unlit';
    const frameMap = [0, 1, 0, 2];
    const frame = isMoving ? frameMap[this.animStep] : 0;
    let texKey = `player_${this.facing}_${state}_${frame}`;
    if (!this.scene.textures.exists(texKey)) {
      // Fall back to the dominant cardinal direction for incomplete packs.
      const fallback =
        this.facing.includes('left') ? 'left'
        : this.facing.includes('right') ? 'right'
        : this.facing.includes('up') ? 'up'
        : 'down';
      texKey = `player_${fallback}_${state}_${frame}`;
    }
    if (this.sprite.texture.key !== texKey) {
      this.sprite.setTexture(texKey);
    }
  }

  public setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }
}

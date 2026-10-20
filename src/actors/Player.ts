import Phaser from 'phaser';
import { getNhinhTexture } from '../art/CampaignArt';
import { SoundSystem } from '../systems/SoundSystem';
import type { ReachRect } from '../systems/interactionReach';

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
  private shadow: Phaser.GameObjects.Image;
  private walkSpeed = 105;
  private runSpeed = 150;
  private footDepthOffset = 0;
  private footBodyOffsetY = 27;
  private animTimer = 0;
  private animStep = 0;
  /** Last frame's position, used to drive the footstep bed from real movement. */
  private lastX = 0;
  private lastY = 0;
  private actionAnimation: 'pulse' | 'lantern_on' | 'lantern_off' | null = null;
  private actionElapsed = 0;
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
    const initialTexture = getNhinhTexture('idle', 'down', 0);
    if (!initialTexture) throw new Error('Missing required Nhinh idle frame: down');
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setDepth(20);
    this.sprite.setCollideWorldBounds(true);
    this.lastX = x;
    this.lastY = y;
    this.shadow = scene.add.image(x, y + 17, 'shadow_blob');
    this.shadow.setDepth(9);

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
    if (this.actionAnimation) {
      this.actionElapsed += dt;
      if (this.actionElapsed >= 330) this.actionAnimation = null;
    }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // Footsteps follow real displacement, so pushing into a wall stays silent.
    const moved = Math.abs(this.sprite.x - this.lastX) + Math.abs(this.sprite.y - this.lastY) > 0.1;
    this.lastX = this.sprite.x;
    this.lastY = this.sprite.y;
    if (!canMove) {
      body.setVelocity(0, 0);
      SoundSystem.setWalking(false);
      this.updateTexture(false, false, hasLanternInHand, lanternOn);
      this.updateGroundDepth();
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
        const phaseCount = this.facing === 'left' || this.facing === 'right' ? 4 : 3;
        this.animStep = (this.animStep + 1) % phaseCount;
      }
    } else {
      body.setVelocity(0, 0);
      this.animStep = 0;
      this.animTimer = 0;
    }

    SoundSystem.setWalking(moved);
    const isRunning = Boolean(this.keys?.SHIFT?.isDown || this.cursors?.shift?.isDown);
    this.updateTexture(isMoving, isRunning, hasLanternInHand, lanternOn);
    this.updateGroundDepth();
  }

  /** The foot collision body in world space: the rect interaction reach is measured from (RULE_GAMES.md §1). */
  public getFootBody(): ReachRect {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return { x: body.x, y: body.y, width: body.width, height: body.height };
  }

  public playLanternAction(isOn: boolean): void {
    this.playAction(isOn ? 'lantern_on' : 'lantern_off');
  }

  public playPulseAction(): void {
    this.playAction('pulse');
  }

  private playAction(action: 'pulse' | 'lantern_on' | 'lantern_off'): void {
    if (!getNhinhTexture(action, this.facing, 0)) return;
    this.actionAnimation = action;
    this.actionElapsed = 0;
  }

  private updateTexture(
    isMoving: boolean,
    isRunning: boolean,
    hasLanternInHand: boolean,
    lanternOn: boolean
  ): void {
    const pose = isMoving ? (isRunning ? 'run' : 'walk') : 'idle';
    // Side poses are opposite strides around one shared passing pose.
    const horizontal = this.facing === 'left' || this.facing === 'right';
    const frame = isMoving ? (horizontal ? [0, 1, 2, 1][this.animStep % 4] : this.animStep % 3) : 0;
    const actionFrame = this.actionAnimation ? Math.min(2, Math.floor(this.actionElapsed / 110)) : 0;
    const actionTexture = this.actionAnimation
      ? getNhinhTexture(this.actionAnimation, this.facing, actionFrame)
      : null;
    const lampPose = !hasLanternInHand ? `${pose}_nolamp` : lanternOn ? `${pose}_lit` : pose;
    const texture = actionTexture ?? getNhinhTexture(lampPose, this.facing, frame);
    if (!texture || !this.scene.textures.exists(texture)) {
      throw new Error(`Missing required Nhinh frame: ${lampPose}/${this.facing}/${frame}`);
    }
    if (this.sprite.texture.key !== texture) this.sprite.setTexture(texture);
  }

  public setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }
  }

  /** Configure foot collision and depth for a scene while preserving center-based public coordinates. */
  public setFootPlacement(depthOffsetY: number, bodyOffsetY: number, bodyOffsetX = 9, bodyWidth = 14, bodyHeight = 10): void {
    this.footDepthOffset = depthOffsetY;
    this.footBodyOffsetY = bodyOffsetY;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(bodyWidth, bodyHeight);
      body.setOffset(bodyOffsetX, bodyOffsetY);
    }
    this.updateGroundDepth();
  }

  private updateGroundDepth(): void {
    const groundY = this.sprite.y + this.footDepthOffset;
    this.sprite.setDepth(this.footDepthOffset === 0 ? 10 + Math.floor(groundY / 10) : 10 + groundY / 10);
    this.shadow.setPosition(this.sprite.x, this.footDepthOffset === 0 ? this.sprite.y + 17 : groundY - 2);
    this.shadow.setDepth(this.sprite.depth - 1);
  }

  /** Fastest speed in px/s (running). The Shadow's solid uses it to look one step ahead of the player. */
  public get maxSpeed(): number {
    return Math.max(this.walkSpeed, this.runSpeed);
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }
}

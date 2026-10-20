import Phaser from 'phaser';
import { InteractableConfig } from '../types/gameTypes';
import { layoutInteractionPrompt } from './interactionPromptLayout';
import type { PromptRect } from './interactionPromptLayout';

/** A small world-space cushion; no meter-to-pixel scale is defined by the game. */
const INTERACTION_RADIUS_PADDING = 8;

function effectiveRadius(item: InteractableConfig): number {
  return item.radius + INTERACTION_RADIUS_PADDING;
}

export class InteractionSystem {
  private scene: Phaser.Scene;
  private interactables: InteractableConfig[] = [];
  private activeTarget: InteractableConfig | null = null;
  private promptContainer: Phaser.GameObjects.Container;
  private promptBg: Phaser.GameObjects.Graphics;
  private promptText: Phaser.GameObjects.Text;
  private lastInteractTime = 0;
  private lastPlayerPosition = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.promptBg = scene.add.graphics();
    this.promptText = scene.add.text(0, 0, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#f7dfaa',
      fontStyle: 'bold',
    });
    this.promptText.setWordWrapWidth(360);
    this.promptText.setOrigin(0.5, 0.5);

    this.promptContainer = scene.add.container(0, 0, [this.promptBg, this.promptText]);
    this.promptContainer.setDepth(82);
    this.promptContainer.setVisible(false);
  }

  public clear(): void {
    this.interactables = [];
    this.activeTarget = null;
    this.promptContainer.setVisible(false);
  }

  public register(config: InteractableConfig): void {
    this.interactables.push(config);
  }

  public update(playerX: number, playerY: number, canInteract: boolean, playerBounds?: PromptRect, protectedBounds: PromptRect[] = []): void {
    this.lastPlayerPosition = { x: playerX, y: playerY };
    if (!canInteract) {
      this.activeTarget = null;
      this.promptContainer.setVisible(false);
      return;
    }

    let best: InteractableConfig | null = null;
    let bestDist = Infinity;
    let bestOwns = false;

    for (const item of this.interactables) {
      if (item.isEnabled && !item.isEnabled()) continue;
      const label = item.getPrompt();
      if (!label) continue;

      const dist = Math.hypot(playerX - item.x, playerY - item.y);
      // A control that owns its own approach shape (a stone answered from all four sides) replaces the
      // radial test with its predicate; every control without one keeps the padded radius exactly as before.
      // `dist` is still measured: it orders candidates that are both in reach.
      const inReach = item.isInReach ? item.isInReach(playerX, playerY) === true : dist <= effectiveRadius(item);
      if (!inReach) continue;

      // Among the candidates that already pass the gates above, a control that owns the standing
      // position keeps it even when a neighbouring prop is nearer. Controls that do not opt in are
      // untouched: nearest wins, ties go to the first registered.
      const owns = item.ownsPosition ? item.ownsPosition(playerX, playerY) === true : false;
      if (best) {
        if (bestOwns && !owns) continue;
        if (owns === bestOwns && dist >= bestDist) continue;
      }

      best = item;
      bestDist = dist;
      bestOwns = owns;
    }

    this.activeTarget = best;

    if (best) {
      const label = best.getPrompt() ?? '';
      this.promptText.setText(label);
      const w = Math.min(378, Math.max(68, this.promptText.width + 18));
      const h = Math.max(24, this.promptText.height + 10);

      this.promptBg.clear();
      this.promptBg.fillStyle(0x091921, 0.92);
      this.promptBg.lineStyle(1, 0xd8b869, 0.85);
      this.promptBg.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      this.promptBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);

      const actorBounds = playerBounds ?? { x: playerX - 18, y: playerY - 21, width: 36, height: 42 };
      const promptBounds = layoutInteractionPrompt(best.getPromptBounds?.() ?? null, actorBounds, w, h, undefined, protectedBounds);
      this.promptContainer.setPosition(promptBounds.x + w / 2, promptBounds.y + h / 2);
      this.promptContainer.setVisible(true);
    } else {
      this.promptContainer.setVisible(false);
    }
  }

  public tryInteract(now: number): boolean {
    if (!this.activeTarget) return false;
    const target = this.activeTarget;
    // The press re-validates the whole approach condition the prompt and the selection agreed on:
    // enabled, a live prompt, the range (the control's own `isInReach` when it opts in, else the padded
    // radius), and — for a control that owns the standing position — that the feet are still inside it.
    // A state change between update() and E can never fire a control the player has already left or that
    // has since gone quiet.
    const disabled = target.isEnabled ? !target.isEnabled() : false;
    const outOfRange = target.isInReach
      ? target.isInReach(this.lastPlayerPosition.x, this.lastPlayerPosition.y) !== true
      : Math.hypot(this.lastPlayerPosition.x - target.x, this.lastPlayerPosition.y - target.y) > effectiveRadius(target);
    const lostOwnership = target.ownsPosition
      ? target.ownsPosition(this.lastPlayerPosition.x, this.lastPlayerPosition.y) !== true
      : false;
    if (disabled || !target.getPrompt() || outOfRange || lostOwnership) {
      this.activeTarget = null;
      this.promptContainer.setVisible(false);
      return false;
    }
    if (now - this.lastInteractTime < 160) return false;
    this.lastInteractTime = now;
    target.onInteract();
    return true;
  }

  public getActiveTarget(): InteractableConfig | null {
    return this.activeTarget;
  }
}

import Phaser from 'phaser';
import { InteractableConfig } from '../types/gameTypes';
import { layoutInteractionPrompt } from './interactionPromptLayout';
import type { PromptRect } from './interactionPromptLayout';

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

    for (const item of this.interactables) {
      if (item.isEnabled && !item.isEnabled()) continue;
      const label = item.getPrompt();
      if (!label) continue;

      const dist = Math.hypot(playerX - item.x, playerY - item.y);
      if (dist <= item.radius && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
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
    if ((target.isEnabled && !target.isEnabled()) || Math.hypot(this.lastPlayerPosition.x - target.x, this.lastPlayerPosition.y - target.y) > target.radius) {
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

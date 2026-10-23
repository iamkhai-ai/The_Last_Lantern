import Phaser from 'phaser';
import { tr } from '../i18n/catalog.ts';
import type { Interactable } from '../types/gameTypes';
import type { Rect } from '../v4/core/geometry';
import { isInReach, pickTarget } from '../v4/core/reach';
import { layoutInteractionPrompt } from './interactionPromptLayout';
import type { PromptRect } from './interactionPromptLayout';

export class InteractionSystem {
  private scene: Phaser.Scene;
  private interactables: Interactable[] = [];
  private activeTarget: Interactable | null = null;
  private promptContainer: Phaser.GameObjects.Container;
  private promptBg: Phaser.GameObjects.Graphics;
  private promptText: Phaser.GameObjects.Text;
  private lastInteractTime = 0;
  private lastFoot: Rect | null = null;

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

  public register(item: Interactable): void {
    this.interactables.push(item);
  }

  /**
   * Picks the target for this frame and shows its prompt. `foot` is the player's foot body (RULE_GAMES §1);
   * `actorBounds` is the actor's rectangle the prompt must keep clear of.
   */
  public update(foot: Rect, canInteract: boolean, actorBounds: PromptRect, protectedBounds: PromptRect[] = []): void {
    this.lastFoot = foot;
    if (!canInteract) {
      this.activeTarget = null;
      this.promptContainer.setVisible(false);
      return;
    }

    // Only controls that are there right now (a non-null prompt) take part in the choice.
    const candidates = this.interactables.filter(item => item.getPrompt() !== null);
    const index = pickTarget(foot, candidates);
    const best = index >= 0 ? candidates[index] : null;
    this.activeTarget = best;

    if (best) {
      const label = best.getPrompt() ?? '';
      // Localized here, once, so every level's prompt copy crosses the same boundary.
      this.promptText.setText(tr(label));
      const w = Math.min(378, Math.max(68, this.promptText.width + 18));
      const h = Math.max(24, this.promptText.height + 10);

      this.promptBg.clear();
      this.promptBg.fillStyle(0x091921, 0.92);
      this.promptBg.lineStyle(1, 0xd8b869, 0.85);
      this.promptBg.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      this.promptBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);

      const promptBounds = layoutInteractionPrompt(best.reach.rect, actorBounds, w, h, undefined, protectedBounds);
      this.promptContainer.setPosition(promptBounds.x + w / 2, promptBounds.y + h / 2);
      this.promptContainer.setVisible(true);
    } else {
      this.promptContainer.setVisible(false);
    }
  }

  public tryInteract(now: number): boolean {
    const target = this.activeTarget;
    if (!target) return false;
    // The press re-validates what the prompt and the selection agreed on: a live prompt and the foot
    // still in reach of the target. A state change between update() and E can never fire a control the
    // player has already left or that has since gone quiet.
    const stillValid = this.lastFoot !== null
      && target.getPrompt() !== null
      && isInReach(this.lastFoot, target.reach, target.exception);
    if (!stillValid) {
      this.activeTarget = null;
      this.promptContainer.setVisible(false);
      return false;
    }
    if (now - this.lastInteractTime < 160) return false;
    this.lastInteractTime = now;
    target.onInteract();
    return true;
  }

  public getActiveTarget(): Interactable | null {
    return this.activeTarget;
  }
}

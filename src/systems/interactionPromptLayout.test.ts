import { describe, it, expect } from 'vitest';
import { layoutInteractionPrompt, type PromptRect } from './interactionPromptLayout';

const PROMPT_W = 120;
const PROMPT_H = 24;

function overlaps(a: PromptRect, b: PromptRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('layoutInteractionPrompt', () => {
  const target: PromptRect = { x: 300, y: 200, width: 20, height: 20 };
  const farPlayer: PromptRect = { x: 40, y: 250, width: 20, height: 20 };

  it('keeps the prompt inside the safe area when the target is in the middle of the room', () => {
    const rect = layoutInteractionPrompt(target, farPlayer, PROMPT_W, PROMPT_H);

    expect(rect.x).toBeGreaterThanOrEqual(8);
    expect(rect.y).toBeGreaterThanOrEqual(82);
    expect(rect.x + rect.width).toBeLessThanOrEqual(632);
    expect(rect.y + rect.height).toBeLessThanOrEqual(310);
  });

  it('does not overlap the player rect', () => {
    const rect = layoutInteractionPrompt(target, farPlayer, PROMPT_W, PROMPT_H);

    expect(overlaps(rect, farPlayer)).toBe(false);
  });
});

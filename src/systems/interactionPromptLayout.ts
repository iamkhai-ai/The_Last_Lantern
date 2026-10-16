export interface PromptRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PromptViewport {
  width: number;
  height: number;
}

const PROMPT_SAFE_AREA = { left: 8, top: 82, right: 632, bottom: 310 };
const PROMPT_GAP = 8;

function overlapArea(a: PromptRect, b: PromptRect): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Places a prompt near its target while keeping it off the actor and protected HUD bands. */
export function layoutInteractionPrompt(
  target: PromptRect | null,
  player: PromptRect,
  width: number,
  height: number,
  viewport: PromptViewport = { width: 640, height: 360 },
  protectedBounds: PromptRect[] = [],
): PromptRect {
  const safe = {
    left: PROMPT_SAFE_AREA.left,
    top: PROMPT_SAFE_AREA.top,
    right: Math.min(PROMPT_SAFE_AREA.right, viewport.width - 8),
    bottom: Math.min(PROMPT_SAFE_AREA.bottom, viewport.height - 50),
  };
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const minX = safe.left + halfWidth;
  const maxX = safe.right - halfWidth;
  const minY = safe.top + halfHeight;
  const maxY = safe.bottom - halfHeight;
  const anchors = target ? [target, player] : [player];
  const candidates: Array<{ x: number; y: number }> = [];

  for (const anchor of anchors) {
    const centerX = anchor.x + anchor.width / 2;
    const centerY = anchor.y + anchor.height / 2;
    candidates.push(
      { x: centerX, y: anchor.y - PROMPT_GAP - halfHeight },
      { x: centerX, y: anchor.y + anchor.height + PROMPT_GAP + halfHeight },
      { x: anchor.x - PROMPT_GAP - halfWidth, y: centerY },
      { x: anchor.x + anchor.width + PROMPT_GAP + halfWidth, y: centerY },
    );
  }

  let best: PromptRect | null = null;
  let bestScore = Infinity;
  candidates.forEach((candidate, index) => {
    const rect = {
      x: clamp(candidate.x, minX, maxX) - halfWidth,
      y: clamp(candidate.y, minY, maxY) - halfHeight,
      width,
      height,
    };
    const targetOverlap = target ? overlapArea(rect, target) : 0;
    const playerOverlap = overlapArea(rect, player);
    const protectedOverlap = protectedBounds.reduce((total, bounds) => total + overlapArea(rect, bounds), 0);
    const score = (targetOverlap + playerOverlap * 2 + protectedOverlap * 2) * 100 + index;
    if (score < bestScore) {
      best = rect;
      bestScore = score;
    }
  });

  return best ?? {
    x: minX - halfWidth,
    y: minY - halfHeight,
    width,
    height,
  };
}

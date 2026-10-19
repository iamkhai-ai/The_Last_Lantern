/** Distance (game px) at or below which a dark-ink overlay is fully hidden. */
export const INK_FADE_NEAR = 50;
/** Distance (game px) at or above which a dark-ink overlay is fully shown. */
export const INK_FADE_FAR = 80;

/**
 * Smoothstep fade (0..1) for a dark-ink overlay given its distance from the player.
 * Near the player the lantern-off falloff already lights the real tablet, so the copy stays hidden.
 */
export function inkOverlayFade(distance: number): number {
  const t = Math.min(1, Math.max(0, (distance - INK_FADE_NEAR) / (INK_FADE_FAR - INK_FADE_NEAR)));
  return t * t * (3 - 2 * t);
}

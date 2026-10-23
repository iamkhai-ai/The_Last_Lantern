import type { Rect } from '../v4/core/geometry';

/** The HUD keys that can appear in the key row or the pause hint. */
export type HudKeyId = 'move' | 'run' | 'interact' | 'lantern' | 'pulse' | 'journal' | 'hint' | 'pause';

// Pure HUD geometry (no Phaser): CampaignHud draws with these, and the reach audit reads HUD_BANDS.
export const ROW_LEFT = 12;
export const ROW_RIGHT = 628;
const KEYS_X = 320;
export const KEYS_Y = 347;
export const CHIP_HEIGHT = 14;
export const TOP_X = 12;
export const TOP_Y = 8;
export const TOP_WIDTH = 248;
export const TOP_MAX_HEIGHT = 78;
export const TOAST_Y = 64;
// The pulse badge lives in the 24px band between the status row (bottom 333)
// and the canvas edge, so its arc and ready ring must stay inside it.
export const PULSE_BADGE_RADIUS = 8;
export const PULSE_ARC_RADIUS = 10;
export const PULSE_ARC_STROKE = 2;
export const PULSE_FLASH_RADIUS = 11;
export const PULSE_FLASH_STROKE = 1;

/** The only keys that get a chip: the always-on trio plus whichever lantern action the level allows. */
export const CHIP_ORDER: readonly HudKeyId[] = ['move', 'run', 'interact', 'lantern', 'pulse'];

/**
 * Fixed HUD geometry, exported so the source-only checks can prove the pulse
 * badge, its ready ring and the whole key row stay on the 640x360 canvas.
 */
export const HUD_LAYOUT = {
  chipOrder: CHIP_ORDER,
  rowLeft: ROW_LEFT,
  rowRight: ROW_RIGHT,
  rowCenter: KEYS_X,
  keysY: KEYS_Y,
  chipHeight: CHIP_HEIGHT,
  badgeRadius: PULSE_BADGE_RADIUS,
  arcRadius: PULSE_ARC_RADIUS,
  arcStroke: PULSE_ARC_STROKE,
  flashRadius: PULSE_FLASH_RADIUS,
  flashStroke: PULSE_FLASH_STROKE,
  topBottom: TOP_Y + TOP_MAX_HEIGHT,
  toastY: TOAST_Y,
} as const;

/** Screen bands no interactable, standing spot or prompt may occupy (RULE_GAMES §6): the mission plate and the key row. */
export const HUD_BANDS: readonly Rect[] = [
  { x: TOP_X, y: TOP_Y, width: TOP_WIDTH, height: TOP_MAX_HEIGHT },   // the mission plate only (top-left), not the full width
  { x: 0, y: HUD_LAYOUT.keysY - 14, width: 640, height: 360 - (HUD_LAYOUT.keysY - 14) },
];

/** Left edge of the key row: centred on KEYS_X but never outside [ROW_LEFT, ROW_RIGHT]. */
export function centerKeyRow(totalWidth: number): number {
  const centred = Math.round(KEYS_X - totalWidth / 2);
  return Math.max(ROW_LEFT, Math.min(ROW_RIGHT - totalWidth, centred));
}

/** Where the lantern is: in Nhinh's hand, or set on a pedestal (puzzle-contracts §1 "Đèn bảo trì"). */
export type LanternLocation = { readonly at: 'hand' } | { readonly at: 'pedestal'; readonly pedestalId: string };

/** The one active light of Nhinh. `on` is kept across placing and picking up. */
export interface LanternState {
  readonly location: LanternLocation;
  readonly on: boolean;
}

/** The lantern at the start of a level: in hand, lit. */
export function initialLantern(): LanternState {
  return { location: { at: 'hand' }, on: true };
}

/** F: flips `on` wherever the lantern is. */
export function toggleLantern(s: LanternState): LanternState {
  return { location: s.location, on: !s.on };
}

/** E on a pedestal: sets the lantern down. Refused unless it is in hand. */
export function placeLantern(s: LanternState, pedestalId: string): LanternState | null {
  if (s.location.at !== 'hand') return null;
  return { location: { at: 'pedestal', pedestalId }, on: s.on };
}

/** E on a pedestal that holds the lantern: takes it back. Refused unless it sits on that pedestal. */
export function pickUpLantern(s: LanternState, pedestalId: string): LanternState | null {
  if (s.location.at !== 'pedestal' || s.location.pedestalId !== pedestalId) return null;
  return { location: { at: 'hand' }, on: s.on };
}

/** True when the lantern is lit and sits on that pedestal, so the pedestal's device gets power. */
export function lanternFeeds(s: LanternState, pedestalId: string): boolean {
  return s.on && s.location.at === 'pedestal' && s.location.pedestalId === pedestalId;
}

/** Pulse needs the lantern in hand and lit. */
export function canPulse(s: LanternState): boolean {
  return s.location.at === 'hand' && s.on;
}

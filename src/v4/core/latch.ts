/** A door is open while its sensor/holder is live, or while a latch holds it (puzzle-contracts §1 "Chốt"). */
export function isDoorOpen(live: boolean, latched: boolean): boolean {
  return live || latched;
}

/**
 * Fixed latch. Setting the value it already has returns it unchanged. Engaging needs the door
 * to be really open right now (`doorLiveNow`); releasing is always allowed. Refused gives null.
 */
export function setFixedLatch(engaged: boolean, want: boolean, doorLiveNow: boolean): boolean | null {
  if (want === engaged) return engaged;
  if (want && !doorLiveNow) return null;
  return want;
}

/** A portable latch is either on the belt or clipped into a slot. */
export type PortableLatchLocation = { readonly at: 'belt' } | { readonly at: 'slot'; readonly slotId: string };

/** Clips a belt latch into a slot. Only from the belt, and only while that door is open. */
export function attachPortableLatch(
  k: PortableLatchLocation,
  slotId: string,
  doorOpenNow: boolean,
): PortableLatchLocation | null {
  if (k.at !== 'belt' || !doorOpenNow) return null;
  return { at: 'slot', slotId };
}

/** Takes a portable latch out of a slot. Only from that slot. */
export function detachPortableLatch(k: PortableLatchLocation, slotId: string): PortableLatchLocation | null {
  if (k.at !== 'slot' || k.slotId !== slotId) return null;
  return { at: 'belt' };
}

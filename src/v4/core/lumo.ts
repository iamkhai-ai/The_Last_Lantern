/** Lumo's state: following Nhinh, flying to a seal, or holding a seal (puzzle-contracts §1 "Lumo"). */
export type LumoMode =
  | { readonly mode: 'follow' }
  | { readonly mode: 'travelling'; readonly sealId: string }
  | { readonly mode: 'holding'; readonly sealId: string };

/** Lumo at the start: following Nhinh. */
export function followLumo(): LumoMode {
  return { mode: 'follow' };
}

/** Sends Lumo to a seal. When he is already travelling to or holding that seal, `m` is returned unchanged. */
export function callLumo(m: LumoMode, sealId: string): LumoMode {
  if (m.mode !== 'follow' && m.sealId === sealId) return m;
  return { mode: 'travelling', sealId };
}

/** Lumo reached the seal he was travelling to: he now holds it. Any other mode is returned unchanged. */
export function lumoArrived(m: LumoMode): LumoMode {
  if (m.mode !== 'travelling') return m;
  return { mode: 'holding', sealId: m.sealId };
}

/** Recalls Lumo to follow Nhinh. Always succeeds. */
export function recallLumo(_m: LumoMode): LumoMode {
  return followLumo();
}

/** True only when Lumo is holding that seal; never while he is still travelling to it. */
export function lumoHolds(m: LumoMode, sealId: string): boolean {
  return m.mode === 'holding' && m.sealId === sealId;
}

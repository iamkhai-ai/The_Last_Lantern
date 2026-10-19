export type ForestEdgeGuideTarget = 'lantern' | 'tablet' | 'ring';
export type ForestEdgeTutorialStep = 'wake' | 'pickup' | 'light' | 'tablet' | 'pulse' | 'ring' | 'exit';
export interface ForestEdgePoint { x: number; y: number }

/** Keep the spatial cue aligned with the current earned objective; Pulse must reveal the ring first. */
export function forestEdgeGuideTarget(step: ForestEdgeTutorialStep): ForestEdgeGuideTarget | null {
  if (step === 'wake' || step === 'pickup') return 'lantern';
  if (step === 'light' || step === 'tablet') return 'tablet';
  if (step === 'ring') return 'ring';
  return null;
}

/** The authored stamp points north (negative Y); rotate it toward the next stamp or the ring. */
export function forestEdgeFootprintRotation(index: number, trail: readonly ForestEdgePoint[], ring: ForestEdgePoint): number {
  const point = trail[index];
  if (!point) return 0;
  const next = trail[index + 1] ?? ring;
  return Math.atan2(next.y - point.y, next.x - point.x) + Math.PI / 2;
}

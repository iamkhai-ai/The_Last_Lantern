export interface LibraryPoint { x: number; y: number }
export interface LibraryRect extends LibraryPoint { width: number; height: number }

export const LIBRARY_LAYOUT = {
  floor: { left: 24, right: 616, top: 80, bottom: 310 },
  entry: { x: 180, y: 288 },
  desk: { x: 66, y: 246, width: 80, height: 54 },
  book: { x: 66, y: 235, width: 56, height: 40 },
  racks: [
    { x: 132, y: 126 }, { x: 180, y: 126 },
    { x: 132, y: 236 }, { x: 180, y: 236 },
  ] as LibraryPoint[],
  rackStandOffset: 46,
  groundDepth: 7,
  well: { x: 320, y: 188, width: 220, height: 220 },
  seats: [
    { x: 320, y: 112 }, { x: 396, y: 188 },
    { x: 320, y: 264 }, { x: 244, y: 188 },
  ] as LibraryPoint[],
  seatApproaches: [
    { x: 320, y: 112 }, { x: 420, y: 184 },
    { x: 320, y: 282 }, { x: 220, y: 184 },
  ] as LibraryPoint[],
  confirm: { x: 320, y: 224 },
  shelves: [{ x: 50, y: 150 }, { x: 598, y: 120 }] as LibraryPoint[],
  mural: { x: 500, y: 144, scale: 0.75 },
  muralStand: { x: 500, y: 226 },
  exit: { x: 566, y: 286, anchorY: 312, width: 110 },
  checkpoints: [
    { x: 180, y: 288 }, { x: 66, y: 278 }, { x: 320, y: 282 },
    { x: 500, y: 226 }, { x: 566, y: 286 },
  ] as LibraryPoint[],
  actor: { bodyX: 11, bodyY: 37, bodyWidth: 14, bodyHeight: 6, feetY: 19 },
  art: { rack: 48, shelf: 80, panelWidth: 87, panelHeight: 111 },
  core: { x: 320, y: 188, radius: 46 },
} as const;

export const LIBRARY_SOLID_RECTS: LibraryRect[] = [
  // Solid footprints fill the visible prop faces, so their sides and backs block too.
  { x: 28, y: 223, width: 76, height: 50 },
  { x: 12, y: 112, width: 76, height: 78 },
  { x: 560, y: 82, width: 76, height: 78 },
  { x: 108, y: 102, width: 48, height: 48 },
  { x: 156, y: 102, width: 48, height: 48 },
  { x: 108, y: 212, width: 48, height: 48 },
  { x: 156, y: 212, width: 48, height: 48 },
  { x: 458, y: 90, width: 84, height: 110 },
  // Full visible side-post strips from the 152x156 split frame at 110px wide.
  { x: 511, y: 199, width: 37, height: 113 },
  { x: 585, y: 199, width: 37, height: 113 },
];

export const LIBRARY_EXIT_THRESHOLD: LibraryRect = { x: 548, y: 309, width: 36, height: 7 };

const LIBRARY_WALLS: LibraryRect[] = [
  { x: 8, y: 80, width: 16, height: 230 },
  { x: 616, y: 80, width: 16, height: 230 },
  { x: 24, y: 72, width: 592, height: 8 },
  { x: 24, y: 310, width: 592, height: 8 },
];

export function libraryActorBody(center: LibraryPoint): LibraryRect {
  const { bodyX, bodyY, bodyWidth, bodyHeight } = LIBRARY_LAYOUT.actor;
  return { x: center.x - 18 + bodyX, y: center.y - 21 + bodyY, width: bodyWidth, height: bodyHeight };
}

export function overlapsLibraryRect(center: LibraryPoint, rect: LibraryRect): boolean {
  const body = libraryActorBody(center);
  return body.x < rect.x + rect.width && body.x + body.width > rect.x
    && body.y < rect.y + rect.height && body.y + body.height > rect.y;
}

export function insideLibraryFloor(center: LibraryPoint): boolean {
  const body = libraryActorBody(center);
  return body.x >= LIBRARY_LAYOUT.floor.left && body.x + body.width <= LIBRARY_LAYOUT.floor.right
    && body.y >= LIBRARY_LAYOUT.floor.top && body.y + body.height <= LIBRARY_LAYOUT.floor.bottom;
}

export function isLibraryPositionSafe(center: LibraryPoint, exitOpen: boolean): boolean {
  return insideLibraryFloor(center)
    && !LIBRARY_SOLID_RECTS.some((rect) => overlapsLibraryRect(center, rect))
    && (exitOpen || !overlapsLibraryRect(center, LIBRARY_EXIT_THRESHOLD));
}

export function resolveLibrarySpawn(saved: LibraryPoint | undefined, exitOpen: boolean): LibraryPoint {
  if (saved && isLibraryPositionSafe(saved, exitOpen)) return saved;
  return LIBRARY_LAYOUT.checkpoints.find((point) => isLibraryPositionSafe(point, exitOpen)) ?? LIBRARY_LAYOUT.entry;
}

export function sanitizeLibrarySlots(raw: unknown): number[] {
  let candidate: unknown = raw;
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate); } catch { candidate = null; }
  }
  const values = Array.isArray(candidate) ? candidate : [];
  const used = new Set<number>();
  return Array.from({ length: 4 }, (_, index) => {
    const value = values[index];
    if (!Number.isInteger(value) || (value as number) < -1 || (value as number) > 3 || value === -1 || used.has(value as number)) return -1;
    used.add(value as number);
    return value as number;
  });
}

export function librarySlotsJson(slots: readonly number[]): string {
  return JSON.stringify(sanitizeLibrarySlots([...slots]));
}

export const LIBRARY_WALL_RECTS = LIBRARY_WALLS;

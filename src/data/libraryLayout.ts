export interface LibraryPoint { x: number; y: number }
export interface LibraryRect extends LibraryPoint { width: number; height: number }

export const LIBRARY_LAYOUT = {
  floor: { left: 24, right: 616, top: 80, bottom: 310 },
  // Nudged east so the spawn sits outside the rack prompt radius of the leaf rack at (180,282).
  entry: { x: 214, y: 288 },
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
  // Just south of the dais edge; the small radius keeps the South seat (320,282) targeted.
  confirm: { x: 320, y: 216, radius: 9 },
  // The big east shelf left with the old south-wall gate: the arch now fills that corner.
  shelves: [{ x: 50, y: 150 }] as LibraryPoint[],
  // Shifted 12px west so the north-wall arch (LIBRARY_LAYOUT.exit) does not cover the panel art.
  mural: { x: 488, y: 144, scale: 0.75 },
  muralStand: { x: 488, y: 226 },
  // North-wall gate, built like the Level 02 arch (WHISPERING_WOODS.gate): `y` is the interaction
  // stand just inside the doorway on its south side (Level 02 uses 8px above its post base), `anchorY`
  // is the arch base against the north wall. Rule 3: a level gate stand sits on the approach side.
  exit: { x: 580, y: 170, radius: 24, anchorY: 178, width: 96 },
  // Free-standing inscription tablet beside the entry path: the first thing a new player meets.
  // `y` is the south stand; `baseY` is the tablet's floor contact. The stone is 52 tall so its read
  // label (anchored to the image bounds, 8px above the top) clears the rack art boxes to the west and
  // lands above the stone instead of being pushed out over the well.
  inscription: { x: 232, y: 282, baseY: 270, width: 30, height: 52, radius: 22 },
  checkpoints: [
    { x: 214, y: 288 }, { x: 66, y: 278 }, { x: 320, y: 282 },
    { x: 488, y: 226 }, { x: 580, y: 196 },
  ] as LibraryPoint[],
  actor: { bodyX: 11, bodyY: 37, bodyWidth: 14, bodyHeight: 6, feetY: 19 },
  art: { rack: 48, shelf: 80, panelWidth: 87, panelHeight: 111 },
  core: { x: 320, y: 188, radius: 46 },
} as const;

/** Footprint of the central well dais (approximates the core radius of 46). */
export const LIBRARY_DAIS: LibraryRect = { x: 284, y: 158, width: 72, height: 60 };

/** The inscription tablet's small footprint: 20x10 with its south edge on the tablet base. */
export const LIBRARY_INSCRIPTION_SOLID: LibraryRect = {
  x: LIBRARY_LAYOUT.inscription.x - 10,
  y: LIBRARY_LAYOUT.inscription.baseY - 10,
  width: 20,
  height: 10,
};

/** The four 48x48 rack blocks, in `LIBRARY_LAYOUT.racks` order (each block is centred on its rack anchor). */
export const LIBRARY_RACK_SOLIDS: LibraryRect[] = [
  { x: 108, y: 102, width: 48, height: 48 },
  { x: 156, y: 102, width: 48, height: 48 },
  { x: 108, y: 212, width: 48, height: 48 },
  { x: 156, y: 212, width: 48, height: 48 },
];

/** The mural panel's collision block; its art and prompt anchor live at `LIBRARY_LAYOUT.mural`. */
export const LIBRARY_MURAL_SOLID: LibraryRect = { x: 446, y: 90, width: 84, height: 110 };

export const LIBRARY_SOLID_RECTS: LibraryRect[] = [
  // Solid footprints fill the visible prop faces, so their sides and backs block too.
  { x: 28, y: 223, width: 76, height: 50 },
  { x: 12, y: 112, width: 76, height: 78 },
  ...LIBRARY_RACK_SOLIDS,
  LIBRARY_MURAL_SOLID,
  LIBRARY_DAIS,
  LIBRARY_INSCRIPTION_SOLID,
  // North-wall gate, built like the Level 02 arch: the backing fills the wall above the doorway and
  // the two post bases block the sides, so the player can only enter through the arch opening.
  // Backing 532..628 x 80..144; posts 532..564 and 596..628, base 144..178; opening 564..596.
  { x: 532, y: 80, width: 96, height: 64 },
  { x: 532, y: 144, width: 32, height: 34 },
  { x: 596, y: 144, width: 32, height: 34 },
];

/** Fills the arch opening between the two post bases; disabled while the exit is open. */
export const LIBRARY_EXIT_THRESHOLD: LibraryRect = { x: 564, y: 144, width: 32, height: 22 };

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

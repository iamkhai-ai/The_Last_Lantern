import type { DialogueLine } from '../../../types/gameTypes';
import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import type { AuditItem } from '../../core/reachAudit';
import { BENCH_ID, BOATMAN_ID, PANEL_ID, TRAY_ID, WORKSHOP, WORKSHOP_ITEMS } from './workshopLayout';

/** What Nhinh holds. A repaired lamp is held until she gives it to the boatman. */
export type HeldItem = 'ring' | 'spring' | 'lamp' | null;

/** A part that can be taken from the tray. */
export type WorkshopPart = 'ring' | 'spring';

/** The saved state of the workshop. Every flag only moves forward. */
export interface WorkshopState {
  readonly lampInspected: boolean;
  readonly held: HeldItem;
  readonly lampRepaired: boolean;
  readonly boatmanReturned: boolean;
  readonly localLineRepaired: boolean;
  readonly assignmentReceived: boolean;
  /** Mẹ's call has played. Kept apart from the flags so a reload while the boatman walks off still plays it. */
  readonly incidentCalled: boolean;
  /** The boatman's opening line has played (it points Nhinh at the lamp on the bench). */
  readonly greeted: boolean;
}

/** The step the player is on. */
export type WorkshopStage = 'repair' | 'deliver' | 'panel' | 'depart';

/** The dialogue scripts, one per beat. `mother-work` is optional: Mẹ's own script while the lamp work goes on. */
export type WorkshopDialogueId = 'opening' | 'inspect' | 'payment' | 'incident' | 'diagnosis' | 'mother-work';

/** The journal entries the workshop writes. */
export type WorkshopJournalId = 'elaria-signal' | 'assignment';
/** What the host should do after an action. */
export type WorkshopEffect =
  | { readonly kind: 'dialogue'; readonly id: WorkshopDialogueId }
  | { readonly kind: 'toast'; readonly text: string }
  | { readonly kind: 'choosePart' }
  | { readonly kind: 'journal'; readonly id: WorkshopJournalId };

/** A new state plus the effects the host must play. */
export interface WorkshopResult {
  readonly state: WorkshopState;
  readonly effects: readonly WorkshopEffect[];
}

/** Dialogue lines from docs/scenario-v4/00-prologue.md, copied word for word. Speaker ids are the labels shown. */
export const WORKSHOP_DIALOGUE: Record<WorkshopDialogueId, DialogueLine[]> = {
  // Not in the V4 docs: added at the user's request (2026-10-25) so a new player knows where to start.
  // The second line says what the evening holds, so the lamps of the harbour have a reason from the first frame.
  opening: [
    { speaker: 'Lái đò', text: 'Cô thợ ơi, chiếc đèn bác để trên bàn rồi đấy. Xem giúp bác với.' },
    { speaker: 'Lái đò', text: 'Tối nay bác có chuyến qua sương; đèn sáng thì bác nhìn ra lối vào bến.' },
  ],
  inspect: [
    { speaker: 'Nhinh', text: 'Lõi lệch rồi. Bác có làm rơi nó không?' },
    { speaker: 'Lái đò', text: 'Sóng làm rơi. Bác chỉ cầm hộ thôi.' },
  ],
  payment: [
    { speaker: 'Lái đò', text: 'Bao nhiêu tiền công đây, cô thợ?' },
    { speaker: 'Nhinh', text: 'Trừ vào tiền đò bác chưa lấy của cháu.' },
    { speaker: 'Lái đò', text: 'Thế bác còn phải sửa đèn ở đây lâu đấy.' },
  ],
  incident: [
    { speaker: 'Mẹ', text: 'Nhinh, xem bảng kiểm với mẹ.' },
  ],
  // The five doc lines keep their wording and order; the three lines marked (added) explain where the harbour power
  // comes from, why Mẹ stays behind, and what the maintenance lamp can and cannot do.
  diagnosis: [
    { speaker: 'Nhinh', text: 'Đường trong xưởng thông rồi. Nhánh này vẫn yếu.' },
    { speaker: 'Mẹ', text: 'Từ Elaria. Lâu lắm trạm ấy mới gửi tín hiệu.' },
    // (added) where the harbour source runs.
    { speaker: 'Mẹ', text: 'Nguồn của bến đi từ rừng Elaria xuống, qua tuyến bảo trì cũ và trạm ở bìa rừng.' },
    { speaker: 'Nhinh', text: 'Con biết đọc mốc bảo trì. Con tới trạm ngoài rừng xem.' },
    // (added) why Mẹ cannot go herself.
    { speaker: 'Mẹ', text: 'Mẹ phải ở lại giữ bơm và đón thuyền. Ngoài kia còn người đợi đèn để về.' },
    { speaker: 'Mẹ', text: 'Mang bản đồ. Nếu đường hỏng thì quay về; đừng cố đi khi trời tối.' },
    { speaker: 'Nhinh', text: 'Lần này mẹ cứ để con sửa.' },
    // (added) the maintenance lamp is a test source, not the harbour's own.
    { speaker: 'Mẹ', text: 'Cầm đèn bảo trì. Nó chỉ cấp nguồn thử cho máy, không thay được nguồn của bến.' },
  ],
  // Optional, never required: Mẹ's own work in the workshop while the boatman's lamp is being fixed.
  'mother-work': [
    { speaker: 'Mẹ', text: 'Chiếc đèn nhỏ trên bàn này con thử giúp mẹ nhé.' },
    { speaker: 'Nhinh', text: 'Mẹ cho con thử việc ở trạm một lần. Con đọc được mốc bảo trì rồi.' },
    { speaker: 'Mẹ', text: 'Làm kỹ vào. Ngoài kia còn người cần đèn để về.' },
  ],
};

/** Journal text for the two entries. Written here (not in V4 docs), per 00-workshop.md. */
export const WORKSHOP_JOURNAL: Record<WorkshopJournalId, string> = {
  'elaria-signal': 'Tín hiệu bảo trì cũ từ Elaria: đường trong xưởng đã thông, đầu nguồn vẫn đứt nhịp.',
  assignment: 'Mẹ giữ bến, Nhinh kiểm tra trạm bìa rừng. Đường hỏng thì quay về, không đi đêm. Đèn bảo trì chỉ thử máy, không cấp nguồn cho bến.',
};

/** Display names of the parts, for the choice box. */
export const PART_LABELS: Record<WorkshopPart, string> = {
  ring: 'Vòng giữ',
  spring: 'Lò xo',
};

const OBJECTIVES: Record<WorkshopStage, string> = {
  repair: 'Sửa chiếc đèn của bác lái đò.',
  deliver: 'Mang đèn ra cửa cho bác lái đò.',
  panel: 'Xem bảng kiểm với mẹ.',
  depart: 'Đi tới trạm ở bìa rừng.',
};

const HELD_STATUS: Record<'ring' | 'spring' | 'lamp', string> = {
  ring: 'Đang cầm: Vòng giữ',
  spring: 'Đang cầm: Lò xo',
  lamp: 'Đang cầm: Đèn của bác lái đò',
};

const HINTS: Record<WorkshopStage, HintLadder> = {
  repair: {
    key: 'workshop:repair',
    steps: [
      'Chốt vỏ đèn đang lỏng.',
      'Tìm vòng giữ có cùng tiết diện với chốt.',
      'Lấy vòng giữ ở khay bên trái rồi nhấn E ở bàn sửa.',
    ],
  },
  deliver: {
    key: 'workshop:deliver',
    steps: [
      'Bác lái đò đang đợi ở cửa.',
      'Đèn đã sáng ổn định.',
      'Nhấn E cạnh bác lái đò.',
    ],
  },
  panel: {
    key: 'workshop:panel',
    steps: [
      'Đèn bến vừa tắt một đoạn.',
      'Bảng kiểm cạnh cửa sổ nối với đường của bến.',
      'Nhấn E ở bảng kiểm cạnh mẹ.',
    ],
  },
  depart: {
    key: 'workshop:depart',
    steps: [
      'Cửa phía nam dẫn ra bến.',
      'Mẹ giao đèn bảo trì và bản đồ.',
      'Đi ra cửa phía nam.',
    ],
  },
};

const ASSIGNMENT_HINT: HintLadder = {
  key: 'workshop:assignment',
  steps: [
    'Đường trong xưởng đã thông, nhưng mẹ còn lời dặn trước khi lên đường.',
    'Quay lại bảng kiểm để nhận đèn bảo trì và bản đồ.',
    'Nhấn E ở bảng kiểm để tiếp tục cuộc nói chuyện với mẹ.',
  ],
};

function result(state: WorkshopState, effects: readonly WorkshopEffect[] = []): WorkshopResult {
  return { state, effects };
}

function toast(text: string): WorkshopEffect {
  return { kind: 'toast', text };
}

function dialogue(id: WorkshopDialogueId): WorkshopEffect {
  return { kind: 'dialogue', id };
}

/** The state at the start of the workshop: the lamp is on the bench, nothing held. */
export function defaultWorkshopState(): WorkshopState {
  return {
    lampInspected: false,
    held: null,
    lampRepaired: false,
    boatmanReturned: false,
    localLineRepaired: false,
    assignmentReceived: false,
    incidentCalled: false,
    greeted: false,
  };
}

/**
 * Reads a saved state. Anything that is not an object gives the default. Unknown fields are treated as false
 * and an unknown held item as null. Flags that imply earlier ones are completed forward:
 * assignment, then local line, then boatman, then lamp repaired (and inspected). The held item then follows
 * the flags: the boatman's return clears it, a repaired lamp is held, and parts are kept only before repair.
 * Mẹ's call is done once the local line is repaired; before that it is done only if its own flag says so.
 * The opening line counts as played once the lamp has been inspected.
 */
export function parseWorkshopState(raw: unknown): WorkshopState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return defaultWorkshopState();
  const r = raw as Record<string, unknown>;
  const flag = (key: string): boolean => r[key] === true;

  const assignmentReceived = flag('assignmentReceived');
  const localLineRepaired = assignmentReceived || flag('localLineRepaired');
  const boatmanReturned = localLineRepaired || flag('boatmanReturned');
  const lampRepaired = boatmanReturned || flag('lampRepaired');
  const lampInspected = lampRepaired || flag('lampInspected');
  const incidentCalled = boatmanReturned && (localLineRepaired || flag('incidentCalled'));
  const greeted = lampInspected || flag('greeted');

  const rawHeld = r.held;
  const savedHeld: HeldItem = rawHeld === 'ring' || rawHeld === 'spring' || rawHeld === 'lamp' ? rawHeld : null;
  let held: HeldItem;
  if (boatmanReturned) held = null;
  else if (lampRepaired) held = 'lamp';
  else held = savedHeld === 'lamp' ? null : savedHeld;

  return { lampInspected, held, lampRepaired, boatmanReturned, localLineRepaired, assignmentReceived, incidentCalled, greeted };
}

/** True when the boatman has gone but Mẹ has not yet called Nhinh to the panel. */
export function incidentPending(s: WorkshopState): boolean {
  return s.boatmanReturned && !s.incidentCalled;
}

/** The state once Mẹ's call has played. */
export function markIncidentCalled(s: WorkshopState): WorkshopState {
  return { ...s, incidentCalled: true };
}

/** True while the boatman's opening line has not played: the first time in the room, before the lamp is looked at. */
export function openingPending(s: WorkshopState): boolean {
  return !s.greeted && !s.lampInspected;
}

/** The state once the opening line has played. */
export function markGreeted(s: WorkshopState): WorkshopState {
  return { ...s, greeted: true };
}

/** The step the player is on, from the flags alone. */
export function workshopStage(s: WorkshopState): WorkshopStage {
  if (s.assignmentReceived) return 'depart';
  if (s.boatmanReturned) return 'panel';
  if (s.lampRepaired) return 'deliver';
  return 'repair';
}

/** Prompt for the bench, or null once the lamp is repaired. */
export function benchPrompt(s: WorkshopState): string | null {
  if (s.lampRepaired) return null;
  if (s.held === 'ring') return 'E: lắp vòng giữ';
  if (s.held === 'spring') return 'E: thử lò xo';
  return 'E: xem đèn';
}

/**
 * E at the bench. The first use always plays the inspect lines (no gating: a part can be fitted without
 * looking first). A ring repairs the lamp and Nhinh holds it. A spring is refused with no loss.
 */
export function useBench(s: WorkshopState): WorkshopResult {
  if (s.lampRepaired) return result(s);
  const effects: WorkshopEffect[] = [];
  let next = s;
  if (!s.lampInspected) {
    effects.push(dialogue('inspect'));
    next = { ...next, lampInspected: true };
  }
  if (next.held === 'ring') return result({ ...next, lampRepaired: true, held: 'lamp' }, effects);
  if (next.held === 'spring') effects.push(toast('Lò xo không vừa chốt vỏ.'));
  return result(next, effects);
}

/** Prompt for the tray, or null once the lamp is repaired. */
export function trayPrompt(s: WorkshopState): string | null {
  if (s.lampRepaired) return null;
  return s.held !== null ? 'E: đặt trả linh kiện' : 'E: lấy linh kiện';
}

/** E at the tray: puts a held part back, or asks which part to take (the host then calls takePart). */
export function useTray(s: WorkshopState): WorkshopResult {
  if (s.lampRepaired) return result(s);
  if (s.held !== null) return result({ ...s, held: null });
  return result(s, [{ kind: 'choosePart' }]);
}

/** Takes a part from the tray into the hand. Refused (state unchanged) when something is already held or the lamp is repaired. */
export function takePart(s: WorkshopState, part: WorkshopPart): WorkshopResult {
  if (s.lampRepaired || s.held !== null) return result(s);
  return result({ ...s, held: part });
}

/** Prompt for the boatman, or null once he has returned. */
export function boatmanPrompt(s: WorkshopState): string | null {
  if (s.boatmanReturned) return null;
  return s.held === 'lamp' ? 'E: trả đèn' : 'E: nói chuyện';
}

/**
 * E at the boatman. With the lamp in hand he pays, then Mẹ calls Nhinh to the window panel. Without the lamp
 * he says the lamp is not ready.
 */
export function useBoatman(s: WorkshopState): WorkshopResult {
  if (s.boatmanReturned) return result(s);
  if (s.held !== 'lamp') return result(s, [toast('Đèn của bác chưa sửa xong.')]);
  return result({ ...s, boatmanReturned: true, held: null }, [dialogue('payment'), dialogue('incident')]);
}

/** Prompt for the panel. It stays until the assignment is received. */
export function panelPrompt(s: WorkshopState): string | null {
  return s.assignmentReceived ? null : 'E: kiểm tra bảng';
}

/**
 * E at the panel. Before the incident it reads normal. After it, the first use repairs the local line, writes the
 * signal note and plays the diagnosis. The note is written BEFORE the dialogue starts, so a reload in the middle of
 * the diagnosis cannot lose it. While the assignment is still pending, a repeat plays the diagnosis again and
 * re-emits the note (the host's addJournal ignores an id it already holds); completeAssignment() grants the order
 * once that dialogue ends.
 */
export function usePanel(s: WorkshopState): WorkshopResult {
  if (s.assignmentReceived) return result(s);
  if (!s.boatmanReturned) return result(s, [toast('Bảng kiểm vẫn bình thường.')]);
  const state = s.localLineRepaired ? s : { ...s, localLineRepaired: true };
  return result(state, [{ kind: 'journal', id: 'elaria-signal' }, dialogue('diagnosis')]);
}

/**
 * Grants the map and the lamp once the diagnosis is over. Idempotent: it does nothing before the local line
 * is repaired or after the assignment is granted, so a repeat cannot duplicate the journal or the toast.
 */
export function completeAssignment(s: WorkshopState): WorkshopResult {
  if (!s.localLineRepaired || s.assignmentReceived) return result(s);
  return result(
    { ...s, assignmentReceived: true },
    [{ kind: 'journal', id: 'assignment' }, toast('Nhận đèn bảo trì và bản đồ.')],
  );
}

/** Mẹ is always there. Her line depends on the step (toast only). */
export function motherPrompt(_s: WorkshopState): string | null {
  return 'E: nói chuyện';
}

/** E at Mẹ: her optional script while the lamp work goes on, then a toast that depends on the step. */
export function useMother(s: WorkshopState): WorkshopResult {
  const stage = workshopStage(s);
  if (stage === 'repair' || stage === 'deliver') return result(s, [dialogue('mother-work')]);
  if (stage === 'panel') return result(s, [toast('Mẹ đang đợi ở bảng kiểm.')]);
  return result(s, [toast('Mẹ: “Mang bản đồ. Nếu đường hỏng thì quay về.”')]);
}

/**
 * The interactable to mark next (the host's focus marker). The workshop is the first room of the game, so it points
 * the way at every step: the bench, the tray, the bench again with the ring, the boatman, then the panel once Mẹ has
 * called. A held spring points back to the tray. The panel stays marked until the assignment is received.
 */
export function workshopFocus(s: WorkshopState): readonly string[] {
  switch (workshopStage(s)) {
    case 'repair':
      if (s.held === 'ring') return [BENCH_ID];
      if (s.held === 'spring') return [TRAY_ID];
      return s.lampInspected ? [TRAY_ID] : [BENCH_ID];
    case 'deliver':
      return [BOATMAN_ID];
    case 'panel':
      return s.incidentCalled ? [PANEL_ID] : [];
    case 'depart':
      return [];
  }
}

/** The south exit opens once the assignment is received. */
export function exitOpen(s: WorkshopState): boolean {
  return s.assignmentReceived;
}

/** The HUD lines: the objective of the stage and what Nhinh holds. */
export function workshopHud(s: WorkshopState): HudText {
  return {
    objective: s.localLineRepaired && !s.assignmentReceived ? 'Nghe mẹ dặn ở bảng kiểm.' : OBJECTIVES[workshopStage(s)],
    status: s.held === null ? '' : HELD_STATUS[s.held],
  };
}

/** The hint ladder for the current step, including a diagnosis interrupted by a reload. */
export function workshopHint(s: WorkshopState): HintLadder | null {
  const stage = workshopStage(s);
  if (stage === 'panel' && s.localLineRepaired) return ASSIGNMENT_HINT;
  return HINTS[stage];
}

/** Every solid of the workshop in this state: walls, the bench, tray, panel, Mẹ, the boatman while here and the south door while closed. */
export function workshopSolids(s: WorkshopState): Rect[] {
  const solids: Rect[] = [...WORKSHOP.walls, WORKSHOP.bench, WORKSHOP.tray, WORKSHOP.panel, WORKSHOP.mother];
  if (!s.boatmanReturned) solids.push(WORKSHOP.boatman);
  if (!exitOpen(s)) solids.push(WORKSHOP.southDoor);
  return solids;
}

/** The interactables present in this state, for the reach audit. The boatman drops out after he has returned. */
export function workshopItems(s: WorkshopState): AuditItem[] {
  return WORKSHOP_ITEMS.filter(item => !(item.id === BOATMAN_ID && s.boatmanReturned));
}

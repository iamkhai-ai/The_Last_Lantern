import type { LanternState } from '../../core/lantern';
import type { TutorialStep } from '../../core/tutorial';
import { LAMP_REST_ID, S1_ID, S2_ID } from './forestEdgeLayout';

const onGround = (lantern: LanternState): boolean =>
  lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID;
const inHand = (lantern: LanternState): boolean => lantern.location.at === 'hand';
const onTestPedestal = (lantern: LanternState): boolean =>
  lantern.location.at === 'pedestal' && (lantern.location.pedestalId === S1_ID || lantern.location.pedestalId === S2_ID);

/**
 * Level 01 teaches the maintenance lantern, in order: pick it up (E), light it (F), what its light shows, the pulse
 * (Space), setting it on a test pedestal (E) and taking it back. Picking it up never lights it: the F lesson waits for
 * the player. Catalog: src/i18n/entries/forestEdge.ts.
 */
export const FOREST_EDGE_TUTORIAL: readonly TutorialStep[] = [
  {
    id: 'forest-edge-take',
    text: 'Đèn bảo trì nằm cạnh bia. Lại gần đèn và nhấn E để nhặt lên.',
    doneWhen: ({ lantern }) => !onGround(lantern),
  },
  {
    id: 'forest-edge-light',
    text: 'Nhấn F để bật đèn. Nhấn F lần nữa để tắt.',
    ready: ({ lantern }) => inHand(lantern),
    doneWhen: ({ lantern }) => lantern.on,
    doneOn: ['lantern-on'],
  },
  {
    id: 'forest-edge-see',
    text: 'Đèn chỉ soi một vùng nhỏ quanh Nhinh. Dấu khắc trên đá và cơ chế chỉ đọc được khi nằm trong vùng sáng.',
    ready: ({ lantern }) => inHand(lantern) && lantern.on,
    expireMs: 7000,
  },
  {
    id: 'forest-edge-pulse',
    text: 'Khi cầm đèn đang sáng, nhấn Space để phát xung sáng: dấu vết ẩn ở gần sẽ hiện ra. Thử đứng cạnh bia.',
    ready: ({ lantern }) => inHand(lantern),
    doneOn: ['pulsed'],
  },
  {
    id: 'forest-edge-pedestal',
    text: 'Bệ S1 và S2 là chỗ cắm đèn thử. Đứng cạnh bệ, nhấn E để đặt đèn; đèn đang sáng trên bệ sẽ cấp nguồn thử cho cơ chế gần đó.',
    doneWhen: ({ lantern }) => onTestPedestal(lantern),
  },
  {
    id: 'forest-edge-retrieve',
    text: 'Đèn đặt trên bệ không đi theo Nhinh. Nhấn E ở bệ để lấy lại đèn khi cần.',
    doneWhen: ({ lantern }) => inHand(lantern),
    expireMs: 9000,
  },
];

import { ZoneId } from '../types/gameTypes';

export interface ZonePortalDef {
  id: string;
  targetZone: ZoneId;
  x: number;
  y: number;
  label: string;
}

export interface ZoneDefinition {
  id: ZoneId;
  bgColor: number;
  dawnBgColor?: number;
  pathColor: number;
  dawnPathColor?: number;
  treeKey: string;
  bushKey: string;
  spawns: Record<ZoneId | 'default', { x: number; y: number }>;
  portals: ZonePortalDef[];
}

export const ZONE_DEFINITIONS: Record<ZoneId, ZoneDefinition> = {
  hub: {
    id: 'hub',
    bgColor: 0x132e2b,
    dawnBgColor: 0x45735c,
    pathColor: 0x2b453e,
    dawnPathColor: 0x7a8c62,
    treeKey: 'tree_hub',
    bushKey: 'bush_hub',
    spawns: {
      default: { x: 300, y: 292 },
      hub: { x: 300, y: 292 },
      woods: { x: 300, y: 78 },
      creek: { x: 565, y: 195 },
      ruins: { x: 300, y: 305 },
    },
    portals: [
      {
        id: 'portal_to_woods',
        targetZone: 'woods',
        x: 300,
        y: 44,
        label: '[E] Lối Bắc: Rừng Đom Đóm (Whispering Woods)',
      },
      {
        id: 'portal_to_creek',
        targetZone: 'creek',
        x: 598,
        y: 195,
        label: '[E] Lối Đông: Suối Trăng (Moonlit Creek)',
      },
      {
        id: 'portal_to_ruins',
        targetZone: 'ruins',
        x: 300,
        y: 330,
        label: '[E] Lối Nam: Tàn Tích Lặng Im (Silent Ruins)',
      },
    ],
  },
  woods: {
    id: 'woods',
    bgColor: 0x123832,
    pathColor: 0x3b574c,
    treeKey: 'tree_woods',
    bushKey: 'bush_woods',
    spawns: {
      default: { x: 325, y: 300 },
      hub: { x: 325, y: 300 },
      woods: { x: 325, y: 300 },
      creek: { x: 325, y: 300 },
      ruins: { x: 325, y: 300 },
    },
    portals: [
      {
        id: 'portal_woods_to_hub',
        targetZone: 'hub',
        x: 325,
        y: 332,
        label: '[E] Quay về Cây Mẹ Trung Tâm (Nam)',
      },
    ],
  },
  creek: {
    id: 'creek',
    bgColor: 0x112d3b,
    pathColor: 0x264454,
    treeKey: 'tree_creek',
    bushKey: 'bush_creek',
    spawns: {
      default: { x: 92, y: 265 },
      hub: { x: 92, y: 265 },
      woods: { x: 92, y: 265 },
      creek: { x: 92, y: 265 },
      ruins: { x: 92, y: 265 },
    },
    portals: [
      {
        id: 'portal_creek_to_hub',
        targetZone: 'hub',
        x: 46,
        y: 265,
        label: '[E] Quay về Cây Mẹ Trung Tâm (Tây)',
      },
    ],
  },
  ruins: {
    id: 'ruins',
    bgColor: 0x1d1b33,
    pathColor: 0x3f3f4f,
    treeKey: 'tree_ruins',
    bushKey: 'bush_ruins',
    spawns: {
      default: { x: 320, y: 78 },
      hub: { x: 320, y: 78 },
      woods: { x: 320, y: 78 },
      creek: { x: 320, y: 78 },
      ruins: { x: 320, y: 78 },
    },
    portals: [
      {
        id: 'portal_ruins_to_hub',
        targetZone: 'hub',
        x: 320,
        y: 44,
        label: '[E] Quay về Cây Mẹ Trung Tâm (Bắc)',
      },
    ],
  },
};

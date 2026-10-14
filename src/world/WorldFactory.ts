import Phaser from 'phaser';
import { ZoneId } from '../types/gameTypes';
import { ZONE_DEFINITIONS } from './zoneDefinitions';

export interface BuiltZoneObjects {
  colliders: Phaser.Physics.Arcade.StaticGroup;
  bridgeBlocker?: Phaser.GameObjects.Zone;
  heartTreeSprite?: Phaser.GameObjects.Sprite;
  introFootprints: Phaser.GameObjects.Image[];
  treeSprites: Phaser.GameObjects.Image[];
  bushSprites: Phaser.GameObjects.Image[];
}

export class WorldFactory {
  public static buildZone(
    scene: Phaser.Scene,
    zoneId: ZoneId,
    crystalCount: number,
    isDawn: boolean
  ): BuiltZoneObjects {
    const def = ZONE_DEFINITIONS[zoneId];
    const colliders = scene.physics.add.staticGroup();
    const introFootprints: Phaser.GameObjects.Image[] = [];
    const treeSprites: Phaser.GameObjects.Image[] = [];
    const bushSprites: Phaser.GameObjects.Image[] = [];

    // 1. Ground backdrop with subtle pixel noise & winding paths matching reference art
    const bg = scene.add.graphics();
    bg.setDepth(1);
    const groundHex = isDawn && def.dawnBgColor ? def.dawnBgColor : def.bgColor;
    bg.fillStyle(groundHex, 1);
    bg.fillRect(0, 0, 640, 360);

    // Subtle pixel-art dither patches on ground
    const patchColor = isDawn ? 0x548365 : zoneId === 'ruins' ? 0x252240 : 0x173934;
    bg.fillStyle(patchColor, 0.45);
    for (let i = 0; i < 95; i++) {
      const px = ((i * 73) % 620) + 10;
      const py = ((i * 47) % 340) + 10;
      bg.fillRect(px, py, 6, 4);
    }

    // 2. Zone-specific paths, river, or courtyard geometry
    const pathHex = isDawn && def.dawnPathColor ? def.dawnPathColor : def.pathColor;

    if (zoneId === 'hub') {
      bg.fillStyle(pathHex, 0.85);
      bg.beginPath();
      bg.moveTo(275, 360);
      bg.lineTo(265, 140);
      bg.lineTo(318, 40);
      bg.lineTo(342, 40);
      bg.lineTo(355, 165);
      bg.lineTo(345, 360);
      bg.closePath();
      bg.fillPath();

      bg.beginPath();
      bg.moveTo(335, 178);
      bg.lineTo(640, 178);
      bg.lineTo(640, 212);
      bg.lineTo(335, 212);
      bg.closePath();
      bg.fillPath();
    } else if (zoneId === 'woods') {
      bg.fillStyle(pathHex, 0.9);
      bg.beginPath();
      bg.moveTo(246, 360);
      bg.lineTo(276, 240);
      bg.lineTo(255, 175);
      bg.lineTo(288, 138);
      bg.lineTo(335, 175);
      bg.lineTo(395, 360);
      bg.closePath();
      bg.fillPath();
    } else if (zoneId === 'creek') {
      bg.fillStyle(pathHex, 0.75);
      bg.beginPath();
      bg.moveTo(255, 250);
      bg.lineTo(288, 140);
      bg.lineTo(345, 195);
      bg.lineTo(275, 275);
      bg.closePath();
      bg.fillPath();

      bg.fillStyle(0x163859, 1);
      bg.beginPath();
      bg.moveTo(450, 0);
      bg.lineTo(640, 0);
      bg.lineTo(640, 175);
      bg.lineTo(360, 360);
      bg.lineTo(185, 360);
      bg.closePath();
      bg.fillPath();

      bg.lineStyle(2, 0x2b5c80, 0.8);
      bg.beginPath();
      bg.moveTo(450, 0);
      bg.lineTo(185, 360);
      bg.strokePath();
    } else if (zoneId === 'ruins') {
      bg.fillStyle(pathHex, 0.92);
      bg.beginPath();
      bg.moveTo(160, 205);
      bg.lineTo(345, 115);
      bg.lineTo(540, 195);
      bg.lineTo(445, 345);
      bg.lineTo(215, 345);
      bg.closePath();
      bg.fillPath();

      bg.fillRect(292, 0, 56, 145);
    }

    // 3. Decorative non-colliding grass tufts, mushrooms, and flowers
    for (let i = 0; i < 42; i++) {
      const gx = 32 + ((i * 97 + 19) % 576);
      const gy = 36 + ((i * 61 + 23) % 288);

      if (zoneId === 'creek' && gx > 250 && gy > 150 && gx + gy * 0.7 > 430) {
        continue;
      }

      const tuft = scene.add.image(gx, gy, 'tuft_grass');
      tuft.setDepth(2);
      if (zoneId === 'ruins') tuft.setTint(0x6e5e99);
      if (isDawn) tuft.setTint(0x87b26e);

      if (i % 3 === 0) {
        const mushKey = i % 6 === 0 ? 'mushroom_cyan' : 'mushroom_warm';
        const mx = Math.min(610, gx + 14);
        const my = Math.min(335, gy + 6);
        const mush = scene.add.image(mx, my, mushKey);
        mush.setDepth(3);
      }
    }

    // 4. Border canopy trees & bushes with real physics colliders
    const treeKey = isDawn ? 'tree_dawn' : def.treeKey;
    const bushKey = isDawn ? 'bush_dawn' : def.bushKey;

    const addTreeBlocker = (tx: number, ty: number) => {
      const tree = scene.add.image(tx, ty, treeKey);
      tree.setDepth(8 + Math.floor(ty / 12));
      treeSprites.push(tree);
      const block = scene.add.zone(tx, ty + 10, 42, 30);
      scene.physics.add.existing(block, true);
      colliders.add(block);
    };

    const borderTrees: Array<[number, number]> = [
      [22, 48],
      [28, 125],
      [18, 210],
      [34, 305],
      [615, 52],
      [612, 125],
      [618, 295],
      [96, 22],
      [185, 18],
      [430, 20],
      [530, 24],
    ];

    for (const [tx, ty] of borderTrees) {
      if (zoneId === 'creek' && tx < 60 && ty > 180) continue;
      addTreeBlocker(tx, ty);
    }

    if (zoneId !== 'hub') {
      addTreeBlocker(615, 205);
    }

    const bushCoords: Array<[number, number]> = [
      [58, 326],
      [175, 338],
      [425, 336],
      [540, 328],
    ];
    for (const [bx, by] of bushCoords) {
      const b = scene.add.image(bx, by, bushKey);
      b.setDepth(28);
      bushSprites.push(b);
    }

    let heartTreeSprite: Phaser.GameObjects.Sprite | undefined;
    let bridgeBlocker: Phaser.GameObjects.Zone | undefined;

    if (zoneId === 'hub') {
      const texKey = isDawn
        ? 'heart_tree_dawn'
        : `heart_tree_${Math.min(3, crystalCount)}`;
      heartTreeSprite = scene.add.sprite(315, 125, texKey);
      heartTreeSprite.setDepth(16);

      const trunkCollider = scene.add.zone(315, 132, 54, 42);
      scene.physics.add.existing(trunkCollider, true);
      colliders.add(trunkCollider);

      const footprintPts: Array<[number, number]> = [
        [245, 265],
        [262, 248],
        [278, 232],
        [295, 215],
      ];
      for (const [fx, fy] of footprintPts) {
        const fp = scene.add.image(fx, fy, 'particle_firefly');
        fp.setDepth(5);
        fp.setScale(1.1);
        fp.setTint(0x7df2d4);
        fp.setVisible(false);
        introFootprints.push(fp);
      }
    } else if (zoneId === 'woods') {
      addTreeBlocker(92, 105);
      addTreeBlocker(548, 95);

      const gateCollider = scene.add.zone(370, 118, 88, 36);
      scene.physics.add.existing(gateCollider, true);
      colliders.add(gateCollider);
    } else if (zoneId === 'creek') {
      const upperWater = scene.add.zone(455, 82, 95, 145);
      scene.physics.add.existing(upperWater, true);
      colliders.add(upperWater);

      const lowerWater = scene.add.zone(262, 318, 105, 95);
      scene.physics.add.existing(lowerWater, true);
      colliders.add(lowerWater);

      bridgeBlocker = scene.add.zone(375, 205, 96, 86);
      scene.physics.add.existing(bridgeBlocker, true);
      colliders.add(bridgeBlocker);
    } else if (zoneId === 'ruins') {
      const pillarPositions: Array<[number, number]> = [
        [165, 168],
        [305, 118],
        [458, 138],
        [516, 216],
      ];
      for (const [px, py] of pillarPositions) {
        const p = scene.add.image(px, py, 'ruin_pillar');
        p.setDepth(15 + Math.floor(py / 20));
        const pCol = scene.add.zone(px, py + 12, 24, 20);
        scene.physics.add.existing(pCol, true);
        colliders.add(pCol);
      }

      const flowerPositions: Array<[number, number]> = [
        [255, 224],
        [415, 214],
        [162, 294],
        [468, 292],
      ];
      for (const [fx, fy] of flowerPositions) {
        const fl = scene.add.image(fx, fy, 'ruins_flower');
        fl.setDepth(12);
      }
    }

    return {
      colliders,
      bridgeBlocker,
      heartTreeSprite,
      introFootprints,
      treeSprites,
      bushSprites,
    };
  }
}

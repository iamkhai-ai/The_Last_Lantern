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

    // 1. Ground backdrop with subtle pixel noise & winding paths matching Redesigned Art Pack
    const bg = scene.add.graphics();
    bg.setDepth(1);
    const groundHex = isDawn && def.dawnBgColor ? def.dawnBgColor : def.bgColor;
    bg.fillStyle(groundHex, 1);
    bg.fillRect(0, 0, 640, 360);

    const patchColor = isDawn ? 0x5c9654 : zoneId === 'ruins' ? 0x252240 : 0x173934;
    bg.fillStyle(patchColor, 0.45);
    for (let i = 0; i < 95; i++) {
      const px = ((i * 73) % 620) + 10;
      const py = ((i * 47) % 340) + 10;
      bg.fillRect(px, py, 6, 4);
    }

    const pathHex = isDawn && def.dawnPathColor ? def.dawnPathColor : def.pathColor;

    // 2. Zone-specific architecture matching Redesigned Art Pack (03..07)
    if (zoneId === 'hub') {
      // Sanctuary lily ponds on lower-left and lower-right (06_Heart_Tree_Sanctuary.png)
      // Stone rim + deep water + moon glint so they read as ponds, not flat discs.
      for (const [px, py] of [[125, 285], [505, 285]] as Array<[number, number]>) {
        bg.fillStyle(isDawn ? 0x6b7a72 : 0x3a4a4c, 0.95);
        bg.fillCircle(px, py, 50);
        bg.fillStyle(isDawn ? 0x3b8c9e : 0x133b4a, 0.95);
        bg.fillCircle(px, py, 45);
        bg.fillStyle(isDawn ? 0x54aec2 : 0x1d5568, 0.9);
        bg.fillCircle(px - 8, py - 9, 26);
        // pale moon-glint arc on the water
        bg.lineStyle(2, isDawn ? 0xd9f2ff : 0x9ad9ea, 0.55);
        bg.beginPath();
        bg.arc(px - 6, py - 6, 30, Math.PI * 1.15, Math.PI * 1.55);
        bg.strokePath();
        // lily pads
        bg.fillStyle(isDawn ? 0x5da24a : 0x3f7d44, 0.95);
        bg.fillCircle(px - 18, py + 12, 7);
        bg.fillCircle(px + 16, py + 8, 6);
        bg.fillCircle(px + 2, py + 20, 5);
        bg.fillStyle(isDawn ? 0xfff9e6 : 0xf2f5e6, 0.95);
        bg.fillCircle(px + 16, py + 8, 2);
      }

      // Concentric circular stone sanctuary plaza around the Heart Tree
      bg.fillStyle(isDawn ? 0x7d8570 : 0x384547, 0.92);
      bg.fillCircle(315, 175, 84);
      bg.lineStyle(2, isDawn ? 0xd9c27e : 0x56686b, 0.85);
      bg.strokeCircle(315, 175, 82);
      bg.strokeCircle(315, 175, 64);

      // North-South & East stone walkways
      bg.fillStyle(pathHex, 0.9);
      bg.fillRect(284, 36, 62, 324);
      bg.fillRect(315, 176, 325, 38);

      // Hooded Guardian Statues flanking the Sanctuary Plaza (06_Heart_Tree_Sanctuary.png)
      const leftStatue = scene.add.image(226, 152, 'guardian_statue');
      leftStatue.setDepth(15);
      const rightStatue = scene.add.image(404, 152, 'guardian_statue');
      rightStatue.setDepth(15);
    } else if (zoneId === 'woods') {
      // Cascading forest brook & wooden plank bridge (03_Whispering_Woods.png)
      bg.fillStyle(0x1b5263, 0.9);
      bg.beginPath();
      bg.moveTo(415, 180);
      bg.lineTo(465, 180);
      bg.lineTo(440, 360);
      bg.lineTo(385, 360);
      bg.closePath();
      bg.fillPath();

      // Flagged forest paths leading to the 3 runestones & Circular Sun-Gate
      bg.fillStyle(pathHex, 0.92);
      bg.beginPath();
      bg.moveTo(255, 360);
      bg.lineTo(275, 235);
      bg.lineTo(162, 204);
      bg.lineTo(265, 128);
      bg.lineTo(370, 145);
      bg.lineTo(520, 204);
      bg.lineTo(385, 360);
      bg.closePath();
      bg.fillPath();

      // Wooden plank bridge detail across the brook
      bg.fillStyle(0x6e472b, 1);
      bg.fillRect(402, 206, 52, 20);
      bg.lineStyle(1.5, 0x3d2514, 0.9);
      bg.strokeRect(402, 206, 52, 20);
    } else if (zoneId === 'creek') {
      // Stone terraces on West & East banks + diagonal Moonlit Creek (04_Moonlit_Creek.png)
      bg.fillStyle(pathHex, 0.82);
      bg.fillRect(40, 80, 240, 220);

      bg.fillStyle(0x163f5e, 1);
      bg.beginPath();
      bg.moveTo(450, 0);
      bg.lineTo(640, 0);
      bg.lineTo(640, 175);
      bg.lineTo(360, 360);
      bg.lineTo(185, 360);
      bg.closePath();
      bg.fillPath();

      bg.lineStyle(2, 0x4ba3c7, 0.75);
      bg.beginPath();
      bg.moveTo(450, 0);
      bg.lineTo(185, 360);
      bg.strokePath();
    } else if (zoneId === 'ruins') {
      // Ancient elevated stone masonry courtyard (05_Silent_Ruins.png)
      bg.fillStyle(pathHex, 0.94);
      bg.beginPath();
      bg.moveTo(155, 205);
      bg.lineTo(345, 110);
      bg.lineTo(545, 195);
      bg.lineTo(450, 345);
      bg.lineTo(210, 345);
      bg.closePath();
      bg.fillPath();

      bg.fillRect(292, 0, 56, 145);

      // Carved floor Sun & Moon emblem rings matching 05_Silent_Ruins.png
      bg.lineStyle(1.5, 0xd9a84e, 0.55);
      bg.strokeCircle(205, 228, 22);
      bg.lineStyle(1.5, 0x8ca8e8, 0.65);
      bg.strokeCircle(320, 260, 24);
      bg.lineStyle(1.5, 0xd9a84e, 0.55);
      bg.strokeCircle(435, 228, 22);
    }

    // 3. Decorative grass tufts, glowing spotted cyan mushrooms & woodland flowers
    for (let i = 0; i < 40; i++) {
      const gx = 34 + ((i * 97 + 19) % 572);
      const gy = 38 + ((i * 61 + 23) % 284);

      if (zoneId === 'creek' && gx > 250 && gy > 150 && gx + gy * 0.7 > 430) {
        continue;
      }

      const tuft = scene.add.image(gx, gy, 'tuft_grass');
      tuft.setDepth(2);
      if (zoneId === 'ruins') tuft.setTint(0x6e5e99);
      if (isDawn) tuft.setTint(0x87b26e);

      if (i % 3 === 0) {
        const mushKey = i % 6 === 0 ? 'mushroom_cyan' : 'mushroom_warm';
        const mx = Math.min(608, gx + 14);
        const my = Math.min(332, gy + 6);
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
      heartTreeSprite = scene.add.sprite(315, 122, texKey);
      heartTreeSprite.setDepth(16);

      const trunkCollider = scene.add.zone(315, 130, 54, 40);
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

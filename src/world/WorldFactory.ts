import Phaser from 'phaser';
import { ZoneId } from '../types/gameTypes';
import { ZONE_DEFINITIONS } from './zoneDefinitions';

export interface BuiltZoneObjects {
  colliders: Phaser.Physics.Arcade.StaticGroup;
  bridgeBlocker?: Phaser.GameObjects.Zone;
  heartTreeSprite?: Phaser.GameObjects.Sprite;
  canopySprite?: Phaser.GameObjects.Image;
  introFootprints: Phaser.GameObjects.Image[];
  treeSprites: Phaser.GameObjects.Image[];
  bushSprites: Phaser.GameObjects.Image[];
  waterTiles: Phaser.GameObjects.TileSprite[];
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

    // 1. Ground layers (same depth, creation order = draw order):
    //    bgBase (flat safety color) -> atlas tileSprite textures -> bg (detail strokes).
    // Shapes keep the EXACT legacy coordinates so collisions/spawns never move.
    const bgBase = scene.add.graphics();
    bgBase.setDepth(1);
    const groundHex = isDawn && def.dawnBgColor ? def.dawnBgColor : def.bgColor;
    bgBase.fillStyle(groundHex, 1);
    bgBase.fillRect(0, 0, 640, 360);

    const waterTiles: Phaser.GameObjects.TileSprite[] = [];

    const addTiles = (
      tex: string,
      tint: number | null,
      shape: (g: Phaser.GameObjects.Graphics) => void
    ): void => {
      const ts = scene.add.tileSprite(0, 0, 640, 360, tex);
      ts.setOrigin(0, 0);
      ts.setDepth(1);
      if (tint !== null) ts.setTint(tint);
      const mg = scene.make.graphics({ x: 0, y: 0 }, false);
      mg.fillStyle(0xffffff, 1);
      shape(mg);
      ts.setMask(mg.createGeometryMask());
      if (tex === 'tile_water' || tex === 'tile_water_b' || tex === 'tile_water_c') {
        waterTiles.push(ts);
      }
    };

    const WARM = 0xffe2b8;
    // Night tints pull bright daytime atlas art into the night mood;
    // the lantern overlay + dawn wash do the rest.
    const NIGHT_GRASS = 0x5f7a5f;
    const NIGHT_CREEK_GRASS = 0x5a7a8c;
    // Full-screen textured base per zone (ruins sits on dark stone, creek on moonlit grass)
    if (zoneId === 'ruins') {
      addTiles('ground_stone', isDawn ? WARM : 0x5f5f76, (g) => {
        g.fillRect(0, 0, 640, 360);
      });
    } else if (zoneId === 'creek') {
      addTiles('ground_grass', isDawn ? WARM : NIGHT_CREEK_GRASS, (g) => {
        g.fillRect(0, 0, 640, 360);
      });
    } else {
      addTiles('ground_grass', isDawn ? WARM : NIGHT_GRASS, (g) => {
        g.fillRect(0, 0, 640, 360);
      });
    }

    // Detail graphics drawn ON TOP of the tiles.
    const bg = scene.add.graphics();
    bg.setDepth(1);

    // 2. Zone-specific architecture matching Redesigned Art Pack (03..07)
    if (zoneId === 'hub') {
      // Sanctuary lily ponds: atlas water texture + stone rim + moon glint + lily pads.
      addTiles('tile_water', null, (g) => {
        g.fillCircle(125, 285, 45);
        g.fillCircle(505, 285, 45);
      });
      for (const [px, py] of [[125, 285], [505, 285]] as Array<[number, number]>) {
        bg.lineStyle(4, isDawn ? 0x8a8578 : 0x3a4a4c, 0.95);
        bg.strokeCircle(px, py, 47);
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
      addTiles('ground_stone', isDawn ? WARM : 0xb0b0bc, (g) => {
        g.fillCircle(315, 175, 84);
        g.fillRect(284, 36, 62, 324);
        g.fillRect(315, 176, 325, 38);
      });
      bg.lineStyle(2, isDawn ? 0xd9c27e : 0x56686b, 0.85);
      bg.strokeCircle(315, 175, 82);
      bg.strokeCircle(315, 175, 64);

      // North-South & East stone walkways (texture above, edging below)
      bg.lineStyle(2, isDawn ? 0x9a917a : 0x4e5a58, 0.9);
      bg.strokeRect(284, 36, 62, 324);
      bg.strokeRect(315, 176, 325, 38);

      // Hooded Guardian Statues flanking the Sanctuary Plaza (06_Heart_Tree_Sanctuary.png)
      const leftStatue = scene.add.image(226, 152, 'guardian_statue');
      leftStatue.setDepth(15);
      const rightStatue = scene.add.image(404, 152, 'guardian_statue');
      rightStatue.setDepth(15);

      // Hanging paper lanterns along the outer grass (atlas variants, gentle sway)
      const lanternKeys = ['lantern_hang_1', 'lantern_hang_2', 'lantern_hang_3'].filter((k) =>
        scene.textures.exists(k)
      );
      const lanternSpots: Array<[number, number]> = [
        [258, 190],
        [372, 150],
        [540, 250],
      ];
      lanternSpots.forEach(([lx, ly], li) => {
        if (lanternKeys.length === 0) return;
        const lamp = scene.add.image(lx, ly, lanternKeys[li % lanternKeys.length]);
        lamp.setDepth(14);
        scene.tweens.add({
          targets: lamp,
          y: ly - 3,
          duration: 1400 + li * 250,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    } else if (zoneId === 'woods') {
      // Cascading forest brook & wooden plank bridge (03_Whispering_Woods.png)
      addTiles('tile_water', null, (g) => {
        g.beginPath();
        g.moveTo(415, 180);
        g.lineTo(465, 180);
        g.lineTo(440, 360);
        g.lineTo(385, 360);
        g.closePath();
        g.fillPath();
      });
      // Brook banks
      bg.lineStyle(2, 0x2e6b80, 0.85);
      bg.beginPath();
      bg.moveTo(415, 180);
      bg.lineTo(465, 180);
      bg.lineTo(440, 360);
      bg.lineTo(385, 360);
      bg.closePath();
      bg.strokePath();

      // Flagged forest paths leading to the 3 runestones & Circular Sun-Gate
      addTiles('ground_dirt', isDawn ? WARM : 0x9a938a, (g) => {
        g.beginPath();
        g.moveTo(255, 360);
        g.lineTo(275, 235);
        g.lineTo(162, 204);
        g.lineTo(265, 128);
        g.lineTo(370, 145);
        g.lineTo(520, 204);
        g.lineTo(385, 360);
        g.closePath();
        g.fillPath();
      });
      // Path edging
      bg.lineStyle(1.5, 0x2c463e, 0.9);
      bg.beginPath();
      bg.moveTo(255, 360);
      bg.lineTo(275, 235);
      bg.lineTo(162, 204);
      bg.lineTo(265, 128);
      bg.lineTo(370, 145);
      bg.lineTo(520, 204);
      bg.lineTo(385, 360);
      bg.closePath();
      bg.strokePath();

      // Wooden plank bridge detail across the brook
      bg.fillStyle(0x6e472b, 1);
      bg.fillRect(402, 206, 52, 20);
      bg.lineStyle(1.5, 0x3d2514, 0.9);
      bg.strokeRect(402, 206, 52, 20);
    } else if (zoneId === 'creek') {
      // Stone terraces on West & East banks + diagonal Moonlit Creek (04_Moonlit_Creek.png)
      addTiles('ground_stone', isDawn ? WARM : 0x8a98a8, (g) => {
        g.fillRect(40, 80, 240, 220);
      });
      bg.lineStyle(2, 0x34566a, 0.9);
      bg.strokeRect(40, 80, 240, 220);

      addTiles('tile_water', null, (g) => {
        g.beginPath();
        g.moveTo(450, 0);
        g.lineTo(640, 0);
        g.lineTo(640, 175);
        g.lineTo(360, 360);
        g.lineTo(185, 360);
        g.closePath();
        g.fillPath();
      });

      bg.lineStyle(2, 0x4ba3c7, 0.75);
      bg.beginPath();
      bg.moveTo(450, 0);
      bg.lineTo(185, 360);
      bg.strokePath();
    } else if (zoneId === 'ruins') {
      // Ancient elevated stone masonry courtyard (05_Silent_Ruins.png)
      // Lighter slab texture so the courtyard lifts off the dark stone base.
      addTiles('ground_stone', isDawn ? WARM : 0xffffff, (g) => {
        g.beginPath();
        g.moveTo(155, 205);
        g.lineTo(345, 110);
        g.lineTo(545, 195);
        g.lineTo(450, 345);
        g.lineTo(210, 345);
        g.closePath();
        g.fillPath();
        g.fillRect(292, 0, 56, 145);
      });
      // Courtyard masonry outline
      bg.lineStyle(2, 0x565668, 0.9);
      bg.beginPath();
      bg.moveTo(155, 205);
      bg.lineTo(345, 110);
      bg.lineTo(545, 195);
      bg.lineTo(450, 345);
      bg.lineTo(210, 345);
      bg.closePath();
      bg.strokePath();

      bg.fillRect(292, 0, 56, 145);
      bg.lineStyle(1.5, 0x565668, 0.9);
      bg.strokeRect(292, 0, 56, 145);

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
    // Alternate primary / alt sprites for variety (deterministic by index).
    const treeKey = isDawn ? 'tree_dawn' : def.treeKey;
    const bushKey = isDawn ? 'bush_dawn' : def.bushKey;
    const hasTreeAlt = scene.textures.exists('tree_alt');
    const hasBushAlt = scene.textures.exists('bush_alt');
    const altTint =
      zoneId === 'ruins' ? 0xc79ad8 : isDawn ? 0xffe0b0 : null;

    const addTreeBlocker = (tx: number, ty: number, useAlt: boolean) => {
      const key = useAlt && hasTreeAlt ? 'tree_alt' : treeKey;
      const tree = scene.add.image(tx, ty, key);
      if (useAlt && hasTreeAlt && altTint !== null) tree.setTint(altTint);
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

    let treeIdx = 0;
    for (const [tx, ty] of borderTrees) {
      if (zoneId === 'creek' && tx < 60 && ty > 180) continue;
      addTreeBlocker(tx, ty, treeIdx % 2 === 1);
      treeIdx++;
    }

    if (zoneId !== 'hub') {
      addTreeBlocker(615, 205, false);
    }

    const bushCoords: Array<[number, number]> = [
      [58, 326],
      [175, 338],
      [425, 336],
      [540, 328],
    ];
    bushCoords.forEach(([bx, by], idx) => {
      const useAlt = hasBushAlt && idx % 2 === 1;
      const b = scene.add.image(bx, by, useAlt ? 'bush_alt' : bushKey);
      if (useAlt && altTint !== null) b.setTint(altTint);
      b.setDepth(28);
      bushSprites.push(b);
    });

    let heartTreeSprite: Phaser.GameObjects.Sprite | undefined;
    let canopySprite: Phaser.GameObjects.Image | undefined;
    let bridgeBlocker: Phaser.GameObjects.Zone | undefined;

    if (zoneId === 'hub') {
      const texKey = isDawn
        ? 'heart_tree_dawn'
        : `heart_tree_${Math.min(3, crystalCount)}`;
      heartTreeSprite = scene.add.sprite(315, 122, texKey);
      heartTreeSprite.setDepth(16);

      // Atlas foliage canopy over the trunk top, synced to crystal stage.
      const canopyKey = isDawn
        ? 'canopy_dawn'
        : `canopy_${Math.min(3, crystalCount)}`;
      if (scene.textures.exists(canopyKey)) {
        canopySprite = scene.add.image(315, 52, canopyKey);
        canopySprite.setDepth(15);
      }

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
      addTreeBlocker(92, 105, true);
      addTreeBlocker(548, 95, true);

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
      canopySprite,
      introFootprints,
      treeSprites,
      bushSprites,
      waterTiles,
    };
  }
}

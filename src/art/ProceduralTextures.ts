import Phaser from 'phaser';

export class ProceduralTextures {
  public static generateAll(scene: Phaser.Scene): void {
    this.createLumoTextures(scene);
    this.createHeartTreeTextures(scene);
    this.createEnvironmentTextures(scene);
    this.createPuzzleTextures(scene);
    this.createLightingAndParticles(scene);
  }

  private static createCanvas(
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): void {
    if (scene.textures.exists(key)) return;
    const canvasTex = scene.textures.createCanvas(key, width, height);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    drawFn(ctx, width, height);
    canvasTex.refresh();
  }

  private static createLumoTextures(scene: Phaser.Scene): void {
    // Matches 01_Character_Style_Guide.png:
    // Long translucent cyan-mint fairy ears/wings (#7df2d4) with golden tips,
    // glowing golden-cream body (#fff3b0), and two dark oval eyes.
    for (let f = 0; f < 2; f++) {
      this.createCanvas(scene, `lumo_${f}`, 28, 28, (ctx) => {
        const wingLift = f === 0 ? 0 : -1.5;

        const grad = ctx.createRadialGradient(14, 16, 2, 14, 16, 12);
        grad.addColorStop(0, 'rgba(255, 245, 176, 0.95)');
        grad.addColorStop(0.55, 'rgba(125, 242, 212, 0.45)');
        grad.addColorStop(1, 'rgba(125, 242, 212, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 28, 28);

        // Long fairy ears/wings in glowing cyan-mint (#7df2d4)
        ctx.fillStyle = '#7df2d4';
        // Left ear/wing
        ctx.beginPath();
        ctx.moveTo(12, 13);
        ctx.lineTo(5, 4 + wingLift);
        ctx.lineTo(9, 14);
        ctx.closePath();
        ctx.fill();

        // Right ear/wing
        ctx.beginPath();
        ctx.moveTo(16, 13);
        ctx.lineTo(23, 4 + wingLift);
        ctx.lineTo(19, 14);
        ctx.closePath();
        ctx.fill();

        // Golden wing tips
        ctx.fillStyle = '#ffe680';
        ctx.fillRect(5, 4 + wingLift, 2, 2);
        ctx.fillRect(21, 4 + wingLift, 2, 2);

        // Glowing golden-cream head/body
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.arc(14, 16, 5.2, 0, Math.PI * 2);
        ctx.fill();

        // Two expressive dark oval eyes
        ctx.fillStyle = '#1b2624';
        ctx.fillRect(11.5, 15, 1.5, 2.2);
        ctx.fillRect(15, 15, 1.5, 2.2);
      });
    }
  }

  private static createHeartTreeTextures(scene: Phaser.Scene): void {
    // Matches 06_Heart_Tree_Sanctuary.png & 07_The_Last_Dawn.png:
    // Colossal ancient tree with spreading branches, glowing golden light-veins,
    // carved stone Sanctuary Shrine Altar at the roots, and a glowing Golden Heart in Dawn mode!
    const variants: Array<{ key: string; stage: number; dawn: boolean }> = [
      { key: 'heart_tree_0', stage: 0, dawn: false },
      { key: 'heart_tree_1', stage: 1, dawn: false },
      { key: 'heart_tree_2', stage: 2, dawn: false },
      { key: 'heart_tree_3', stage: 3, dawn: false },
      { key: 'heart_tree_dawn', stage: 3, dawn: true },
    ];

    for (const v of variants) {
      this.createCanvas(scene, v.key, 220, 210, (ctx) => {
        // 1. Background aura
        if (v.dawn || v.stage >= 1) {
          const auraRadius = v.dawn ? 105 : 55 + v.stage * 12;
          const auraGrad = ctx.createRadialGradient(110, 105, 10, 110, 105, auraRadius);
          if (v.dawn) {
            auraGrad.addColorStop(0, 'rgba(255, 238, 165, 0.85)');
            auraGrad.addColorStop(0.55, 'rgba(255, 205, 105, 0.35)');
            auraGrad.addColorStop(1, 'rgba(255, 200, 90, 0)');
          } else {
            auraGrad.addColorStop(0, 'rgba(255, 215, 120, 0.38)');
            auraGrad.addColorStop(1, 'rgba(92, 214, 184, 0)');
          }
          ctx.fillStyle = auraGrad;
          ctx.fillRect(0, 0, 220, 210);
        }

        // 2. Canopy is a separate atlas-composited sprite (canopy_0..3/dawn)
        // placed over the trunk top by WorldFactory — nothing drawn here
        // except the glow aura above, so stages stay in sync.

        // 3. Gnarled ancient trunk & spreading roots (06_Heart_Tree_Sanctuary.png)
        const barkBase = v.dawn ? '#6e4e2e' : '#5a4632';
        const barkDark = v.dawn ? '#4e3520' : '#3d2f22';
        const barkLight = v.dawn ? '#9c7144' : '#7a5f42';
        const barkHi = v.dawn ? '#c09a5e' : '#9a7a52';
        const mossC = v.dawn ? '#5da24a' : '#4c7d40';

        // Trunk body (warm brown, wider + more tapered than before)
        ctx.fillStyle = barkBase;
        ctx.beginPath();
        ctx.moveTo(70, 34);
        ctx.lineTo(150, 34);
        ctx.lineTo(160, 148);
        ctx.lineTo(60, 148);
        ctx.closePath();
        ctx.fill();

        // Vertical bark plates: alternating ridge / groove / highlight
        const ridges = [66, 78, 90, 102, 114, 126, 138];
        for (let ri = 0; ri < ridges.length; ri++) {
          const rx = ridges[ri];
          const spread = (rx - 110) * 0.12;
          // groove shadow on the right side of each plate
          ctx.fillStyle = barkDark;
          ctx.fillRect(rx + 7 + spread, 36, 3, 108);
          // plate face
          ctx.fillStyle = ri % 2 === 0 ? barkBase : barkLight;
          ctx.fillRect(rx + spread, 36, 7, 108);
          // 1px rim light on the left edge of each plate
          ctx.fillStyle = barkHi;
          ctx.fillRect(rx + spread, 36, 1, 108);
        }

        // Bark knots (dark oval + lighter ring)
        const knots: Array<[number, number, number]> = [
          [84, 66, 5],
          [136, 96, 6],
          [102, 122, 4],
        ];
        for (const [kx, ky, kr] of knots) {
          ctx.fillStyle = barkDark;
          ctx.beginPath();
          ctx.ellipse(kx, ky, kr + 1.5, kr + 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = barkLight;
          ctx.beginPath();
          ctx.ellipse(kx, ky, kr - 1, kr, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = barkDark;
          ctx.beginPath();
          ctx.ellipse(kx, ky, 1.8, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Moss patches creeping up the trunk edges + root crowns
        ctx.fillStyle = mossC;
        const mossBlobs: Array<[number, number, number, number]> = [
          [64, 120, 9, 6],
          [70, 140, 12, 7],
          [156, 118, 9, 6],
          [150, 142, 12, 7],
          [76, 52, 7, 5],
          [144, 58, 8, 5],
          [110, 146, 16, 7],
        ];
        for (const [mx, my, mrw, mrh] of mossBlobs) {
          ctx.beginPath();
          ctx.ellipse(mx, my, mrw, mrh, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Thick tapered surface roots (filled quads, not strokes)
        const rootQuads: Array<[number, number, number, number, number, number, number, number]> = [
          [72, 118, 86, 118, 44, 182, 28, 184],
          [86, 126, 98, 126, 62, 184, 50, 184],
          [96, 132, 106, 132, 82, 184, 72, 184],
          [114, 132, 124, 132, 148, 184, 138, 184],
          [122, 126, 134, 126, 170, 184, 158, 184],
          [134, 118, 148, 118, 192, 182, 178, 184],
        ];
        for (const [ax, ay, bx, by, cx, cy, dx, dy] of rootQuads) {
          ctx.fillStyle = barkBase;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.lineTo(cx, cy);
          ctx.lineTo(dx, dy);
          ctx.closePath();
          ctx.fill();
          // center ridge highlight along each root
          ctx.strokeStyle = barkHi;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo((ax + bx) / 2, ay);
          ctx.lineTo((cx + dx) / 2, cy);
          ctx.stroke();
          // moss cap on each root tip
          ctx.fillStyle = mossC;
          ctx.beginPath();
          ctx.ellipse((cx + dx) / 2, cy - 1, 7, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hanging vines + leaves from the canopy rim
        ctx.strokeStyle = mossC;
        ctx.lineWidth = 1.6;
        const vines: Array<[number, number, number, number]> = [
          [56, 44, 52, 78],
          [164, 44, 168, 80],
          [96, 36, 94, 62],
          [126, 36, 128, 64],
        ];
        for (const [vx1, vy1, vx2, vy2] of vines) {
          ctx.beginPath();
          ctx.moveTo(vx1, vy1);
          ctx.quadraticCurveTo(vx1 + 3, (vy1 + vy2) / 2, vx2, vy2);
          ctx.stroke();
          ctx.fillStyle = mossC;
          ctx.beginPath();
          ctx.ellipse(vx2 - 2, vy2, 3, 2, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(vx2 + 2, vy2 - 6, 2.5, 1.8, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glowing golden bark veins (06 & 07 reference art)
        if (v.stage >= 1 || v.dawn) {
          ctx.strokeStyle = v.dawn ? '#fff0a6' : '#f2c86b';
          ctx.lineWidth = v.dawn ? 2.5 : 1.6;
          const veins = [
            [110, 42, 95, 90, 42, 168],
            [110, 42, 125, 90, 178, 168],
            [92, 50, 84, 108, 60, 172],
            [128, 50, 136, 108, 160, 172],
          ];
          for (const [x1, y1, x2, y2, x3, y3] of veins) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = barkLight;
          ctx.fillRect(96, 42, 5, 92);
          ctx.fillRect(118, 48, 4, 86);
        }

        // 4. Glowing Heart Core in upper trunk (Heart-shaped in Dawn matching 07_The_Last_Dawn.png!)
        if (v.dawn) {
          ctx.fillStyle = '#fff5ba';
          ctx.beginPath();
          ctx.moveTo(110, 106);
          ctx.bezierCurveTo(92, 92, 94, 74, 110, 84);
          ctx.bezierCurveTo(126, 74, 128, 92, 110, 106);
          ctx.fill();
        } else {
          ctx.fillStyle = v.stage >= 2 ? '#ffe694' : '#5cd6b8';
          ctx.beginPath();
          ctx.moveTo(110, 74);
          ctx.lineTo(121, 90);
          ctx.lineTo(110, 106);
          ctx.lineTo(99, 90);
          ctx.closePath();
          ctx.fill();
        }

        // 5. Carved Stone Sanctuary Altar & Stepped Dais at base of roots (06_Heart_Tree_Sanctuary.png)
        ctx.fillStyle = '#586366';
        ctx.fillRect(88, 116, 44, 46);
        ctx.fillStyle = '#738082';
        ctx.fillRect(92, 120, 36, 38);
        // Stepped stone stairs in front of altar
        ctx.fillStyle = '#626e70';
        ctx.fillRect(80, 162, 60, 6);
        ctx.fillRect(74, 168, 72, 6);
        ctx.fillRect(68, 174, 84, 6);

        // Moss cap on shrine altar
        ctx.fillStyle = '#4c7d40';
        ctx.beginPath();
        ctx.ellipse(110, 116, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Three Crystal Sockets embedded in the Sanctuary Altar (Gold, Blue, Purple)
        const sockets = [
          { x: 90, y: 148, lit: v.stage >= 1, dimColor: '#7a5c18', litColor: '#ffd966' },
          { x: 110, y: 142, lit: v.stage >= 2, dimColor: '#195a94', litColor: '#6ccff6' },
          { x: 130, y: 148, lit: v.stage >= 3, dimColor: '#6c3494', litColor: '#d28cff' },
        ];

        for (const s of sockets) {
          if (s.lit) {
            const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 13);
            g.addColorStop(0, s.litColor);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(s.x - 13, s.y - 13, 26, 26);
          }
          ctx.fillStyle = s.lit ? s.litColor : s.dimColor;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - 9);
          ctx.lineTo(s.x + 5.5, s.y);
          ctx.lineTo(s.x, s.y + 9);
          ctx.lineTo(s.x - 5.5, s.y);
          ctx.closePath();
          ctx.fill();
        }

        // 6. White woodland blossoms across canopy & roots in Dawn / Stage 1+
        if (v.dawn || v.stage >= 1) {
          const flowerCount = v.dawn ? 28 : v.stage * 6;
          for (let i = 0; i < flowerCount; i++) {
            const fx = 36 + ((i * 53) % 148);
            const fy = i < flowerCount / 2 ? 14 + ((i * 19) % 34) : 138 + ((i * 23) % 36);
            ctx.fillStyle = '#fff9e6';
            ctx.beginPath();
            ctx.arc(fx, fy, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f2b84b';
            ctx.fillRect(fx - 1, fy - 1, 2, 2);
          }
        }
      });
    }
  }

  private static createEnvironmentTextures(scene: Phaser.Scene): void {
    // Border canopy trees with rich pixel-art leaf clusters
    const treePalettes: Record<string, [string, string, string]> = {
      tree_hub: ['#071921', '#133330', '#235246'],
      tree_woods: ['#061d21', '#113b35', '#216352'],
      tree_creek: ['#071b2e', '#143752', '#265878'],
      tree_ruins: ['#0d1024', '#1c1d3b', '#32315c'],
      tree_dawn: ['#2a5738', '#46824b', '#76ba62'],
    };

    for (const [key, [shadow, mid, top]] of Object.entries(treePalettes)) {
      this.createCanvas(scene, key, 76, 76, (ctx) => {
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.ellipse(38, 44, 34, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.ellipse(38, 36, 29, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.ellipse(32, 29, 18, 13, 0, 0, Math.PI * 2);
        ctx.ellipse(46, 33, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (key === 'tree_dawn') {
          // White canopy blossoms matching 07_The_Last_Dawn.png
          for (const [bx, by] of [
            [24, 26],
            [42, 22],
            [52, 34],
            [30, 38],
          ]) {
            ctx.fillStyle = '#fff9e6';
            ctx.beginPath();
            ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Bushes
    const bushPalettes: Record<string, [string, string, string]> = {
      bush_hub: ['#092126', '#1b453d', '#2b5e53'],
      bush_woods: ['#092626', '#1c4f42', '#31735f'],
      bush_creek: ['#091f33', '#193f52', '#2c5e75'],
      bush_ruins: ['#12142b', '#262345', '#3e3866'],
      bush_dawn: ['#346348', '#4f855b', '#73ab74'],
    };

    for (const [key, [shadow, mid, top]] of Object.entries(bushPalettes)) {
      this.createCanvas(scene, key, 44, 32, (ctx) => {
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.ellipse(22, 20, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.arc(16, 16, 9, 0, Math.PI * 2);
        ctx.arc(27, 15, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.arc(15, 13, 5, 0, Math.PI * 2);
        ctx.arc(26, 12, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Decorative grass tufts
    this.createCanvas(scene, 'tuft_grass', 12, 10, (ctx) => {
      ctx.fillStyle = '#3d705e';
      ctx.fillRect(2, 5, 1, 3);
      ctx.fillRect(3, 7, 2, 1);
      ctx.fillRect(5, 4, 1, 4);
      ctx.fillRect(8, 5, 1, 3);
    });

    // White 5-petal Forest Flower (matching 01 & 02 reference sheets)
    this.createCanvas(scene, 'mushroom_warm', 14, 14, (ctx) => {
      ctx.fillStyle = '#3d6e38';
      ctx.fillRect(6, 8, 2, 5);
      ctx.fillStyle = '#fff9e6';
      for (const [dx, dy] of [
        [0, -3],
        [3, -1],
        [2, 2],
        [-2, 2],
        [-3, -1],
      ]) {
        ctx.beginPath();
        ctx.arc(7 + dx, 6 + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f2b749';
      ctx.fillRect(6, 5, 2, 2);
    });

    // Bioluminescent Spotted Cyan Mushroom cluster (matching 01, 02, 03 reference sheets)
    this.createCanvas(scene, 'mushroom_cyan', 22, 22, (ctx) => {
      const g = ctx.createRadialGradient(11, 10, 1, 11, 10, 10);
      g.addColorStop(0, 'rgba(76, 230, 212, 0.55)');
      g.addColorStop(1, 'rgba(76, 230, 212, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 22, 22);

      // Stems
      ctx.fillStyle = '#a8e6cf';
      ctx.fillRect(9, 11, 3, 8);
      ctx.fillRect(15, 14, 2, 5);

      // Main turquoise mushroom cap (#38d9c8)
      ctx.fillStyle = '#26b8a8';
      ctx.beginPath();
      ctx.ellipse(10.5, 10, 7.5, 4.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#52f2e0';
      ctx.beginPath();
      ctx.ellipse(10.5, 9.5, 6, 3.2, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // White glowing spots on cap
      ctx.fillStyle = '#e6fffc';
      ctx.fillRect(8, 6, 2, 1.5);
      ctx.fillRect(12, 7, 1.5, 1.5);
      ctx.fillRect(6, 8, 1.5, 1);

      // Secondary small mushroom cap
      ctx.fillStyle = '#38d9c8';
      ctx.beginPath();
      ctx.ellipse(16, 13.5, 4, 2.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });

    // Ruins glowing violet lotus flower (matching 05_Silent_Ruins.png)
    this.createCanvas(scene, 'ruins_flower', 22, 22, (ctx) => {
      const g = ctx.createRadialGradient(11, 10, 1, 11, 10, 10);
      g.addColorStop(0, 'rgba(196, 120, 255, 0.65)');
      g.addColorStop(1, 'rgba(196, 120, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 22, 22);

      ctx.fillStyle = '#2d4742';
      ctx.fillRect(10, 14, 2, 5);

      ctx.fillStyle = '#a356e6';
      ctx.beginPath();
      ctx.moveTo(11, 4);
      ctx.lineTo(16, 11);
      ctx.lineTo(11, 15);
      ctx.lineTo(6, 11);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f3d9ff';
      ctx.beginPath();
      ctx.arc(11, 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mossy stone boulder (matching 01 & 02 reference sheets)
    this.createCanvas(scene, 'rock_blocker', 38, 32, (ctx) => {
      ctx.fillStyle = '#434d4f';
      ctx.beginPath();
      ctx.moveTo(4, 26);
      ctx.lineTo(8, 10);
      ctx.lineTo(24, 6);
      ctx.lineTo(34, 15);
      ctx.lineTo(35, 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#687478';
      ctx.beginPath();
      ctx.moveTo(8, 10);
      ctx.lineTo(24, 6);
      ctx.lineTo(27, 18);
      ctx.lineTo(10, 20);
      ctx.closePath();
      ctx.fill();

      // Lush green moss cap (#568543)
      ctx.fillStyle = '#568543';
      ctx.beginPath();
      ctx.ellipse(18, 9, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Travel Marker stone pillar with red cloth tie & hanging lantern (matching 02_Environment_Props_and_Puzzles.png)
    this.createCanvas(scene, 'beacon_stone', 34, 46, (ctx) => {
      ctx.fillStyle = '#586366';
      ctx.fillRect(8, 8, 14, 34);
      ctx.fillStyle = '#758285';
      ctx.fillRect(6, 5, 18, 5);
      // Moss on top
      ctx.fillStyle = '#568543';
      ctx.fillRect(8, 4, 14, 3);
      // Red cloth banner tie (#a8322d)
      ctx.fillStyle = '#a8322d';
      ctx.fillRect(7, 13, 16, 4);
      // Hanging mini lantern on right arm
      ctx.fillStyle = '#5e4227';
      ctx.fillRect(22, 14, 7, 2);
      ctx.fillStyle = '#ffe680';
      ctx.fillRect(25, 16, 4, 6);
    });

    // Hooded Guardian Statue holding lantern (matching 06_Heart_Tree_Sanctuary.png)
    this.createCanvas(scene, 'guardian_statue', 32, 46, (ctx) => {
      ctx.fillStyle = '#4f5859';
      ctx.beginPath();
      ctx.moveTo(8, 42);
      ctx.lineTo(10, 14);
      ctx.lineTo(16, 7);
      ctx.lineTo(22, 14);
      ctx.lineTo(24, 42);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#6c7678';
      ctx.beginPath();
      ctx.arc(16, 13, 5, 0, Math.PI * 2);
      ctx.fill();

      // Warm mini-lantern held by statue
      ctx.fillStyle = '#ffcf5c';
      ctx.fillRect(20, 24, 4, 6);
    });
  }

  private static createPuzzleTextures(scene: Phaser.Scene): void {
    // 1. WOODS CIRCULAR SUN-GATE (matching 03_Whispering_Woods.png)
    for (const open of [false, true]) {
      this.createCanvas(
        scene,
        open ? 'woods_arch_open' : 'woods_arch_locked',
        128,
        126,
        (ctx) => {
          // Stepped mossy stone stairs
          ctx.fillStyle = '#596366';
          ctx.fillRect(20, 104, 88, 16);
          ctx.fillStyle = '#717d80';
          ctx.fillRect(28, 98, 72, 6);

          // Left & right carved rune pillars flanking the circular gate
          ctx.fillStyle = '#4e5759';
          ctx.fillRect(10, 34, 18, 70);
          ctx.fillRect(100, 34, 18, 70);
          ctx.strokeStyle = open ? '#ffcf5c' : '#7b8a84';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(14, 42, 10, 52);
          ctx.strokeRect(104, 42, 10, 52);

          // Outer mossy stone ring of the Circular Gate
          ctx.fillStyle = '#5c6669';
          ctx.beginPath();
          ctx.arc(64, 58, 38, 0, Math.PI * 2);
          ctx.fill();

          // Inner stone recess
          ctx.fillStyle = open ? '#2e2210' : '#182424';
          ctx.beginPath();
          ctx.arc(64, 58, 30, 0, Math.PI * 2);
          ctx.fill();

          // Moss drapes over the top arch
          ctx.fillStyle = '#4c7d40';
          ctx.beginPath();
          ctx.ellipse(44, 24, 16, 6, -0.2, 0, Math.PI * 2);
          ctx.ellipse(84, 24, 16, 6, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Central Sun-Wheel Seal inside Circular Gate (blazing gold when open/active!)
          if (open) {
            const g = ctx.createRadialGradient(64, 58, 4, 64, 58, 30);
            g.addColorStop(0, 'rgba(255, 240, 160, 0.95)');
            g.addColorStop(0.55, 'rgba(255, 180, 50, 0.55)');
            g.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(64, 58, 30, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = open ? '#ffe680' : '#6c7874';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(64, 58, 16, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshair spokes of the Sun-Gate
          for (let a = 0; a < 4; a++) {
            const rad = (a * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(64 + Math.cos(rad) * 8, 58 + Math.sin(rad) * 8);
            ctx.lineTo(64 + Math.cos(rad) * 26, 58 + Math.sin(rad) * 26);
            ctx.stroke();
          }

          ctx.fillStyle = open ? '#fff5b8' : '#7b8a84';
          ctx.beginPath();
          ctx.arc(64, 58, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      );
    }

    // 2. WOODS RUNESTONES (matching 02 & 03 reference sheets: mossy stone stelae with cyan/gold glyphs)
    const runes: Array<'moon' | 'leaf' | 'star'> = ['moon', 'leaf', 'star'];
    this.createCanvas(scene, 'runestone_hidden', 38, 50, (ctx) => {
      this.drawMossyRunestoneBase(ctx);
      ctx.strokeStyle = 'rgba(130, 155, 150, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(13, 18, 12, 16);
    });

    for (const r of runes) {
      for (const lit of [false, true]) {
        const key = `runestone_${r}_${lit ? 'lit' : 'rev'}`;
        this.createCanvas(scene, key, 38, 50, (ctx) => {
          this.drawMossyRunestoneBase(ctx);
          const glowColor = lit ? '#ffb838' : '#4ce6e6';
          const g = ctx.createRadialGradient(19, 26, 2, 19, 26, 15);
          g.addColorStop(0, glowColor);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(4, 11, 30, 30);

          ctx.fillStyle = lit ? '#fff3b0' : '#8cffff';
          ctx.strokeStyle = lit ? '#fff3b0' : '#8cffff';
          ctx.lineWidth = 2;

          if (r === 'moon') {
            ctx.beginPath();
            ctx.arc(19, 26, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5b6466';
            ctx.beginPath();
            ctx.arc(22.5, 24, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (r === 'leaf') {
            // Sprouting 3-leaf motif from 03_Whispering_Woods.png
            ctx.fillRect(18, 20, 2, 13);
            ctx.beginPath();
            ctx.ellipse(19, 19, 3, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(14, 25, 4, 2.5, -0.5, 0, Math.PI * 2);
            ctx.ellipse(24, 25, 4, 2.5, 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 8-point Sunburst/Star motif from 03_Whispering_Woods.png
            ctx.beginPath();
            ctx.arc(19, 26, 4.5, 0, Math.PI * 2);
            ctx.fill();
            for (let a = 0; a < 8; a++) {
              const rad = (a * Math.PI) / 4;
              ctx.beginPath();
              ctx.moveTo(19 + Math.cos(rad) * 6, 26 + Math.sin(rad) * 6);
              ctx.lineTo(19 + Math.cos(rad) * 10, 26 + Math.sin(rad) * 10);
              ctx.stroke();
            }
          }
        });
      }
    }

    // 3. CREEK CIRCULAR BRONZE MIRRORS & LIGHT BRIDGE (matching 02 & 04_Moonlit_Creek.png)
    for (const lit of [false, true]) {
      this.createCanvas(
        scene,
        lit ? 'pedestal_lit' : 'pedestal_empty',
        36,
        46,
        (ctx) => {
          ctx.fillStyle = '#566266';
          ctx.fillRect(6, 16, 24, 26);
          ctx.fillStyle = '#738287';
          ctx.fillRect(4, 12, 28, 5);
          ctx.fillStyle = '#4c7d40';
          ctx.fillRect(6, 11, 10, 3);

          if (lit) {
            const g = ctx.createRadialGradient(18, 8, 2, 18, 8, 15);
            g.addColorStop(0, 'rgba(255, 238, 150, 0.95)');
            g.addColorStop(1, 'rgba(255, 190, 70, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(2, 0, 32, 24);

            ctx.fillStyle = '#6e4920';
            ctx.fillRect(14, 3, 8, 10);
            ctx.fillStyle = '#fff5b8';
            ctx.fillRect(15, 5, 6, 6);
          }
        }
      );
    }

    // Ornate Circular Bronze/Gold Standing Mirrors (02 & 04_Moonlit_Creek.png)
    for (let rot = 0; rot < 4; rot++) {
      this.createCanvas(scene, `mirror_${rot}`, 40, 50, (ctx) => {
        // Mossy stone pedestal base
        ctx.fillStyle = '#525d61';
        ctx.fillRect(8, 32, 24, 14);
        ctx.fillStyle = '#6d7a7d';
        ctx.fillRect(6, 30, 28, 4);
        ctx.fillStyle = '#4c7d40';
        ctx.fillRect(8, 30, 9, 3);

        // Circular bronze/gold outer frame (#c79546, #f0c878)
        ctx.fillStyle = '#9c6e2b';
        ctx.beginPath();
        ctx.arc(20, 19, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#e8be70';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(20, 19, 11.5, 0, Math.PI * 2);
        ctx.stroke();

        // Shimmering cyan-silver mirror lens (#8ce0f5, #e6fcff)
        const lensGrad = ctx.createLinearGradient(10, 9, 30, 29);
        lensGrad.addColorStop(0, '#dcfaff');
        lensGrad.addColorStop(0.5, '#7cd4eb');
        lensGrad.addColorStop(1, '#3b8da8');
        ctx.fillStyle = lensGrad;
        ctx.beginPath();
        ctx.arc(20, 19, 9.5, 0, Math.PI * 2);
        ctx.fill();

        // Orientation reflection angle bar inside the circular lens
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (rot === 0) {
          ctx.moveTo(14, 13);
          ctx.lineTo(26, 25);
        } else if (rot === 1) {
          ctx.moveTo(14, 25);
          ctx.lineTo(26, 13);
        } else if (rot === 2) {
          ctx.moveTo(12, 19);
          ctx.lineTo(28, 19);
        } else {
          ctx.moveTo(20, 11);
          ctx.lineTo(20, 27);
        }
        ctx.stroke();
      });
    }

    for (const active of [false, true]) {
      this.createCanvas(
        scene,
        active ? 'receiver_on' : 'receiver_off',
        40,
        48,
        (ctx) => {
          ctx.fillStyle = '#525d61';
          ctx.fillRect(8, 30, 24, 14);
          ctx.fillStyle = '#9c6e2b';
          ctx.beginPath();
          ctx.arc(20, 18, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = active ? '#b8fcff' : '#2d4959';
          ctx.beginPath();
          ctx.arc(20, 18, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      );
    }

    // Translucent Glowing Crystalline Light-Bridge Square (matching 04_Moonlit_Creek.png!)
    this.createCanvas(scene, 'stepping_stone', 34, 24, (ctx) => {
      ctx.fillStyle = 'rgba(120, 232, 255, 0.38)';
      ctx.strokeStyle = '#d9fcff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(17, 3);
      ctx.lineTo(31, 11);
      ctx.lineTo(17, 19);
      ctx.lineTo(3, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner crystalline grid & sparkles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 7, 2, 2);
      ctx.fillRect(10, 11, 1.5, 1.5);
      ctx.fillRect(23, 10, 1.5, 1.5);
    });

    this.createCanvas(scene, 'mural_tablet', 46, 46, (ctx) => {
      ctx.fillStyle = '#4b5e6b';
      ctx.fillRect(4, 6, 38, 36);
      ctx.fillStyle = '#657c8c';
      ctx.fillRect(7, 9, 32, 30);
      ctx.fillStyle = '#4c7d40';
      ctx.fillRect(6, 5, 16, 4);
      ctx.fillStyle = '#fce38a';
      ctx.beginPath();
      ctx.arc(23, 22, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8cc3da';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 13, 22, 18);
    });

    // 4. RUINS SUN/MOON PEDESTALS, ARCHES & ANTLERED SHADOW (matching 05_Silent_Ruins.png)
    this.createCanvas(scene, 'ruin_pillar', 32, 56, (ctx) => {
      ctx.fillStyle = '#45485c';
      ctx.fillRect(4, 8, 24, 46);
      ctx.fillStyle = '#5e627a';
      ctx.fillRect(2, 5, 28, 5);
      ctx.fillStyle = '#3f6942';
      ctx.fillRect(5, 5, 10, 4);
    });

    this.createCanvas(scene, 'ruins_altar', 104, 52, (ctx) => {
      ctx.fillStyle = '#444659';
      ctx.fillRect(8, 12, 88, 36);
      ctx.fillStyle = '#5c5f78';
      ctx.fillRect(14, 6, 76, 8);
      // Eclipse Sun/Moon emblem carved on altar front
      ctx.strokeStyle = '#c8a6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(52, 30, 9, 0, Math.PI * 2);
      ctx.stroke();
    });

    for (const sym of ['sun', 'moon'] as const) {
      for (const lit of [false, true]) {
        this.createCanvas(
          scene,
          `lock_${sym}_${lit ? 'on' : 'off'}`,
          36,
          44,
          (ctx) => {
            // Square carved dark-stone pedestal block matching 05_Silent_Ruins.png
            ctx.fillStyle = '#323547';
            ctx.fillRect(4, 8, 28, 32);
            ctx.fillStyle = '#4b4f66';
            ctx.fillRect(2, 5, 32, 5);
            ctx.strokeStyle = lit
              ? sym === 'sun'
                ? '#ffd266'
                : '#a6c8ff'
              : '#595e75';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(6, 12, 24, 24);

            const color = lit
              ? sym === 'sun'
                ? '#ffe07d'
                : '#b8d4ff'
              : '#5c6178';

            if (lit) {
              const g = ctx.createRadialGradient(18, 24, 2, 18, 24, 14);
              g.addColorStop(0, color);
              g.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = g;
              ctx.fillRect(4, 10, 28, 28);
            }

            ctx.fillStyle = color;
            if (sym === 'sun') {
              ctx.beginPath();
              ctx.arc(18, 24, 5.5, 0, Math.PI * 2);
              ctx.fill();
              for (let a = 0; a < 8; a++) {
                const rad = (a * Math.PI) / 4;
                ctx.fillRect(
                  18 + Math.cos(rad) * 8 - 1,
                  24 + Math.sin(rad) * 8 - 1,
                  2,
                  2
                );
              }
            } else {
              ctx.beginPath();
              ctx.arc(18, 24, 6.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#323547';
              ctx.beginPath();
              ctx.arc(21, 22, 5.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        );
      }
    }

    // Antlered/Crowned Shadow Guardian Apparition (matching 05_Silent_Ruins.png!)
    this.createCanvas(scene, 'shadow_npc', 44, 56, (ctx) => {
      const g = ctx.createRadialGradient(22, 28, 2, 22, 28, 22);
      g.addColorStop(0, 'rgba(175, 140, 225, 0.55)');
      g.addColorStop(1, 'rgba(18, 23, 45, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 44, 56);

      // Antlers / branches silhouette on head
      ctx.strokeStyle = '#292242';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(10, 4);
      ctx.moveTo(14, 8);
      ctx.lineTo(18, 4);
      ctx.moveTo(26, 14);
      ctx.lineTo(34, 4);
      ctx.moveTo(30, 8);
      ctx.lineTo(26, 4);
      ctx.stroke();

      // Cloaked shadow form
      ctx.fillStyle = '#151226';
      ctx.beginPath();
      ctx.moveTo(15, 16);
      ctx.lineTo(22, 10);
      ctx.lineTo(29, 16);
      ctx.lineTo(33, 48);
      ctx.lineTo(11, 48);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#9c7ec7';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Glowing starry eyes
      ctx.fillStyle = '#e5ccff';
      ctx.fillRect(19, 18, 2, 2);
      ctx.fillRect(23, 18, 2, 2);
    });

    // 5. THREE MULTI-FACETED CRYSTALS ON MOSSY BASES (matching 02_Environment_Props_and_Puzzles.png)
    const crystals: Array<{ key: string; outer: string; inner: string }> = [
      { key: 'crystal_memory', outer: '#f2a62c', inner: '#fff3a8' },
      { key: 'crystal_hope', outer: '#38b6ff', inner: '#c4f5ff' },
      { key: 'crystal_balance', outer: '#b96ce6', inner: '#f0d4ff' },
    ];

    for (const c of crystals) {
      this.createCanvas(scene, c.key, 42, 50, (ctx) => {
        const g = ctx.createRadialGradient(21, 24, 2, 21, 24, 20);
        g.addColorStop(0, c.inner);
        g.addColorStop(0.5, c.outer);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 42, 50);

        // Side crystal shards
        ctx.fillStyle = c.outer;
        ctx.beginPath();
        ctx.moveTo(11, 18);
        ctx.lineTo(17, 26);
        ctx.lineTo(13, 38);
        ctx.lineTo(7, 28);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(31, 18);
        ctx.lineTo(35, 28);
        ctx.lineTo(29, 38);
        ctx.lineTo(25, 26);
        ctx.closePath();
        ctx.fill();

        // Main center crystal spire
        ctx.fillStyle = c.outer;
        ctx.beginPath();
        ctx.moveTo(21, 5);
        ctx.lineTo(30, 22);
        ctx.lineTo(25, 40);
        ctx.lineTo(17, 40);
        ctx.lineTo(12, 22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = c.inner;
        ctx.beginPath();
        ctx.moveTo(21, 9);
        ctx.lineTo(26, 22);
        ctx.lineTo(21, 37);
        ctx.lineTo(16, 22);
        ctx.closePath();
        ctx.fill();
      });
    }
  }

  private static drawMossyRunestoneBase(ctx: CanvasRenderingContext2D): void {
    // Weathered stone slab with green moss cap matching 02_Environment_Props_and_Puzzles.png
    ctx.fillStyle = '#4e5759';
    ctx.beginPath();
    ctx.moveTo(6, 44);
    ctx.lineTo(7, 10);
    ctx.lineTo(14, 5);
    ctx.lineTo(25, 5);
    ctx.lineTo(31, 10);
    ctx.lineTo(32, 44);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#687375';
    ctx.fillRect(9, 9, 20, 33);

    // Moss cap on top of runestone
    ctx.fillStyle = '#568543';
    ctx.beginPath();
    ctx.ellipse(19, 8, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private static createLightingAndParticles(scene: Phaser.Scene): void {
    this.createCanvas(scene, 'light_radial', 256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
      g.addColorStop(0, 'rgba(255, 234, 158, 0.48)');
      g.addColorStop(0.45, 'rgba(255, 204, 102, 0.24)');
      g.addColorStop(0.75, 'rgba(255, 180, 75, 0.08)');
      g.addColorStop(1, 'rgba(255, 175, 65, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    });

    this.createCanvas(scene, 'particle_firefly', 8, 8, (ctx) => {
      const g = ctx.createRadialGradient(4, 4, 0.5, 4, 4, 4);
      g.addColorStop(0, 'rgba(255, 245, 175, 1)');
      g.addColorStop(1, 'rgba(125, 242, 212, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 8);
    });

    this.createCanvas(scene, 'particle_mist', 96, 40, (ctx) => {
      const g = ctx.createRadialGradient(48, 20, 6, 48, 20, 46);
      g.addColorStop(0, 'rgba(180, 225, 235, 0.14)');
      g.addColorStop(1, 'rgba(180, 225, 235, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 40);
    });

    // Soft blob shadow under characters
    this.createCanvas(scene, 'shadow_blob', 28, 12, (ctx) => {
      const g = ctx.createRadialGradient(14, 6, 1, 14, 6, 13);
      g.addColorStop(0, 'rgba(4, 10, 12, 0.55)');
      g.addColorStop(0.7, 'rgba(4, 10, 12, 0.3)');
      g.addColorStop(1, 'rgba(4, 10, 12, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(14, 6, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Screen vignette for mood + focus (static overlay, LanternSystem draws it)
    this.createCanvas(scene, 'vignette', 640, 360, (ctx) => {
      const g = ctx.createRadialGradient(320, 180, 130, 320, 180, 360);
      g.addColorStop(0, 'rgba(2, 6, 8, 0)');
      g.addColorStop(0.72, 'rgba(2, 6, 8, 0)');
      g.addColorStop(1, 'rgba(2, 6, 8, 0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 360);
    });

    // Zone weather motes: petals (woods/hub), mist drops (creek), violet ash (ruins)
    const motes: Array<[string, string]> = [
      ['mote_petal', '#ffd9e6'],
      ['mote_petal_white', '#fff9e6'],
      ['mote_drop', '#9ad9ea'],
      ['mote_ash', '#c9a6f2'],
    ];
    for (const [key, color] of motes) {
      this.createCanvas(scene, key, 7, 7, (ctx) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(3.5, 3.5, 2.8, 2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

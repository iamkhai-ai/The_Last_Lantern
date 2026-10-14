import Phaser from 'phaser';

export class ProceduralTextures {
  public static generateAll(scene: Phaser.Scene): void {
    this.createPlayerTextures(scene);
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

  private static createPlayerTextures(scene: Phaser.Scene): void {
    const dirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const states: Array<'lit' | 'unlit' | 'nolamp'> = ['lit', 'unlit', 'nolamp'];

    for (const dir of dirs) {
      for (const lampState of states) {
        for (let frame = 0; frame < 3; frame++) {
          const key = `player_${dir}_${lampState}_${frame}`;
          this.createCanvas(scene, key, 36, 42, (ctx) => {
            const bobY = frame === 0 ? 0 : frame === 1 ? -1 : 1;
            const stride = frame === 0 ? 0 : frame === 1 ? -2 : 2;

            // Shadow oval at feet (matching reference art)
            ctx.fillStyle = 'rgba(6, 14, 16, 0.72)';
            ctx.beginPath();
            ctx.ellipse(16, 37, 10, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Boots
            ctx.fillStyle = '#38251c';
            ctx.fillRect(11 + (stride > 0 ? 1 : 0), 31 + bobY, 4, 5);
            ctx.fillRect(17 + (stride < 0 ? -1 : 0), 31 + bobY, 4, 5);

            // Cloak body (warm ochre-brown from reference)
            ctx.fillStyle = '#8b5129';
            ctx.beginPath();
            ctx.moveTo(10, 17 + bobY);
            ctx.lineTo(22, 17 + bobY);
            ctx.lineTo(25, 32 + bobY);
            ctx.lineTo(7, 32 + bobY);
            ctx.closePath();
            ctx.fill();

            // Cloak highlight fold
            ctx.fillStyle = '#a46334';
            ctx.beginPath();
            ctx.moveTo(12, 18 + bobY);
            ctx.lineTo(20, 18 + bobY);
            ctx.lineTo(22, 31 + bobY);
            ctx.lineTo(10, 31 + bobY);
            ctx.closePath();
            ctx.fill();

            // Soft red-ochre scarf
            ctx.fillStyle = '#a3483c';
            ctx.fillRect(11, 16 + bobY, 10, 3);

            // Hood & head (reddish-brown hood matching 01_heart_tree_night.png)
            ctx.fillStyle = '#693b36';
            ctx.beginPath();
            ctx.moveTo(9, 10 + bobY);
            ctx.lineTo(16, 6 + bobY);
            ctx.lineTo(24, 11 + bobY);
            ctx.lineTo(25, 16 + bobY);
            ctx.lineTo(9, 17 + bobY);
            ctx.closePath();
            ctx.fill();

            // Face & eye detail depending on direction
            if (dir !== 'up') {
              ctx.fillStyle = '#e2b994';
              if (dir === 'left') {
                ctx.fillRect(10, 13 + bobY, 5, 4);
                ctx.fillStyle = '#1d1412';
                ctx.fillRect(11, 14 + bobY, 1, 1);
              } else if (dir === 'right') {
                ctx.fillRect(17, 13 + bobY, 5, 4);
                ctx.fillStyle = '#1d1412';
                ctx.fillRect(20, 14 + bobY, 1, 1);
              } else {
                ctx.fillRect(14, 13 + bobY, 6, 4);
                ctx.fillStyle = '#1d1412';
                ctx.fillRect(17, 14 + bobY, 1, 1);
              }
            }

            // Lantern arm & lantern (if carrying lantern)
            if (lampState !== 'nolamp') {
              const armX = dir === 'left' ? 4 : 23;
              const armY = 22 + bobY;

              // Arm extending out
              ctx.strokeStyle = '#d9ae89';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(dir === 'left' ? 11 : 21, 21 + bobY);
              ctx.lineTo(armX + 3, armY + 2);
              ctx.stroke();

              // Lantern handle
              ctx.fillStyle = '#5e4934';
              ctx.fillRect(armX + 1, armY + 2, 5, 2);

              if (lampState === 'lit') {
                // Soft warm glow halo around the hand lantern
                const grad = ctx.createRadialGradient(
                  armX + 3.5,
                  armY + 7,
                  1,
                  armX + 3.5,
                  armY + 7,
                  10
                );
                grad.addColorStop(0, 'rgba(255, 226, 128, 0.85)');
                grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(armX - 7, armY - 3, 21, 21);

                // Lantern body
                ctx.fillStyle = '#d98a2b';
                ctx.fillRect(armX + 1, armY + 4, 5, 7);
                ctx.fillStyle = '#fff0a6';
                ctx.fillRect(armX + 2, armY + 5, 3, 5);
              } else {
                // Unlit lantern body
                ctx.fillStyle = '#4a524f';
                ctx.fillRect(armX + 1, armY + 4, 5, 7);
                ctx.fillStyle = '#737d79';
                ctx.fillRect(armX + 2, armY + 5, 3, 5);
              }
            }
          });
        }
      }
    }
  }

  private static createLumoTextures(scene: Phaser.Scene): void {
    for (let f = 0; f < 2; f++) {
      this.createCanvas(scene, `lumo_${f}`, 24, 24, (ctx) => {
        const r = f === 0 ? 5 : 5.5;
        const grad = ctx.createRadialGradient(12, 12, 2, 12, 12, 11);
        grad.addColorStop(0, 'rgba(242, 247, 175, 0.95)');
        grad.addColorStop(0.5, 'rgba(232, 240, 168, 0.45)');
        grad.addColorStop(1, 'rgba(232, 240, 168, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 24, 24);

        // Wisp body
        ctx.fillStyle = '#e8f0a8';
        ctx.beginPath();
        ctx.arc(12, 12, r, 0, Math.PI * 2);
        ctx.fill();

        // Two tiny dark eyes matching reference art
        ctx.fillStyle = '#1b2c28';
        ctx.fillRect(10, 12, 1, 1.5);
        ctx.fillRect(13, 12, 1, 1.5);
      });
    }
  }

  private static createHeartTreeTextures(scene: Phaser.Scene): void {
    const variants: Array<{ key: string; stage: number; dawn: boolean }> = [
      { key: 'heart_tree_0', stage: 0, dawn: false },
      { key: 'heart_tree_1', stage: 1, dawn: false },
      { key: 'heart_tree_2', stage: 2, dawn: false },
      { key: 'heart_tree_3', stage: 3, dawn: false },
      { key: 'heart_tree_dawn', stage: 3, dawn: true },
    ];

    for (const v of variants) {
      this.createCanvas(scene, v.key, 200, 210, (ctx) => {
        // Canopy top clusters
        const canopyColors = v.dawn
          ? ['#4c8554', '#669e68', '#87b26e']
          : v.stage >= 1
          ? ['#143d35', '#1f5448', '#2c6e5c']
          : ['#0e2b27', '#163b35', '#1d4740'];

        const circles = [
          { x: 100, y: 26, rx: 68, ry: 24, c: canopyColors[0] },
          { x: 56, y: 38, rx: 42, ry: 20, c: canopyColors[1] },
          { x: 144, y: 36, rx: 44, ry: 20, c: canopyColors[1] },
          { x: 100, y: 20, rx: 46, ry: 18, c: canopyColors[2] },
        ];
        for (const c of circles) {
          ctx.fillStyle = c.c;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stage 2+ water stream glow beneath roots
        if (v.stage >= 2 && !v.dawn) {
          const waterGrad = ctx.createRadialGradient(100, 165, 8, 100, 165, 58);
          waterGrad.addColorStop(0, 'rgba(92, 214, 184, 0.32)');
          waterGrad.addColorStop(1, 'rgba(40, 128, 200, 0)');
          ctx.fillStyle = waterGrad;
          ctx.fillRect(30, 120, 140, 80);
        }

        // Dawn golden sunlight aura
        if (v.dawn) {
          const sunGrad = ctx.createRadialGradient(100, 110, 12, 100, 110, 95);
          sunGrad.addColorStop(0, 'rgba(255, 235, 165, 0.65)');
          sunGrad.addColorStop(0.6, 'rgba(242, 213, 139, 0.28)');
          sunGrad.addColorStop(1, 'rgba(242, 213, 139, 0)');
          ctx.fillStyle = sunGrad;
          ctx.fillRect(0, 0, 200, 210);
        }

        // Main trunk (matching 01_heart_tree_night.png & 05_final_dawn.png)
        const trunkColor = v.dawn ? '#856542' : '#4a534f';
        const trunkHighlight = v.dawn ? '#9c7a54' : '#5b6661';

        ctx.fillStyle = trunkColor;
        ctx.beginPath();
        ctx.moveTo(82, 34);
        ctx.lineTo(114, 34);
        ctx.lineTo(118, 145);
        ctx.lineTo(80, 145);
        ctx.closePath();
        ctx.fill();

        // Trunk bark vertical lines
        ctx.fillStyle = trunkHighlight;
        ctx.fillRect(101, 40, 3, 95);
        ctx.fillRect(92, 65, 2, 70);

        // Dramatic flared diagonal roots (3 left, 3 right matching reference art)
        ctx.strokeStyle = trunkColor;
        ctx.lineWidth = 6;
        const roots = [
          [85, 105, 36, 178],
          [88, 112, 58, 178],
          [92, 120, 78, 178],
          [106, 120, 116, 178],
          [110, 112, 138, 178],
          [114, 105, 162, 178],
        ];
        for (const [x1, y1, x2, y2] of roots) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Upper Heart Core (Oval + Diamond inside trunk)
        const coreCenterY = 98;
        ctx.fillStyle = v.dawn ? '#f2c879' : '#4ebaa3';
        ctx.beginPath();
        ctx.ellipse(100, coreCenterY, 13, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = v.dawn ? '#ffe89e' : '#7df2d4';
        ctx.beginPath();
        ctx.moveTo(100, coreCenterY - 16);
        ctx.lineTo(111, coreCenterY);
        ctx.lineTo(100, coreCenterY + 16);
        ctx.lineTo(89, coreCenterY);
        ctx.closePath();
        ctx.fill();

        // Stage 1+ fresh sprouting leaves on branches
        if (v.stage >= 1) {
          ctx.fillStyle = v.dawn ? '#87b26e' : '#4ba88a';
          const leafSpots = [
            [72, 48],
            [126, 50],
            [62, 34],
            [138, 36],
            [100, 30],
          ];
          for (const [lx, ly] of leafSpots) {
            ctx.beginPath();
            ctx.arc(lx, ly, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Three Crystal Sockets near the base of the trunk (Gold, Blue, Purple diamonds)
        const sockets = [
          { x: 80, y: 150, lit: v.stage >= 1, dimColor: '#8c6918', litColor: '#ffd966' },
          { x: 100, y: 150, lit: v.stage >= 2, dimColor: '#195a94', litColor: '#6ccff6' },
          { x: 120, y: 150, lit: v.stage >= 3, dimColor: '#6c3494', litColor: '#d28cff' },
        ];

        for (const s of sockets) {
          if (s.lit) {
            const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 14);
            g.addColorStop(0, s.litColor);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(s.x - 14, s.y - 14, 28, 28);
          }
          ctx.fillStyle = s.lit ? s.litColor : s.dimColor;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - 11);
          ctx.lineTo(s.x + 6, s.y);
          ctx.lineTo(s.x, s.y + 11);
          ctx.lineTo(s.x - 6, s.y);
          ctx.closePath();
          ctx.fill();
        }

        // Dawn blooming flowers around roots
        if (v.dawn) {
          const blossoms = [
            { x: 52, y: 162, c: '#f28b78' },
            { x: 68, y: 142, c: '#ffe699' },
            { x: 132, y: 144, c: '#f28b78' },
            { x: 148, y: 165, c: '#ffe699' },
            { x: 92, y: 132, c: '#ffe699' },
            { x: 112, y: 130, c: '#f28b78' },
          ];
          for (const b of blossoms) {
            ctx.fillStyle = b.c;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }
  }

  private static createEnvironmentTextures(scene: Phaser.Scene): void {
    // Border canopy trees for each zone
    const treePalettes: Record<string, [string, string, string]> = {
      tree_hub: ['#071b21', '#123630', '#1f4f45'],
      tree_woods: ['#072222', '#134237', '#236652'],
      tree_creek: ['#071c30', '#133447', '#23536b'],
      tree_ruins: ['#0e1124', '#1d1c38', '#332e54'],
      tree_dawn: ['#2e5942', '#467a53', '#689e6b'],
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
        ctx.ellipse(34, 30, 19, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(46, 34, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
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

    // Decorative tufts & mushrooms matching reference images
    this.createCanvas(scene, 'tuft_grass', 12, 10, (ctx) => {
      ctx.fillStyle = '#3d705e';
      ctx.fillRect(2, 5, 1, 3);
      ctx.fillRect(3, 7, 2, 1);
      ctx.fillRect(5, 4, 1, 4);
      ctx.fillRect(8, 5, 1, 3);
    });

    this.createCanvas(scene, 'mushroom_warm', 10, 10, (ctx) => {
      ctx.fillStyle = '#a39c62';
      ctx.fillRect(4, 5, 2, 4);
      ctx.fillStyle = '#e0d472';
      ctx.fillRect(2, 3, 6, 2);
      ctx.fillRect(3, 2, 4, 1);
    });

    this.createCanvas(scene, 'mushroom_cyan', 10, 10, (ctx) => {
      ctx.fillStyle = '#628a9c';
      ctx.fillRect(4, 5, 2, 4);
      ctx.fillStyle = '#8cc3da';
      ctx.fillRect(2, 3, 6, 2);
      ctx.fillRect(3, 2, 4, 1);
    });

    // Ruins glowing purple night flower (matching 04_silent_ruins.png)
    this.createCanvas(scene, 'ruins_flower', 20, 20, (ctx) => {
      ctx.fillStyle = '#2d4742';
      ctx.fillRect(9, 13, 2, 5);
      ctx.fillStyle = '#6d589c';
      ctx.beginPath();
      ctx.arc(10, 10, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfd0f5';
      ctx.beginPath();
      ctx.arc(10, 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rock blocker
    this.createCanvas(scene, 'rock_blocker', 36, 30, (ctx) => {
      ctx.fillStyle = 'rgba(6, 14, 18, 0.55)';
      ctx.beginPath();
      ctx.ellipse(18, 24, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4e5d5a';
      ctx.beginPath();
      ctx.moveTo(5, 22);
      ctx.lineTo(9, 10);
      ctx.lineTo(22, 7);
      ctx.lineTo(31, 14);
      ctx.lineTo(32, 23);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#687a76';
      ctx.beginPath();
      ctx.moveTo(9, 10);
      ctx.lineTo(22, 7);
      ctx.lineTo(25, 15);
      ctx.lineTo(11, 17);
      ctx.closePath();
      ctx.fill();
    });

    // Guide signpost / intro beacon stone
    this.createCanvas(scene, 'beacon_stone', 28, 38, (ctx) => {
      ctx.fillStyle = '#566662';
      ctx.fillRect(6, 8, 16, 26);
      ctx.fillStyle = '#738580';
      ctx.fillRect(8, 6, 12, 4);
      ctx.fillStyle = '#7df2d4';
      ctx.beginPath();
      ctx.moveTo(14, 13);
      ctx.lineTo(19, 20);
      ctx.lineTo(14, 27);
      ctx.lineTo(9, 20);
      ctx.closePath();
      ctx.fill();
    });
  }

  private static createPuzzleTextures(scene: Phaser.Scene): void {
    // 1. WOODS ARCH GATE (locked & open, matching 02_whispering_woods.png)
    for (const open of [false, true]) {
      this.createCanvas(
        scene,
        open ? 'woods_arch_open' : 'woods_arch_locked',
        116,
        124,
        (ctx) => {
          // Stepped base
          ctx.fillStyle = '#6f7d78';
          ctx.fillRect(8, 106, 100, 12);
          ctx.fillStyle = '#82918c';
          ctx.fillRect(12, 100, 92, 6);

          // Left & right pillars
          ctx.fillStyle = '#677570';
          ctx.fillRect(14, 28, 18, 72);
          ctx.fillRect(84, 28, 18, 72);

          // Inner arch dark frame & portal oval
          ctx.fillStyle = '#0b1e1c';
          ctx.beginPath();
          ctx.ellipse(58, 66, 28, 34, 0, 0, Math.PI * 2);
          ctx.fill();

          const portalGrad = ctx.createRadialGradient(58, 62, 4, 58, 66, 28);
          if (open) {
            portalGrad.addColorStop(0, '#ffe694');
            portalGrad.addColorStop(0.55, '#3b8c73');
            portalGrad.addColorStop(1, '#12382f');
          } else {
            portalGrad.addColorStop(0, '#2e6355');
            portalGrad.addColorStop(1, '#0d2622');
          }
          ctx.fillStyle = portalGrad;
          ctx.beginPath();
          ctx.ellipse(58, 62, 22, 28, 0, 0, Math.PI * 2);
          ctx.fill();

          // Pitched gable roof
          ctx.fillStyle = '#6b7873';
          ctx.beginPath();
          ctx.moveTo(10, 32);
          ctx.lineTo(58, 6);
          ctx.lineTo(106, 32);
          ctx.lineTo(98, 42);
          ctx.lineTo(58, 20);
          ctx.lineTo(18, 42);
          ctx.closePath();
          ctx.fill();

          // Three golden lock lights on arch (left, top, right)
          const orbs = [
            { x: 24, y: 48 },
            { x: 58, y: 18 },
            { x: 92, y: 48 },
          ];
          for (const o of orbs) {
            ctx.fillStyle = open ? '#ffe885' : '#d6b256';
            ctx.beginPath();
            ctx.arc(o.x, o.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      );
    }

    // 2. WOODS RUNESTONES (hidden, revealed, and activated for moon, leaf, star)
    const runes: Array<'moon' | 'leaf' | 'star'> = ['moon', 'leaf', 'star'];
    this.createCanvas(scene, 'runestone_hidden', 34, 46, (ctx) => {
      this.drawRunestoneBase(ctx);
      // Faint sleeping diamond outline
      ctx.fillStyle = 'rgba(130, 150, 142, 0.35)';
      ctx.beginPath();
      ctx.moveTo(17, 15);
      ctx.lineTo(22, 23);
      ctx.lineTo(17, 31);
      ctx.lineTo(12, 23);
      ctx.closePath();
      ctx.fill();
    });

    for (const r of runes) {
      for (const lit of [false, true]) {
        const key = `runestone_${r}_${lit ? 'lit' : 'rev'}`;
        this.createCanvas(scene, key, 34, 46, (ctx) => {
          this.drawRunestoneBase(ctx);
          const glowColor = lit ? '#ffe680' : '#85e6b8';
          const g = ctx.createRadialGradient(17, 23, 2, 17, 23, 14);
          g.addColorStop(0, glowColor);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(3, 9, 28, 28);

          ctx.fillStyle = lit ? '#fff3b0' : '#b8f5d4';
          if (r === 'moon') {
            // Crescent Moon glyph
            ctx.beginPath();
            ctx.arc(17, 23, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#68736e';
            ctx.beginPath();
            ctx.arc(20, 21, 5.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (r === 'leaf') {
            // Diamond Leaf glyph
            ctx.beginPath();
            ctx.moveTo(17, 14);
            ctx.lineTo(23, 23);
            ctx.lineTo(17, 32);
            ctx.lineTo(11, 23);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#436e5b';
            ctx.fillRect(16.5, 17, 1, 12);
          } else {
            // 4-point Star glyph
            ctx.beginPath();
            ctx.moveTo(17, 13);
            ctx.lineTo(19.5, 20.5);
            ctx.lineTo(27, 23);
            ctx.lineTo(19.5, 25.5);
            ctx.lineTo(17, 33);
            ctx.lineTo(14.5, 25.5);
            ctx.lineTo(7, 23);
            ctx.lineTo(14.5, 20.5);
            ctx.closePath();
            ctx.fill();
          }
        });
      }
    }

    // 3. CREEK MIRROR PUZZLE ASSETS (matching 03_moonlit_creek.png)
    for (const lit of [false, true]) {
      this.createCanvas(
        scene,
        lit ? 'pedestal_lit' : 'pedestal_empty',
        34,
        44,
        (ctx) => {
          ctx.fillStyle = '#5e6e73';
          ctx.fillRect(5, 14, 24, 26);
          ctx.fillStyle = '#798b91';
          ctx.fillRect(3, 10, 28, 6);
          if (lit) {
            const g = ctx.createRadialGradient(17, 8, 2, 17, 8, 15);
            g.addColorStop(0, 'rgba(255, 230, 128, 0.95)');
            g.addColorStop(1, 'rgba(255, 190, 70, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 34, 26);

            ctx.fillStyle = '#d98a2b';
            ctx.fillRect(13, 3, 8, 10);
            ctx.fillStyle = '#fff3b0';
            ctx.fillRect(14, 5, 6, 6);
          }
        }
      );
    }

    // Four mirror orientations (0..3)
    for (let rot = 0; rot < 4; rot++) {
      this.createCanvas(scene, `mirror_${rot}`, 36, 48, (ctx) => {
        ctx.fillStyle = '#68767a';
        ctx.fillRect(4, 6, 28, 38);
        ctx.fillStyle = '#7e8e94';
        ctx.fillRect(6, 4, 24, 4);

        // Reflective crystal bar inside pillar
        ctx.strokeStyle = '#9ad9ea';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (rot === 0) {
          // 0: Slash / reflecting Bottom <-> Right or Top <-> Left (we also draw direction notch)
          ctx.moveTo(10, 16);
          ctx.lineTo(26, 32);
        } else if (rot === 1) {
          // 1: Backslash \ reflecting Bottom -> Top-Right / Right
          ctx.moveTo(10, 32);
          ctx.lineTo(26, 16);
        } else if (rot === 2) {
          // 2: Horizontal —
          ctx.moveTo(9, 24);
          ctx.lineTo(27, 24);
        } else {
          // 3: Vertical |
          ctx.moveTo(18, 14);
          ctx.lineTo(18, 34);
        }
        ctx.stroke();

        // Orientation indicator dot on pillar top
        const dots = [
          [18, 10],
          [26, 24],
          [18, 38],
          [10, 24],
        ];
        ctx.fillStyle = '#fce38a';
        ctx.fillRect(dots[rot][0] - 1.5, dots[rot][1] - 1.5, 3, 3);
      });
    }

    for (const active of [false, true]) {
      this.createCanvas(
        scene,
        active ? 'receiver_on' : 'receiver_off',
        34,
        42,
        (ctx) => {
          ctx.fillStyle = '#536878';
          ctx.fillRect(5, 10, 24, 28);
          ctx.fillStyle = active ? '#7df2ff' : '#324a5e';
          ctx.beginPath();
          ctx.moveTo(17, 13);
          ctx.lineTo(25, 24);
          ctx.lineTo(17, 35);
          ctx.lineTo(9, 24);
          ctx.closePath();
          ctx.fill();
        }
      );
    }

    this.createCanvas(scene, 'stepping_stone', 32, 22, (ctx) => {
      ctx.fillStyle = '#4c616b';
      ctx.beginPath();
      ctx.moveTo(4, 12);
      ctx.lineTo(11, 5);
      ctx.lineTo(24, 5);
      ctx.lineTo(29, 12);
      ctx.lineTo(23, 19);
      ctx.lineTo(9, 19);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#738b96';
      ctx.beginPath();
      ctx.moveTo(6, 11);
      ctx.lineTo(12, 6);
      ctx.lineTo(23, 6);
      ctx.lineTo(27, 11);
      ctx.lineTo(22, 16);
      ctx.lineTo(10, 16);
      ctx.closePath();
      ctx.fill();
    });

    this.createCanvas(scene, 'mural_tablet', 46, 44, (ctx) => {
      ctx.fillStyle = '#4b5e6b';
      ctx.fillRect(4, 6, 38, 34);
      ctx.fillStyle = '#657c8c';
      ctx.fillRect(7, 9, 32, 28);
      // Engraved lantern & shattered heart symbol
      ctx.fillStyle = '#fce38a';
      ctx.beginPath();
      ctx.arc(23, 21, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8cc3da';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 13, 22, 18);
    });

    // 4. RUINS BALANCE PUZZLE & SHADOW (matching 04_silent_ruins.png)
    this.createCanvas(scene, 'ruin_pillar', 32, 54, (ctx) => {
      ctx.fillStyle = '#6c7a78';
      ctx.fillRect(4, 8, 24, 44);
      ctx.fillStyle = '#5e5078';
      ctx.beginPath();
      ctx.ellipse(16, 8, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    this.createCanvas(scene, 'ruins_altar', 92, 46, (ctx) => {
      ctx.fillStyle = '#687675';
      ctx.fillRect(6, 6, 26, 36);
      ctx.fillRect(32, 20, 54, 22);
      ctx.fillStyle = '#81918f';
      ctx.fillRect(8, 6, 22, 4);
      ctx.fillRect(34, 20, 50, 4);
    });

    for (const sym of ['sun', 'moon'] as const) {
      for (const lit of [false, true]) {
        this.createCanvas(
          scene,
          `lock_${sym}_${lit ? 'on' : 'off'}`,
          34,
          46,
          (ctx) => {
            ctx.fillStyle = '#5d6673';
            ctx.fillRect(5, 8, 24, 34);
            ctx.fillStyle = '#788291';
            ctx.fillRect(7, 5, 20, 4);

            const color = lit
              ? sym === 'sun'
                ? '#ffe07d'
                : '#c8a6ff'
              : '#373b4d';

            if (lit) {
              const g = ctx.createRadialGradient(17, 24, 2, 17, 24, 14);
              g.addColorStop(0, color);
              g.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = g;
              ctx.fillRect(3, 10, 28, 28);
            }

            ctx.fillStyle = color;
            if (sym === 'sun') {
              ctx.beginPath();
              ctx.arc(17, 24, 6, 0, Math.PI * 2);
              ctx.fill();
              for (let a = 0; a < 8; a++) {
                const rad = (a * Math.PI) / 4;
                ctx.fillRect(
                  17 + Math.cos(rad) * 8 - 1,
                  24 + Math.sin(rad) * 8 - 1,
                  2,
                  2
                );
              }
            } else {
              ctx.beginPath();
              ctx.arc(17, 24, 6.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#5d6673';
              ctx.beginPath();
              ctx.arc(20, 22, 5.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        );
      }
    }

    // The Shadow Apparition
    this.createCanvas(scene, 'shadow_npc', 36, 48, (ctx) => {
      const g = ctx.createRadialGradient(18, 24, 2, 18, 24, 18);
      g.addColorStop(0, 'rgba(165, 138, 191, 0.45)');
      g.addColorStop(1, 'rgba(18, 23, 45, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 36, 48);

      ctx.fillStyle = '#181429';
      ctx.beginPath();
      ctx.moveTo(11, 14);
      ctx.lineTo(18, 7);
      ctx.lineTo(25, 14);
      ctx.lineTo(28, 40);
      ctx.lineTo(8, 40);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#9c7ec7';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Subtle starry eyes
      ctx.fillStyle = '#dbb8ef';
      ctx.fillRect(15, 16, 2, 2);
      ctx.fillRect(19, 16, 2, 2);
    });

    // 5. THREE CRYSTALS (Memory Gold, Hope Blue, Balance Purple)
    const crystals: Array<{ key: string; outer: string; inner: string }> = [
      { key: 'crystal_memory', outer: '#e6b842', inner: '#fff1a8' },
      { key: 'crystal_hope', outer: '#4daee6', inner: '#b8edff' },
      { key: 'crystal_balance', outer: '#b96ce6', inner: '#eabfff' },
    ];

    for (const c of crystals) {
      this.createCanvas(scene, c.key, 38, 48, (ctx) => {
        const g = ctx.createRadialGradient(19, 24, 2, 19, 24, 18);
        g.addColorStop(0, c.inner);
        g.addColorStop(0.5, c.outer);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 38, 48);

        ctx.fillStyle = c.outer;
        ctx.beginPath();
        ctx.moveTo(19, 6);
        ctx.lineTo(31, 24);
        ctx.lineTo(19, 42);
        ctx.lineTo(7, 24);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = c.inner;
        ctx.beginPath();
        ctx.moveTo(19, 12);
        ctx.lineTo(25, 24);
        ctx.lineTo(19, 36);
        ctx.lineTo(13, 24);
        ctx.closePath();
        ctx.fill();
      });
    }
  }

  private static drawRunestoneBase(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#68736e';
    ctx.fillRect(4, 8, 26, 34);
    ctx.fillStyle = '#7d8a84';
    ctx.fillRect(7, 5, 20, 4);
  }

  private static createLightingAndParticles(scene: Phaser.Scene): void {
    // Soft radial light mask texture
    this.createCanvas(scene, 'light_radial', 256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
      g.addColorStop(0, 'rgba(255, 232, 156, 0.46)');
      g.addColorStop(0.45, 'rgba(255, 206, 110, 0.22)');
      g.addColorStop(0.75, 'rgba(255, 185, 85, 0.07)');
      g.addColorStop(1, 'rgba(255, 180, 70, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    });

    this.createCanvas(scene, 'particle_firefly', 8, 8, (ctx) => {
      const g = ctx.createRadialGradient(4, 4, 0.5, 4, 4, 4);
      g.addColorStop(0, 'rgba(255, 242, 160, 1)');
      g.addColorStop(1, 'rgba(255, 215, 90, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 8);
    });

    this.createCanvas(scene, 'particle_mist', 96, 40, (ctx) => {
      const g = ctx.createRadialGradient(48, 20, 6, 48, 20, 46);
      g.addColorStop(0, 'rgba(180, 220, 230, 0.14)');
      g.addColorStop(1, 'rgba(180, 220, 230, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 40);
    });
  }
}

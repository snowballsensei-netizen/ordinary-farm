// Farmhouse interior: floor, walls, rugs and furniture (one texture per key).
import Phaser from 'phaser';
import { addFrames, addTex, ellipse, makeCanvas, outline, px, rect, shade, type Ctx } from './draw';
import { P } from './palette';

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Ctx) => void, ol = true): void {
  const { c, ctx } = makeCanvas(w, h);
  draw(ctx);
  if (ol) outline(ctx, 0, 0, w, h);
  addTex(scene, key, c);
}

export function genInterior(scene: Phaser.Scene): void {
  // --- floor planks (16x16)
  tex(scene, 'in_floor', 16, 16, (g) => {
    rect(g, 0, 0, 16, 16, P.wood);
    for (let y = 0; y < 16; y += 4) {
      rect(g, 0, y, 16, 1, shade(P.wood, 0.78));
      rect(g, ((y * 5) % 16), y + 1, 1, 3, shade(P.wood, 0.85));
    }
    px(g, 4, 2, P.woodLight);
    px(g, 11, 10, P.woodLight);
  }, false);
  // --- wall (top face) and wall front with wainscot
  tex(scene, 'in_wall_top', 16, 16, (g) => {
    rect(g, 0, 0, 16, 16, P.dark);
    rect(g, 0, 0, 16, 2, shade(P.dark, 0.7));
  }, false);
  tex(scene, 'in_wall', 16, 16, (g) => {
    rect(g, 0, 0, 16, 16, '#d9c39a');
    for (let x = 2; x < 16; x += 6) rect(g, x, 0, 1, 10, '#cdb488');
    rect(g, 0, 10, 16, 6, P.brown);
    rect(g, 0, 10, 16, 1, P.woodLight);
    rect(g, 0, 15, 16, 1, P.dark);
  }, false);
  // --- rugs
  tex(scene, 'in_rug2', 48, 32, (g) => {
    ellipse(g, 24, 16, 23, 15, P.blueDark);
    ellipse(g, 24, 16, 19, 12, P.blue);
    ellipse(g, 24, 16, 12, 7, P.glass);
  }, false);
  tex(scene, 'in_mat', 32, 14, (g) => {
    rect(g, 0, 0, 32, 14, P.leafDark);
    rect(g, 2, 2, 28, 10, P.leaf);
    for (let x = 4; x < 28; x += 4) rect(g, x, 4, 2, 6, P.leafLight);
  }, false);
  // --- bed (32x40)
  tex(scene, 'in_bed', 32, 40, (g) => {
    rect(g, 1, 0, 30, 6, P.brown);
    rect(g, 2, 6, 28, 33, P.white);
    rect(g, 5, 8, 22, 7, P.cream);
    rect(g, 2, 17, 28, 22, P.blue);
    rect(g, 2, 17, 28, 2, P.glass);
    for (let y = 22; y < 38; y += 5) rect(g, 2, y, 28, 1, P.blueDark);
  });
  // --- fish tank (40x28), 2 frames for water shimmer
  {
    const { c, ctx: g } = makeCanvas(80, 32);
    for (let f = 0; f < 2; f++) {
      const o = f * 40;
      rect(g, o + 1, 22, 38, 9, P.dark);
      rect(g, o + 2, 2, 36, 20, P.water);
      rect(g, o + 2, 2, 36, 3, f ? P.waterLight : P.waterFoam);
      rect(g, o + 2, 18, 36, 4, P.tan);
      rect(g, o + 6, 10, 2, 8, P.leaf);
      rect(g, o + 8, 13, 2, 5, P.leafLight);
      rect(g, o + 30, 8 + f, 2, 10, P.leafDark);
      rect(g, o + 32, 12, 2, 6, P.leaf);
      px(g, o + 20, 17, P.stone);
      rect(g, o + 21, 16, 3, 2, P.stoneLight);
      rect(g, o + 1, 1, 38, 1, P.grayLight);
      outline(g, o, 0, 40, 32);
    }
    const t = addTex(scene, 'in_tank', c);
    addFrames(t, 40, 32, 2, 2);
  }
  tex(scene, 'in_fish', 5, 3, (g) => {
    rect(g, 1, 0, 3, 3, P.orange);
    px(g, 0, 1, P.yellow);
    px(g, 3, 1, P.ink);
  }, false);
  tex(scene, 'in_bubble', 2, 2, (g) => rect(g, 0, 0, 2, 2, P.waterFoam), false);
  // --- desk (32x24)
  tex(scene, 'in_desk', 32, 24, (g) => {
    rect(g, 0, 4, 32, 8, P.woodLight);
    rect(g, 0, 12, 32, 12, P.wood);
    rect(g, 2, 14, 10, 4, P.brown);
    rect(g, 20, 14, 10, 4, P.brown);
    rect(g, 6, 0, 10, 6, P.white);
    rect(g, 7, 1, 8, 1, P.gray);
    rect(g, 7, 3, 6, 1, P.gray);
    rect(g, 22, 1, 2, 6, P.red);
  });
  // --- stove + fridge
  tex(scene, 'in_stove', 16, 26, (g) => {
    rect(g, 0, 2, 16, 24, P.grayDark);
    rect(g, 0, 2, 16, 6, P.gray);
    ellipse(g, 4, 5, 2, 1, P.black);
    ellipse(g, 11, 5, 2, 1, P.black);
    rect(g, 2, 11, 12, 10, P.black);
    rect(g, 3, 12, 10, 2, P.orange);
    rect(g, 4, 0, 6, 3, P.stoneDark);
  });
  tex(scene, 'in_fridge', 16, 30, (g) => {
    rect(g, 0, 0, 16, 30, P.white);
    rect(g, 0, 10, 16, 1, P.grayLight);
    rect(g, 12, 3, 2, 5, P.gray);
    rect(g, 12, 13, 2, 8, P.gray);
    rect(g, 3, 14, 4, 4, P.yellow);
  });
  tex(scene, 'in_counter', 16, 24, (g) => {
    rect(g, 0, 0, 16, 8, P.stoneLight);
    rect(g, 0, 8, 16, 16, P.wood);
    rect(g, 7, 12, 2, 2, P.dark);
  });
  // --- bookshelf (32x32)
  tex(scene, 'in_shelf', 32, 32, (g) => {
    rect(g, 0, 0, 32, 32, P.brown);
    const cols = [P.red, P.blue, P.leaf, P.yellow, P.purple, P.orange, P.cream];
    for (let r = 0; r < 3; r++) {
      rect(g, 2, 2 + r * 10, 28, 8, P.dark);
      for (let i = 0; i < 9; i++) rect(g, 3 + i * 3, 3 + r * 10 + (i % 3 === 0 ? 2 : 0), 2, 7 - (i % 3 === 0 ? 2 : 0), cols[(i + r * 2) % cols.length]);
    }
  });
  // --- potted plant (14x22)
  tex(scene, 'in_plant', 14, 22, (g) => {
    ellipse(g, 7, 7, 6, 6, P.leaf);
    ellipse(g, 5, 5, 3, 3, P.leafLight);
    rect(g, 6, 10, 2, 5, P.leafDark);
    rect(g, 3, 14, 8, 8, P.orange);
    rect(g, 2, 14, 10, 2, P.redDark);
  });
  // --- lamp (12x28) and its glow
  tex(scene, 'in_lamp', 12, 28, (g) => {
    rect(g, 1, 0, 10, 8, P.yellowLight);
    rect(g, 1, 7, 10, 1, P.gold);
    rect(g, 5, 8, 2, 17, P.dark);
    rect(g, 2, 25, 8, 3, P.dark);
  });
  {
    const { c, ctx: g } = makeCanvas(64, 64);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,220,140,0.9)');
    grd.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    addTex(scene, 'in_glow', c);
  }
  // --- fireplace (32x32), 2 frames of flame
  {
    const { c, ctx: g } = makeCanvas(64, 32);
    for (let f = 0; f < 2; f++) {
      const o = f * 32;
      rect(g, o + 0, 0, 32, 32, P.stone);
      for (let y = 0; y < 32; y += 6) for (let x = (y / 6) % 2 ? 0 : 4; x < 32; x += 8) rect(g, o + x, y, 7, 5, P.stoneLight);
      rect(g, o + 0, 0, 32, 4, P.brown);
      rect(g, o + 7, 12, 18, 20, P.black);
      rect(g, o + 9, 27, 14, 3, P.brown);
      ellipse(g, o + 16, 24, 5, 4 + f, P.orange);
      ellipse(g, o + 16 + (f ? 1 : -1), 24, 2, 2 + f, P.yellowLight);
      outline(g, o, 0, 32, 32);
    }
    const t = addTex(scene, 'in_fire', c);
    addFrames(t, 32, 32, 2, 2);
  }
  // --- window (frame only; the sky is drawn behind it by the scene)
  tex(scene, 'in_window', 28, 20, (g) => {
    rect(g, 0, 0, 28, 20, P.woodLight);
    g.clearRect(2, 2, 11, 16);
    g.clearRect(15, 2, 11, 16);
    rect(g, 0, 18, 28, 2, P.wood);
  }, false);
  // --- TV (24x22)
  tex(scene, 'in_tv', 24, 22, (g) => {
    rect(g, 0, 0, 24, 16, P.grayDark);
    rect(g, 2, 2, 16, 12, P.blueDark);
    rect(g, 4, 4, 6, 2, P.glass);
    px(g, 20, 4, P.red);
    px(g, 20, 8, P.yellow);
    rect(g, 3, 16, 18, 6, P.brown);
  });
  // --- armchair, table
  tex(scene, 'in_chair', 20, 20, (g) => {
    rect(g, 0, 0, 20, 8, P.purple);
    rect(g, 0, 6, 4, 14, shade(P.purple, 0.8));
    rect(g, 16, 6, 4, 14, shade(P.purple, 0.8));
    rect(g, 4, 8, 12, 10, P.pink);
  });
  tex(scene, 'in_table', 28, 18, (g) => {
    rect(g, 0, 0, 28, 10, P.woodLight);
    rect(g, 2, 10, 3, 8, P.wood);
    rect(g, 23, 10, 3, 8, P.wood);
    rect(g, 10, 2, 8, 5, P.cream);
    ellipse(g, 14, 3, 2, 1, P.red);
  });
}

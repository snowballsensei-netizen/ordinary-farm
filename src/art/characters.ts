// The farmer and the livestock.
import Phaser from 'phaser';
import { addFrames, addTex, dither, ditherEllipse, ellipse, makeCanvas, mirrorCopy, outline, pix, px, rect, shade, tex, type Ctx } from './draw';
import { P } from './palette';

interface Style {
  hat: string; hatD: string; hatL: string; band: string;
  coat: string; coatD: string; coatL: string;
  leg: string; hair: string; boot: string;
  female: boolean;
}

const MALE: Style = {
  hat: '#2f8f8a', hatD: '#1f6a6a', hatL: '#5ab8a8', band: P.coral,
  coat: '#f5c440', coatD: '#d89a30', coatL: '#ffe27a',
  leg: '#35548a', hair: '#e0604a', boot: '#a8403a', female: false,
};

const FEMALE: Style = {
  hat: '#f0dca0', hatD: '#c8a868', hatL: '#fff4c8', band: '#7a5ac8',
  coat: '#ef7a62', coatD: '#c4504a', coatL: '#ffa88a',
  leg: '#f6ead0', hair: '#7a4630', boot: '#4a8a5a', female: true,
};

type FDir = 'down' | 'up' | 'right';

function drawFarmer(ctx: Ctx, ox: number, oy: number, dir: FDir, f: number, st: Style): void {
  const { hat: HAT, hatD: HAT_D, hatL: HAT_L, coat: COAT, coatD: COAT_D, coatL: COAT_L, leg: LEG, hair: HAIR, boot: BOOT } = st;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  // bob DOWN on passing frames so the hat never reaches the top edge of the frame
  const b = f % 2 === 1 ? 1 : 0;
  const R = (x: number, y: number, w: number, h: number, c: string) => rect(ctx, ox + x, oy + y, w, h, c);
  const X = (x: number, y: number, c: string) => px(ctx, ox + x, oy + y, c);

  // short legs + chunky rain boots
  if (dir === 'right') {
    const a = Math.round(step * 2);
    R(6 - a, 25, 3, 3, LEG);
    R(5 - a, 28, 4, 3, BOOT);
    R(8 + a, 25, 3, 3, LEG);
    R(8 + a, 28, 4, 3, BOOT);
  } else {
    const l = step > 0 ? -1 : 0;
    const r = step < 0 ? -1 : 0;
    R(5, 25, 2, 3 + l, LEG);
    R(4, 28 + l, 4, 3, BOOT);
    R(9, 25, 2, 3 + r, LEG);
    R(8, 28 + r, 4, 3, BOOT);
  }

  // A-line raincoat (flares out at the hem)
  const coatTop = 14 + b;
  for (let i = 0; i < 12; i++) {
    const half = 3 + Math.min(2, Math.floor(i / 4)) + (i > 9 ? 1 : 0);
    R(8 - half, coatTop + i, half * 2, 1, COAT);
  }
  dither(ctx, ox + 3, oy + coatTop + 8, 10, 4, COAT_D);
  if (dir === 'down') {
    R(8, coatTop + 2, 1, 10, COAT_D);
    X(7, coatTop + 4, P.ink);
    X(7, coatTop + 7, P.ink);
    R(5, coatTop + 1, 6, 1, COAT_L);
    R(4, coatTop + 7, 2, 2, COAT_D);
    R(10, coatTop + 7, 2, 2, COAT_D);
  } else if (dir === 'up') {
    R(5, coatTop + 1, 6, 1, COAT_L);
    R(7, coatTop + 3, 2, 6, COAT_D);
  } else {
    R(4, coatTop + 1, 6, 1, COAT_L);
    R(11, coatTop + 3, 1, 3, COAT_D);
  }
  // arms (sleeves) with mittened hands
  if (dir === 'right') {
    const s = Math.round(step * 1.5);
    R(7 + s, coatTop + 2, 3, 6, COAT_D);
    R(7 + s, coatTop + 8, 3, 1, P.skin);
  } else {
    const la = step > 0 ? 1 : 0;
    const ra = step < 0 ? 1 : 0;
    R(2, coatTop + 2 + la, 2, 6, COAT_D);
    R(2, coatTop + 8 + la, 2, 1, P.skin);
    R(12, coatTop + 2 + ra, 2, 6, COAT_D);
    R(12, coatTop + 8 + ra, 2, 1, P.skin);
  }

  // round head
  R(4, 6 + b, 8, 8, P.skin);
  R(5, 5 + b, 6, 1, P.skin);
  R(5, 14 + b, 6, 1, P.skinDark);
  if (dir === 'down') {
    R(3, 8 + b, 1, 5, HAIR);
    R(12, 8 + b, 1, 5, HAIR);
    X(4, 13 + b, HAIR);
    X(11, 13 + b, HAIR);
    X(6, 10 + b, P.black);
    X(9, 10 + b, P.black);
    X(6, 9 + b, '#ffffff');
    R(5, 12 + b, 1, 1, '#f08a8a');
    R(10, 12 + b, 1, 1, '#f08a8a');
    X(7, 12 + b, P.skinDark);
    X(8, 12 + b, P.skinDark);
  } else if (dir === 'up') {
    R(3, 7 + b, 10, 7, HAIR);
    R(5, 14 + b, 6, 1, shade(HAIR, 0.75));
  } else {
    R(3, 8 + b, 4, 6, HAIR);
    X(4, 14 + b, HAIR);
    X(10, 10 + b, P.black);
    X(12, 11 + b, P.skin);
    X(10, 12 + b, '#f08a8a');
  }

  if (st.female) {
    // long hair with pigtails, plus a frilly hem on the dress-coat
    const HD = shade(HAIR, 0.75);
    R(3, coatTop + 11, 10, 1, COAT_L);
    if (dir === 'down') {
      R(2, 8 + b, 2, 8, HAIR);
      R(12, 8 + b, 2, 8, HAIR);
      X(2, 16 + b, HD);
      X(13, 16 + b, HD);
      X(2, 15 + b, st.band);
      X(13, 15 + b, st.band);
      R(4, 7 + b, 8, 1, HAIR);
    } else if (dir === 'up') {
      R(3, 7 + b, 10, 9, HAIR);
      R(7, 9 + b, 1, 7, HD);
      R(2, 10 + b, 1, 7, HAIR);
      R(13, 10 + b, 1, 7, HAIR);
      X(2, 15 + b, st.band);
      X(13, 15 + b, st.band);
    } else {
      R(2, 8 + b, 5, 7, HAIR);
      R(2, 15 + b, 2, 3, HAIR);
      X(2, 18 + b, HD);
      X(3, 16 + b, st.band);
      R(6, 7 + b, 5, 1, HAIR);
    }
  }

  // bucket hat: dome + drooping brim
  R(4, 3 + b, 8, 3, HAT);
  R(5, 2 + b, 6, 1, HAT);
  R(5, 3 + b, 3, 1, HAT_L);
  R(2, 6 + b, 12, 2, HAT_D);
  R(3, 6 + b, 10, 1, HAT);
  X(2, 8 + b, HAT_D);
  X(13, 8 + b, HAT_D);
  R(4, 5 + b, 8, 1, st.band);
  if (st.female) {
    // flower tucked into the hat band
    const fx = dir === 'right' ? 5 : 10;
    X(fx - 1, 4 + b, '#ffffff');
    X(fx + 1, 4 + b, '#ffffff');
    X(fx, 3 + b, '#ffffff');
    X(fx, 5 + b, '#ffffff');
    X(fx, 4 + b, P.yellow);
  }
}

function genFarmerSheet(scene: Phaser.Scene, key: string, suffix: string, st: Style): void {
  const FW = 16;
  const FH = 32;
  const { c, ctx } = makeCanvas(FW * 4, FH * 4);
  const rows: FDir[] = ['down', 'up', 'right'];
  rows.forEach((d, i) => {
    const row = d === 'right' ? 3 : i;
    for (let f = 0; f < 4; f++) {
      drawFarmer(ctx, f * FW, row * FH, d, f, st);
      outline(ctx, f * FW, row * FH, FW, FH);
    }
  });
  // left row = mirrored right row
  for (let f = 0; f < 4; f++) mirrorCopy(ctx, f * FW, 3 * FH, FW, FH, f * FW, 2 * FH);
  const t = addTex(scene, key, c);
  addFrames(t, FW, FH, 16, 4);

  const names = ['down', 'up', 'left', 'right'];
  names.forEach((n, row) => {
    const anim = `walk_${n}${suffix}`;
    if (scene.anims.exists(anim)) return;
    scene.anims.create({
      key: anim,
      frames: [0, 1, 2, 3].map((f) => ({ key, frame: row * 4 + f })),
      frameRate: 8,
      repeat: -1,
    });
  });
}

/** Male farmer 'player' (walk_<dir>) and female farmer 'player_f' (walk_<dir>_f). */
export function genPlayer(scene: Phaser.Scene): void {
  genFarmerSheet(scene, 'player', '', MALE);
  genFarmerSheet(scene, 'player_f', '_f', FEMALE);
}

// ---------------------------------------------------------------- animals
// Drawn facing right; sprites are flipped for left.

// Rounder, chunkier animals drawn from ellipses (same canvas sizes as the
// old string-art: chicken 16x15, cow 24x17, pig 22x14, sheep 22x15, goat 22x15).
const legs = (ctx: Ctx, xs: number[], y: number, h: number, c: string, hoof: string) => {
  for (const x of xs) {
    rect(ctx, x, y, 2, h, c);
    rect(ctx, x, y + h - 1, 2, 1, hoof);
  }
};

function chicken(ctx: Ctx): void {
  rect(ctx, 6, 12, 1, 2, P.orange);
  rect(ctx, 9, 12, 1, 2, P.orange);
  ellipse(ctx, 7, 9, 5, 3, '#fffaf0');
  ditherEllipse(ctx, 6, 11, 4, 1, '#d8d4e4');
  ellipse(ctx, 10, 5, 3, 3, '#fffaf0');
  rect(ctx, 2, 6, 2, 2, '#fffaf0');
  ellipse(ctx, 6, 9, 2, 1, '#e8e2f0');
  rect(ctx, 9, 1, 3, 1, P.red);
  px(ctx, 10, 0 + 1, P.coral);
  px(ctx, 11, 4, P.black);
  rect(ctx, 13, 5, 2, 1, P.orange);
  px(ctx, 12, 6, P.coral);
}

function cow(ctx: Ctx): void {
  legs(ctx, [5, 8, 14, 17], 11, 5, '#f4efe6', '#3e3a4a');
  ellipse(ctx, 11, 8, 9, 5, '#f4efe6');
  ditherEllipse(ctx, 11, 11, 8, 2, '#d8d4e0');
  ellipse(ctx, 8, 6, 3, 2, '#3e3a4a');
  ellipse(ctx, 14, 9, 2, 2, '#3e3a4a');
  rect(ctx, 1, 6, 2, 1, '#8c95a8');
  px(ctx, 1, 7, '#3e3a4a');
  ellipse(ctx, 19, 6, 3, 3, '#f4efe6');
  ellipse(ctx, 20, 8, 2, 2, '#f5a0b4');
  px(ctx, 20, 8, '#c86a80');
  px(ctx, 19, 5, P.black);
  rect(ctx, 17, 1, 1, 2, '#e8dcc0');
  rect(ctx, 21, 1, 1, 2, '#e8dcc0');
  px(ctx, 16, 4, '#3e3a4a');
}

function pig(ctx: Ctx): void {
  legs(ctx, [5, 8, 12, 15], 9, 3, '#f4a8b8', '#a85a6a');
  ellipse(ctx, 10, 6, 8, 4, '#f4a8b8');
  ditherEllipse(ctx, 10, 9, 7, 1, '#e08898');
  ellipse(ctx, 17, 6, 3, 3, '#f4a8b8');
  rect(ctx, 18, 5, 2, 3, '#e88898');
  px(ctx, 19, 6, '#a85a6a');
  px(ctx, 17, 5, P.black);
  px(ctx, 15, 2, '#e08898');
  px(ctx, 16, 2, '#e08898');
  px(ctx, 1, 5, '#e88898');
  px(ctx, 2, 4, '#e88898');
}

function sheep(ctx: Ctx): void {
  legs(ctx, [5, 8, 12, 15], 10, 4, '#3e3a4a', '#1e2230');
  for (const [x, y] of [[5, 5], [9, 4], [13, 5], [6, 8], [11, 8], [15, 8]]) ellipse(ctx, x, y, 3, 3, '#f6f0e0');
  ditherEllipse(ctx, 10, 9, 7, 2, '#d8d0c4');
  ellipse(ctx, 18, 6, 2, 3, '#3e3a4a');
  rect(ctx, 16, 2, 3, 2, '#f6f0e0');
  px(ctx, 19, 5, '#fffaf0');
  rect(ctx, 16, 6, 1, 1, '#3e3a4a');
}

function goat(ctx: Ctx): void {
  legs(ctx, [5, 8, 12, 15], 9, 5, '#ece0c8', '#5c4a3a');
  ellipse(ctx, 10, 7, 8, 4, '#ece0c8');
  ditherEllipse(ctx, 10, 10, 7, 1, '#cbbfa8');
  ellipse(ctx, 8, 6, 2, 2, '#b88a5a');
  ellipse(ctx, 17, 4, 3, 3, '#ece0c8');
  rect(ctx, 19, 4, 2, 2, '#ece0c8');
  px(ctx, 20, 5, '#f5a0b4');
  px(ctx, 17, 3, P.black);
  rect(ctx, 17, 7, 1, 3, '#ece0c8');
  px(ctx, 15, 0, '#6a5a4a');
  px(ctx, 14, 1, '#6a5a4a');
  px(ctx, 18, 0, '#6a5a4a');
  px(ctx, 1, 4, '#b88a5a');
  px(ctx, 2, 5, '#b88a5a');
}

export function genAnimals(scene: Phaser.Scene): void {
  const A = (key: string, w: number, h: number, fn: (c: Ctx) => void) =>
    tex(scene, key, w, h, (c) => {
      c.translate(1, 1);
      fn(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
    });
  // +2 width / +1 height of padding so the 1px outline never clips at the edges
  A('chicken', 18, 16, chicken);
  A('cow', 26, 18, cow);
  A('pig', 24, 14, pig);
  A('sheep', 24, 16, sheep);
  A('goat', 24, 16, goat);

  tex(scene, 'shadow', 14, 5, (ctx) => ellipse(ctx, 7, 2, 6, 2, '#000000'), null);
  tex(scene, 'shadow_big', 22, 7, (ctx) => ellipse(ctx, 11, 3, 10, 3, '#000000'), null);
}

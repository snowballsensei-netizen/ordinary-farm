// Effects sprites: tornado, crows, moles, meteors, particles, glows, cursor.
import Phaser from 'phaser';
import { addFrames, addTex, ellipse, line, makeCanvas, outline, px, rect, tex, type Ctx } from './draw';
import { P } from './palette';

function tornadoFrame(ctx: Ctx, ox: number, f: number): void {
  const H = 56;
  for (let y = 0; y < H - 4; y++) {
    const t = 1 - y / H;
    const w = Math.round(3 + t * t * 14);
    const sway = Math.round(Math.sin(y / 7 + f * 1.6) * 2 * t);
    const cx = ox + 16 + sway;
    rect(ctx, cx - w, y, w * 2, 1, y % 2 ? '#a8a8b4' : '#9898a6');
    const stripe = (y * 3 + f * 5) % (w * 2 + 6);
    if (stripe < w * 2) rect(ctx, cx - w + stripe, y, 3, 1, '#d8d8e4');
    if ((y + f) % 5 === 0) px(ctx, cx - w, y, '#6a6a78');
  }
  ellipse(ctx, ox + 16, H - 3, 9, 2, '#7a6a5a');
  for (let i = 0; i < 4; i++) {
    const a = f * 1.4 + i * 1.6;
    px(ctx, ox + 16 + Math.round(Math.cos(a) * 12), 30 + Math.round(Math.sin(a) * 10), P.brown);
    px(ctx, ox + 16 + Math.round(Math.cos(a + 3) * 8), 42 + Math.round(Math.sin(a) * 4), P.leaf);
  }
}

function crowFrame(ctx: Ctx, ox: number, up: boolean): void {
  ellipse(ctx, ox + 7, 6, 4, 2, P.black);
  ellipse(ctx, ox + 11, 5, 2, 2, P.black);
  px(ctx, ox + 14, 5, P.yellow);
  px(ctx, ox + 12, 4, '#ffffff');
  if (up) {
    line(ctx, ox + 6, 5, ox + 2, 0, '#2a2438');
    line(ctx, ox + 8, 5, ox + 5, 0, '#2a2438');
  } else {
    line(ctx, ox + 6, 7, ox + 2, 11, '#2a2438');
    line(ctx, ox + 8, 7, ox + 5, 11, '#2a2438');
  }
  line(ctx, ox + 2, 6, ox, 7, P.black);
}

export function genFx(scene: Phaser.Scene): void {
  {
    const { c, ctx } = makeCanvas(32 * 4, 56);
    for (let f = 0; f < 4; f++) {
      tornadoFrame(ctx, f * 32, f);
      outline(ctx, f * 32, 0, 32, 56, '#4a4a58');
    }
    addFrames(addTex(scene, 'tornado', c), 32, 56, 4, 4);
  }
  {
    const { c, ctx } = makeCanvas(32, 12);
    crowFrame(ctx, 0, true);
    crowFrame(ctx, 16, false);
    addFrames(addTex(scene, 'crow', c), 16, 12, 2, 2);
  }
  for (const k of ['tornado_spin', 'crow_fly']) if (scene.anims.exists(k)) scene.anims.remove(k);
  scene.anims.create({ key: 'tornado_spin', frames: [0, 1, 2, 3].map((f) => ({ key: 'tornado', frame: f })), frameRate: 12, repeat: -1 });
  scene.anims.create({ key: 'crow_fly', frames: [0, 1].map((f) => ({ key: 'crow', frame: f })), frameRate: 8, repeat: -1 });

  tex(scene, 'mole', 12, 12, (c) => {
    ellipse(c, 6, 7, 4, 4, '#6a4a3a');
    ellipse(c, 6, 9, 3, 2, '#8a6a5a');
    px(c, 6, 9, P.pink);
    px(c, 4, 6, P.black);
    px(c, 8, 6, P.black);
    rect(c, 1, 10, 10, 2, P.soil);
  });
  tex(scene, 'meteor', 14, 14, (c) => {
    ellipse(c, 7, 7, 5, 5, '#ff8a3a');
    ellipse(c, 7, 7, 3, 3, '#ffe08a');
    px(c, 6, 6, '#ffffff');
  });
  tex(scene, 'heart', 9, 8, (c) => {
    rect(c, 1, 1, 3, 3, P.red);
    rect(c, 5, 1, 3, 3, P.red);
    rect(c, 1, 3, 7, 2, P.red);
    rect(c, 2, 5, 5, 1, P.red);
    px(c, 4, 6, P.red);
    px(c, 2, 2, '#ff9a9a');
  });
  tex(scene, 'sparkle', 7, 7, (c) => {
    rect(c, 3, 0, 1, 7, '#ffffff');
    rect(c, 0, 3, 7, 1, '#ffffff');
    px(c, 3, 3, P.yellowLight);
  }, null);
  tex(scene, 'dust', 6, 6, (c) => ellipse(c, 3, 3, 2, 2, '#e8dcc8'), null);
  tex(scene, 'drop', 3, 4, (c) => {
    rect(c, 1, 0, 1, 1, P.waterFoam);
    rect(c, 0, 1, 3, 3, P.waterLight);
  }, null);
  tex(scene, 'feather', 5, 4, (c) => {
    line(c, 0, 3, 4, 0, '#ffffff');
    px(c, 2, 2, '#d8ccb8');
  }, null);
  tex(scene, 'clod', 4, 4, (c) => rect(c, 0, 0, 3, 3, P.soilDark), null);
  tex(scene, 'leafp', 4, 3, (c) => {
    rect(c, 0, 1, 3, 1, P.leaf);
    px(c, 1, 0, P.leafLight);
  }, null);
  tex(scene, 'pixel', 2, 2, (c) => rect(c, 0, 0, 2, 2, '#ffffff'), null);
  tex(scene, 'warn', 12, 11, (c) => {
    for (let y = 0; y < 10; y++) rect(c, 6 - Math.ceil(y / 2), y, Math.ceil(y / 2) * 2, 1, P.yellow);
    rect(c, 5, 3, 2, 4, P.ink);
    rect(c, 5, 8, 2, 1, P.ink);
  });

  // soft radial glow for night lights
  {
    const { c, ctx } = makeCanvas(64, 64);
    ctx.imageSmoothingEnabled = true;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,220,140,0.9)');
    g.addColorStop(0.4, 'rgba(255,190,100,0.35)');
    g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    addTex(scene, 'glow', c);
  }

  // tile cursor
  tex(scene, 'cursor', 16, 16, (c) => {
    const col = '#ffffff';
    for (const [x, y] of [[0, 0], [12, 0], [0, 12], [12, 12]]) {
      rect(c, x, y + (y ? 3 : 0), 4, 1, col);
      rect(c, x + (x ? 3 : 0), y, 1, 4, col);
    }
  }, null);
  tex(scene, 'cursor_bad', 16, 16, (c) => {
    for (const [x, y] of [[0, 0], [12, 0], [0, 12], [12, 12]]) {
      rect(c, x, y + (y ? 3 : 0), 4, 1, '#ff6a5a');
      rect(c, x + (x ? 3 : 0), y, 1, 4, '#ff6a5a');
    }
  }, null);
}

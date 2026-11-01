// Title screen art: side-view parallax layers, clouds, windmill and the logo.
import Phaser from 'phaser';
import { ArtRand, addTex, ellipse, line, makeCanvas, outline, px, rect, tex, type Ctx } from './draw';
import { glyph } from './font';
import { P } from './palette';

const W = 480;

function wave(x: number, parts: [number, number, number][]): number {
  // sum of sines with whole periods across W so the layer tiles seamlessly
  return parts.reduce((s, [amp, k, ph]) => s + amp * Math.sin((x / W) * Math.PI * 2 * k + ph), 0);
}

function layerFar(ctx: Ctx): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(40 + wave(x, [[16, 2, 0.4], [8, 5, 1.2], [3, 11, 0.2]]));
    rect(ctx, x, top, 1, 100 - top, '#9ab4dc');
    rect(ctx, x, top, 1, 2, '#a8c0e4');
    // snowy caps on the highest peaks
    if (top < 32) rect(ctx, x, top, 1, 4, '#e8f0fa');
  }
}

function layerMid(ctx: Ctx): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(40 + wave(x, [[10, 3, 2.0], [5, 7, 0.5]]));
    rect(ctx, x, top, 1, 90 - top, '#45a83e');
    rect(ctx, x, top, 1, 2, '#7cd25c');
  }
  const r = new ArtRand(42);
  for (let i = 0; i < 26; i++) {
    const x = (i * 19 + r.int(0, 8)) % W;
    const top = Math.round(40 + wave(x, [[10, 3, 2.0], [5, 7, 0.5]]));
    const s = r.int(5, 9);
    for (const dx of [0, W, -W]) {
      ellipse(ctx, x + dx, top - s + 3, s - 1, s, '#2e7a34');
      ellipse(ctx, x + dx - 1, top - s + 1, s - 3, s - 3, '#3d9234');
    }
  }
}

function layerGround(ctx: Ctx): void {
  rect(ctx, 0, 14, W, 46, '#a0705a');
  const r = new ArtRand(7);
  for (let i = 0; i < 260; i++) px(ctx, r.int(0, W - 1), r.int(18, 59), r.pick(['#8a5e50', '#b8846a', '#7e5648']));
  rect(ctx, 0, 8, W, 8, '#66c84f');
  rect(ctx, 0, 8, W, 2, '#8fe06a');
  for (let x = 0; x < W; x += 3) {
    const h = r.int(1, 4);
    rect(ctx, x, 8 - h, 1, h, r.next() > 0.5 ? '#66c84f' : '#52b041');
  }
  rect(ctx, 0, 15, W, 2, '#3d9234');
}

function fenceLayer(ctx: Ctx): void {
  for (let x = 0; x < W; x += 20) {
    rect(ctx, x + 2, 2, 4, 18, P.woodLight);
    rect(ctx, x + 2, 2, 4, 1, P.woodPale);
  }
  rect(ctx, 0, 6, W, 2, P.wood);
  rect(ctx, 0, 12, W, 2, P.wood);
}

function cloud(ctx: Ctx, seed: number, w: number): void {
  const r = new ArtRand(seed);
  const puffs = Math.floor(w / 10);
  for (let i = 0; i < puffs; i++) {
    const x = 8 + (i * (w - 16)) / Math.max(1, puffs - 1);
    const rr = r.int(5, 9);
    ellipse(ctx, x, 18 - rr / 2, rr, rr, '#ffffff');
  }
  rect(ctx, 4, 18, w - 8, 4, '#ffffff');
  rect(ctx, 4, 20, w - 8, 2, '#dce8f4');
}

function windmillTower(ctx: Ctx): void {
  for (let y = 0; y < 60; y++) {
    const w = Math.round(6 + (y / 60) * 8);
    rect(ctx, 16 - w, y + 4, w * 2, 1, y % 6 === 0 ? '#c8b8a0' : '#e8d8c0');
  }
  rect(ctx, 12, 46, 8, 18, P.brown);
  rect(ctx, 8, 0, 16, 8, P.roof);
  rect(ctx, 10, 0, 12, 2, '#d86a5a');
  rect(ctx, 14, 22, 4, 6, P.glass);
}

function windmillBlades(ctx: Ctx): void {
  const c = 28;
  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let i = 3; i < 26; i++) {
      const x = c + dx * i;
      const y = c + dy * i;
      px(ctx, x, y, P.brown);
      if (i > 6) {
        const nx = -dy;
        const ny = dx;
        for (let k = 1; k <= 5; k++) px(ctx, x + nx * k, y + ny * k, k === 5 ? P.wood : '#f3ecd8');
      }
    }
  }
  ellipse(ctx, c, c, 3, 3, P.grayDark);
}

function haystack(ctx: Ctx): void {
  ellipse(ctx, 14, 14, 13, 10, P.yellow);
  ellipse(ctx, 12, 11, 8, 6, P.yellowLight);
  for (let i = 0; i < 8; i++) line(ctx, 4 + i * 3, 20, 6 + i * 3, 10, P.gold);
  rect(ctx, 1, 22, 26, 2, P.gold);
}

function logo(scene: Phaser.Scene): void {
  const text = 'ORDINARY FARM';
  const S = 4;
  const chars = [...text];
  const cw = 6 * S;
  const w = chars.length * cw + 16;
  const h = 8 * S + 20;
  const { c, ctx } = makeCanvas(w, h);
  const grad = ['#fff2b0', '#ffe58a', '#f2c94c', '#f2c94c', '#e8a53a', '#e8853a', '#c8652a'];
  const r = new ArtRand(99);
  const draw = (ox: number, oy: number, shadow: boolean) => {
    chars.forEach((ch, i) => {
      const rows = glyph(ch);
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] !== 'x') continue;
          const x = ox + 8 + i * cw + rx * S;
          const y = oy + 8 + ry * S;
          if (shadow) {
            rect(ctx, x, y, S, S, '#2f6a6a');
            continue;
          }
          rect(ctx, x, y, S, S, grad[Math.min(ry, grad.length - 1)]);
          px(ctx, x, y, '#fffbe0');
          // grass growing on top edges
          const above = ry === 0 || rows[ry - 1][rx] !== 'x';
          if (above) {
            rect(ctx, x, y - 1, S, 2, '#66c84f');
            if (r.next() > 0.4) px(ctx, x + r.int(0, S - 1), y - 2, '#8fe06a');
          }
        }
      });
    });
  };
  draw(0, 4, true);
  draw(0, 0, false);
  outline(ctx, 0, 0, w, h, P.ink);
  outline(ctx, 0, 0, w, h, P.ink);
  addTex(scene, 'logo', c);
}

export function genTitle(scene: Phaser.Scene): void {
  tex(scene, 'tl_far', W, 100, layerFar, null);
  tex(scene, 'tl_mid', W, 90, layerMid, null);
  tex(scene, 'tl_ground', W, 60, layerGround, null);
  tex(scene, 'tl_fence', W, 22, fenceLayer, P.ink);
  tex(scene, 'cloud0', 60, 26, (c) => cloud(c, 1, 60), null);
  tex(scene, 'cloud1', 90, 26, (c) => cloud(c, 2, 90), null);
  tex(scene, 'cloud2', 44, 26, (c) => cloud(c, 3, 44), null);
  tex(scene, 'windmill', 32, 66, windmillTower);
  tex(scene, 'windmill_blades', 56, 56, windmillBlades);
  tex(scene, 'haystack', 28, 26, haystack);
  // round pixel disc measured at pixel centres, with padding so nothing clips
  const disc = (c: Ctx, cx: number, cy: number, r: number, col: string) => {
    c.fillStyle = col;
    for (let y = 0; y < cy * 2; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) > r) continue;
      const w = Math.sqrt(r * r - dy * dy);
      c.fillRect(Math.round(cx - w), y, Math.round(cx + w) - Math.round(cx - w), 1);
    }
  };
  tex(scene, 'sun', 28, 28, (c) => {
    disc(c, 14, 14, 11.5, '#fff0a0');
    disc(c, 14, 14, 9.5, '#ffe066');
    disc(c, 12, 11, 3, '#fff6c0');
  }, null);
  tex(scene, 'moon', 20, 20, (c) => {
    ellipse(c, 10, 10, 8, 8, '#f0f0ff');
    px(c, 7, 8, '#c8c8e0');
    px(c, 9, 13, '#c8c8e0');
    rect(c, 11, 10, 2, 2, '#d8d8ec');
  }, null);
  logo(scene);
}

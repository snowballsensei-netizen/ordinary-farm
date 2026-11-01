// Low-level helpers for drawing pixel art onto canvases and turning them into
// Phaser textures. Swap generators for real spritesheets later by loading
// PNGs under the same texture keys.
import Phaser from 'phaser';
import { P } from './palette';

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, col: string): void {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: Ctx, x: number, y: number, col: string): void {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Draw string-art: each character maps to a palette colour, '.' is transparent. */
export function pix(ctx: Ctx, rows: string[], pal: Record<string, string>, ox = 0, oy = 0): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) px(ctx, ox + x, oy + y, col);
    }
  });
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, col: string): void {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, col: string): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const steps = Math.max(dx, dy, 1);
  for (let i = 0; i <= steps; i++) {
    px(ctx, Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), col);
  }
}

export function hexRgb(col: string): [number, number, number] {
  const n = parseInt(col.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function shade(col: string, f: number): string {
  const [r, g, b] = hexRgb(col);
  return rgbHex(r * f, g * f, b * f);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Adds a 1px outline around every opaque pixel in the region (4-neighbour). */
export function outline(ctx: Ctx, x0: number, y0: number, w: number, h: number, col: string = P.ink): void {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const [r, g, b] = hexRgb(col);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, x0, y0);
}

/** Copy a region horizontally mirrored onto another region. */
export function mirrorCopy(ctx: Ctx, sx: number, sy: number, w: number, h: number, dx: number, dy: number): void {
  const img = ctx.getImageData(sx, sy, w, h);
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = (y * w + (w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = img.data[si + k];
    }
  }
  ctx.putImageData(out, dx, dy);
}

export function addTex(scene: Phaser.Scene, key: string, c: HTMLCanvasElement): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, c)!;
}

/** Add numbered frames to a texture laid out in a grid. */
export function addFrames(tex: Phaser.Textures.Texture, fw: number, fh: number, count: number, cols: number): void {
  for (let i = 0; i < count; i++) {
    tex.add(i, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
  }
}

/** Small deterministic RNG for art generation (independent from gameplay RNG). */
export class ArtRand {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** Convenience: draw a texture with a callback, optionally auto-outlined. */
export function tex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
  outlineCol: string | null = P.ink,
): void {
  const { c, ctx } = makeCanvas(w, h);
  draw(ctx);
  if (outlineCol) outline(ctx, 0, 0, w, h, outlineCol);
  addTex(scene, key, c);
}

/** Checkerboard dither fill: soft risograph-style shading over a region. */
export function dither(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, phase = 0): void {
  ctx.fillStyle = col;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if ((xx + yy + phase) % 2 === 0) ctx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  }
}

/** Dithered ellipse: only every other pixel, for soft rounded shading. */
export function ditherEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, col: string): void {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    for (let x = -w; x <= w; x++) {
      if ((x + y + 64) % 2 === 0) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
}

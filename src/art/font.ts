// A 5x8 pixel font generated at boot and registered as two Phaser bitmap
// fonts: 'px' (plain) and 'pxs' (with a baked 1px drop shadow).
import Phaser from 'phaser';
import { addTex, makeCanvas, px, type Ctx } from './draw';
import { P } from './palette';

// Each glyph: up to 8 rows of 5 pixels, rows separated by spaces. 'x' = on.
const G: Record<string, string> = {
  ' ': '',
  '!': '..x.. ..x.. ..x.. ..x.. ..x.. ..... ..x..',
  '"': '.x.x. .x.x.',
  '#': '.x.x. .x.x. xxxxx .x.x. xxxxx .x.x. .x.x.',
  '$': '..x.. .xxxx x.x.. .xxx. ..x.x xxxx. ..x..',
  '%': 'xx... xx..x ...x. ..x.. .x... x..xx ...xx',
  '&': '.xx.. x..x. x.x.. .x... x.x.x x..x. .xx.x',
  "'": '..x.. ..x..',
  '(': '...x. ..x.. .x... .x... .x... ..x.. ...x.',
  ')': '.x... ..x.. ...x. ...x. ...x. ..x.. .x...',
  '*': '..... ..x.. x.x.x .xxx. x.x.x ..x..',
  '+': '..... ..x.. ..x.. xxxxx ..x.. ..x..',
  ',': '..... ..... ..... ..... ..... .xx.. ..x.. .x...',
  '-': '..... ..... ..... xxxxx',
  '.': '..... ..... ..... ..... ..... .xx.. .xx..',
  '/': '....x ....x ...x. ..x.. .x... x.... x....',
  '0': '.xxx. x...x x..xx x.x.x xx..x x...x .xxx.',
  '1': '..x.. .xx.. ..x.. ..x.. ..x.. ..x.. .xxx.',
  '2': '.xxx. x...x ....x ...x. ..x.. .x... xxxxx',
  '3': 'xxxxx ...x. ..x.. ...x. ....x x...x .xxx.',
  '4': '...x. ..xx. .x.x. x..x. xxxxx ...x. ...x.',
  '5': 'xxxxx x.... xxxx. ....x ....x x...x .xxx.',
  '6': '..xx. .x... x.... xxxx. x...x x...x .xxx.',
  '7': 'xxxxx ....x ...x. ..x.. .x... .x... .x...',
  '8': '.xxx. x...x x...x .xxx. x...x x...x .xxx.',
  '9': '.xxx. x...x x...x .xxxx ....x ...x. .xx..',
  ':': '..... .xx.. .xx.. ..... .xx.. .xx..',
  ';': '..... .xx.. .xx.. ..... .xx.. ..x.. .x...',
  '<': '...x. ..x.. .x... x.... .x... ..x.. ...x.',
  '=': '..... ..... xxxxx ..... xxxxx',
  '>': '.x... ..x.. ...x. ....x ...x. ..x.. .x...',
  '?': '.xxx. x...x ....x ...x. ..x.. ..... ..x..',
  '@': '.xxx. x...x ....x .xx.x x.x.x x.x.x .xxx.',
  A: '.xxx. x...x x...x x...x xxxxx x...x x...x',
  B: 'xxxx. x...x x...x xxxx. x...x x...x xxxx.',
  C: '.xxx. x...x x.... x.... x.... x...x .xxx.',
  D: 'xxx.. x..x. x...x x...x x...x x..x. xxx..',
  E: 'xxxxx x.... x.... xxxx. x.... x.... xxxxx',
  F: 'xxxxx x.... x.... xxxx. x.... x.... x....',
  G: '.xxx. x...x x.... x.xxx x...x x...x .xxxx',
  H: 'x...x x...x x...x xxxxx x...x x...x x...x',
  I: '.xxx. ..x.. ..x.. ..x.. ..x.. ..x.. .xxx.',
  J: '..xxx ...x. ...x. ...x. ...x. x..x. .xx..',
  K: 'x...x x..x. x.x.. xx... x.x.. x..x. x...x',
  L: 'x.... x.... x.... x.... x.... x.... xxxxx',
  M: 'x...x xx.xx x.x.x x.x.x x...x x...x x...x',
  N: 'x...x x...x xx..x x.x.x x..xx x...x x...x',
  O: '.xxx. x...x x...x x...x x...x x...x .xxx.',
  P: 'xxxx. x...x x...x xxxx. x.... x.... x....',
  Q: '.xxx. x...x x...x x...x x.x.x x..x. .xx.x',
  R: 'xxxx. x...x x...x xxxx. x.x.. x..x. x...x',
  S: '.xxxx x.... x.... .xxx. ....x ....x xxxx.',
  T: 'xxxxx ..x.. ..x.. ..x.. ..x.. ..x.. ..x..',
  U: 'x...x x...x x...x x...x x...x x...x .xxx.',
  V: 'x...x x...x x...x x...x x...x .x.x. ..x..',
  W: 'x...x x...x x...x x.x.x x.x.x x.x.x .x.x.',
  X: 'x...x x...x .x.x. ..x.. .x.x. x...x x...x',
  Y: 'x...x x...x .x.x. ..x.. ..x.. ..x.. ..x..',
  Z: 'xxxxx ....x ...x. ..x.. .x... x.... xxxxx',
  '[': '.xxx. .x... .x... .x... .x... .x... .xxx.',
  '\\': 'x.... x.... .x... ..x.. ...x. ....x ....x',
  ']': '.xxx. ...x. ...x. ...x. ...x. ...x. .xxx.',
  '^': '..x.. .x.x. x...x',
  _: '..... ..... ..... ..... ..... ..... ..... xxxxx',
  '`': '.x... ..x..',
  a: '..... ..... .xxx. ....x .xxxx x...x .xxxx',
  b: 'x.... x.... x.xx. xx..x x...x x...x xxxx.',
  c: '..... ..... .xxx. x.... x.... x...x .xxx.',
  d: '....x ....x .xx.x x..xx x...x x...x .xxxx',
  e: '..... ..... .xxx. x...x xxxxx x.... .xxx.',
  f: '..xx. .x..x .x... xxx.. .x... .x... .x...',
  g: '..... ..... .xxxx x...x x...x .xxxx ....x .xxx.',
  h: 'x.... x.... x.xx. xx..x x...x x...x x...x',
  i: '..x.. ..... .xx.. ..x.. ..x.. ..x.. .xxx.',
  j: '...x. ..... ..xx. ...x. ...x. ...x. x..x. .xx..',
  k: 'x.... x.... x..x. x.x.. xx... x.x.. x..x.',
  l: '.xx.. ..x.. ..x.. ..x.. ..x.. ..x.. .xxx.',
  m: '..... ..... xx.x. x.x.x x.x.x x...x x...x',
  n: '..... ..... x.xx. xx..x x...x x...x x...x',
  o: '..... ..... .xxx. x...x x...x x...x .xxx.',
  p: '..... ..... xxxx. x...x x...x xxxx. x.... x....',
  q: '..... ..... .xx.x x..xx x...x .xxxx ....x ....x',
  r: '..... ..... x.xx. xx..x x.... x.... x....',
  s: '..... ..... .xxx. x.... .xxx. ....x xxxx.',
  t: '.x... .x... xxx.. .x... .x... .x..x ..xx.',
  u: '..... ..... x...x x...x x...x x..xx .xx.x',
  v: '..... ..... x...x x...x x...x .x.x. ..x..',
  w: '..... ..... x...x x...x x.x.x x.x.x .x.x.',
  x: '..... ..... x...x .x.x. ..x.. .x.x. x...x',
  y: '..... ..... x...x x...x x...x .xxxx ....x .xxx.',
  z: '..... ..... xxxxx ...x. ..x.. .x... xxxxx',
  '{': '...x. ..x.. ..x.. .x... ..x.. ..x.. ...x.',
  '|': '..x.. ..x.. ..x.. ..x.. ..x.. ..x.. ..x..',
  '}': '.x... ..x.. ..x.. ...x. ..x.. ..x.. .x...',
  '~': '..... ..... .x... x.x.x ...x.',
  '♥': '..... .x.x. xxxxx xxxxx .xxx. ..x..',
  '★': '..x.. ..x.. xxxxx .xxx. .x.x. x...x',
  '⚠': '..x.. .x.x. .x.x. x.x.x x.x.x x...x xxxxx',
  '•': '..... ..... .xxx. .xxx. .xxx.',
  '→': '..... ..x.. ...x. xxxxx ...x. ..x..',
  '←': '..... ..x.. .x... xxxxx .x... ..x..',
  '↑': '..x.. .xxx. x.x.x ..x.. ..x.. ..x..',
  '↓': '..x.. ..x.. ..x.. x.x.x .xxx. ..x..',
};

export const CHARS = Object.keys(G).join('');
const CW = 6;
const CH = 9;
const PER_ROW = 16;

function glyphRows(ch: string): string[] {
  return (G[ch] ?? '').split(' ').filter((r) => r.length > 0);
}

function drawGlyph(ctx: Ctx, ch: string, x: number, y: number, col: string, scale = 1): void {
  glyphRows(ch).forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === 'x') {
        ctx.fillStyle = col;
        ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
      }
    }
  });
}

/** Draw text directly onto a canvas (used by generated signs and the logo). */
export function drawText(ctx: Ctx, str: string, x: number, y: number, col: string, scale = 1, spacing = 1): void {
  let cx = x;
  for (const ch of str) {
    drawGlyph(ctx, ch, cx, y, col, scale);
    cx += (5 + spacing) * scale;
  }
}

export function canvasTextWidth(str: string, scale = 1, spacing = 1): number {
  return [...str].length * (5 + spacing) * scale - spacing * scale;
}

/** Returns the glyph's rows so the logo generator can do fancy per-pixel shading. */
export function glyph(ch: string): string[] {
  return glyphRows(ch);
}

export function registerFonts(scene: Phaser.Scene): void {
  const chars = [...CHARS];
  const rows = Math.ceil(chars.length / PER_ROW);
  for (const shadow of [false, true]) {
    const { c, ctx } = makeCanvas(PER_ROW * CW, rows * CH);
    chars.forEach((ch, i) => {
      const x = (i % PER_ROW) * CW;
      const y = Math.floor(i / PER_ROW) * CH;
      if (shadow) {
        glyphRows(ch).forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'x') px(ctx, x + rx + 1, y + ry + 1, P.ink);
        });
      }
      drawGlyph(ctx, ch, x, y, '#ffffff');
    });
    const key = shadow ? 'font_pxs' : 'font_px';
    addTex(scene, key, c);
    const config = {
      image: key,
      width: CW,
      height: CH,
      chars: CHARS,
      charsPerRow: PER_ROW,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 1,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Phaser.GameObjects.RetroFont.Parse(scene, config as any);
    scene.cache.bitmapFont.add(shadow ? 'pxs' : 'px', data);
  }
}

export const FONT_H = CH;
export const FONT_W = CW;

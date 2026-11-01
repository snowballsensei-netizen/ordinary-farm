// Reusable pixel UI: text, wood/parchment panels, buttons, slots, sliders.
import Phaser from 'phaser';
import { addTex, makeCanvas, rect } from '../art/draw';
import { P } from '../art/palette';
import { audio } from '../audio/AudioManager';

export const COL = {
  text: 0xfff8e7,
  dark: 0x2b1d1a,
  brown: 0x4a2f23,
  yellow: 0xf2c94c,
  gold: 0xffe58a,
  red: 0xff6a5a,
  green: 0x8fd458,
  blue: 0x9fd4f0,
  gray: 0xb8b8c4,
};

export interface TextOpts {
  scale?: number;
  color?: number;
  shadow?: boolean;
  origin?: [number, number];
  maxWidth?: number;
  center?: boolean;
  depth?: number;
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): Phaser.GameObjects.BitmapText {
  // RetroFont's base size is the glyph cell width (6px), so multiples of 6 keep pixels 1:1.
  const t = scene.add.bitmapText(x, y, o.shadow === false ? 'px' : 'pxs', s, 6 * (o.scale ?? 1));
  t.setTint(o.color ?? COL.text);
  if (o.origin) t.setOrigin(o.origin[0], o.origin[1]);
  if (o.maxWidth) t.setMaxWidth(o.maxWidth);
  if (o.center) t.setCenterAlign();
  if (o.depth !== undefined) t.setDepth(o.depth);
  return t;
}

export type PanelStyle = 'wood' | 'paper' | 'dark' | 'slot' | 'slot_sel';

/** Panels are drawn per size and cached as textures. */
export function panelKey(scene: Phaser.Scene, w: number, h: number, style: PanelStyle): string {
  const key = `panel_${style}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const { c, ctx } = makeCanvas(w, h);
  if (style === 'slot' || style === 'slot_sel') {
    rect(ctx, 0, 0, w, h, P.ink);
    rect(ctx, 1, 1, w - 2, h - 2, style === 'slot_sel' ? P.yellow : '#8a5a36');
    rect(ctx, 2, 2, w - 4, h - 4, style === 'slot_sel' ? '#f8e4b0' : '#e8c890');
    rect(ctx, 2, 2, w - 4, 1, style === 'slot_sel' ? '#d8b060' : '#c8a070');
  } else {
    const inner = style === 'paper' ? P.cream : style === 'dark' ? '#5a3a28' : '#e8c890';
    rect(ctx, 1, 0, w - 2, h, P.ink);
    rect(ctx, 0, 1, w, h - 2, P.ink);
    rect(ctx, 1, 1, w - 2, h - 2, P.woodLight);
    rect(ctx, 1, 1, w - 2, 1, P.woodPale);
    rect(ctx, 1, h - 3, w - 2, 2, P.brown);
    rect(ctx, 3, 3, w - 6, h - 7, P.wood);
    rect(ctx, 4, 4, w - 8, h - 9, inner);
    rect(ctx, 4, 4, w - 8, 1, style === 'dark' ? '#3a2418' : '#c8a070');
    // corner rivets
    for (const [x, y] of [[2, 2], [w - 3, 2], [2, h - 4], [w - 3, h - 4]]) rect(ctx, x, y, 1, 1, P.yellow);
  }
  addTex(scene, key, c);
  return key;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, style: PanelStyle = 'wood'): Phaser.GameObjects.Image {
  return scene.add.image(x, y, panelKey(scene, Math.round(w), Math.round(h), style)).setOrigin(0, 0);
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.BitmapText;
  private enabled = true;
  private base: number;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    private onClick: () => void,
    style: PanelStyle = 'wood',
  ) {
    super(scene, x, y);
    this.bg = scene.add.image(0, 0, panelKey(scene, w, h, style)).setOrigin(0, 0);
    this.base = style === 'dark' ? COL.text : COL.brown;
    this.label = txt(scene, w / 2, h / 2 - 1, text, { origin: [0.5, 0.5], color: this.base, shadow: style === 'dark' });
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => {
      if (!this.enabled) return;
      this.bg.setTint(0xfff0c0);
      this.label.setTint(0x8a3428);
      audio.play('tick');
    });
    this.bg.on('pointerout', () => {
      this.bg.clearTint();
      this.label.setTint(this.enabled ? this.base : 0x8a7a6a);
    });
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      audio.play('click');
      this.onClick();
    });
    scene.add.existing(this);
  }
  setLabel(s: string): this {
    this.label.setText(s);
    return this;
  }
  setEnabled(on: boolean): this {
    this.enabled = on;
    this.label.setTint(on ? this.base : 0x8a7a6a);
    this.bg.setAlpha(on ? 1 : 0.7);
    return this;
  }
}

export class Slider extends Phaser.GameObjects.Container {
  private knob: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  constructor(scene: Phaser.Scene, x: number, y: number, private trackW: number, value: number, private onChange: (v: number) => void) {
    super(scene, x, y);
    const track = scene.add.rectangle(0, 0, trackW, 6, 0x4a2f23).setOrigin(0, 0.5).setStrokeStyle(1, 0x2b1d1a);
    this.fill = scene.add.rectangle(1, 0, (trackW - 2) * value, 4, 0xf2c94c).setOrigin(0, 0.5);
    this.knob = scene.add.rectangle(trackW * value, 0, 6, 12, 0xe8c890).setStrokeStyle(1, 0x2b1d1a);
    this.add([track, this.fill, this.knob]);
    track.setInteractive({ useHandCursor: true });
    const set = (p: Phaser.Input.Pointer) => {
      const local = Phaser.Math.Clamp((p.x - this.x) / this.trackW, 0, 1);
      this.setValue(local);
      this.onChange(local);
    };
    track.on('pointerdown', set);
    track.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && set(p));
    scene.add.existing(this);
  }
  setValue(v: number): void {
    this.knob.x = this.trackW * v;
    this.fill.width = Math.max(0, (this.trackW - 2) * v);
  }
}

/** Draws an item icon (with quality star and count) into a container. */
export function itemIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: string,
  qty?: number,
  star?: boolean,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, `icon_${id}`).setOrigin(0, 0));
  if (star) c.add(scene.add.image(-1, 10, 'star').setOrigin(0, 0));
  if (qty !== undefined && qty > 1) c.add(txt(scene, 17, 9, String(qty), { origin: [1, 0], scale: 1 }));
  return c;
}

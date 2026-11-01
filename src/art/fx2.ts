// Sprites for the second wave of chaos events (raccoons, locusts, floods,
// fire, UFOs, snails...). All keys are prefixed fx2_.
import Phaser from 'phaser';
import { addFrames, addTex, ellipse, line, makeCanvas, outline, px, rect, tex, type Ctx } from './draw';
import { P } from './palette';

/** Draw `n` frames side by side, outline them, register frames and an anim. */
function strip(
  scene: Phaser.Scene, key: string, fw: number, fh: number, n: number,
  draw: (c: Ctx, ox: number, f: number) => void, rate = 8, outlineCol: string | null = P.ink,
): void {
  const { c, ctx } = makeCanvas(fw * n, fh);
  for (let f = 0; f < n; f++) {
    draw(ctx, f * fw, f);
    if (outlineCol) outline(ctx, f * fw, 0, fw, fh, outlineCol);
  }
  addFrames(addTex(scene, key, c), fw, fh, n, n);
  const anim = `${key}_anim`;
  if (scene.anims.exists(anim)) scene.anims.remove(anim);
  scene.anims.create({ key: anim, frames: [...Array(n).keys()].map((i) => ({ key, frame: i })), frameRate: rate, repeat: -1 });
}

export function genFx2(scene: Phaser.Scene): void {
  // Raccoon: grey body, striped tail, bandit mask.
  strip(scene, 'fx2_raccoon', 18, 12, 2, (c, o, f) => {
    ellipse(c, o + 8, 7, 5, 3, '#8a8a94');
    ellipse(c, o + 13, 5, 3, 3, '#9a9aa4');
    rect(c, o + 11, 4, 5, 2, '#2a2a34');
    px(c, o + 12, 4, '#ffffff');
    px(c, o + 15, 4, '#ffffff');
    px(c, o + 16, 6, P.black);
    rect(c, o + 12, 1, 1, 2, '#6a6a74');
    rect(c, o + 14, 1, 1, 2, '#6a6a74');
    for (let i = 0; i < 4; i++) rect(c, o + i, 5 + (i % 2), 1, 2, i % 2 ? '#3a3a44' : '#b0b0b8');
    const k = f ? 1 : 0;
    rect(c, o + 5 + k, 9, 1, 2, '#3a3a44');
    rect(c, o + 10 - k, 9, 1, 2, '#3a3a44');
  });
  // Locust cloud: a swirl of little green dots.
  strip(scene, 'fx2_locust', 40, 28, 3, (c, o, f) => {
    for (let i = 0; i < 70; i++) {
      const a = i * 2.4 + f * 0.9;
      const r = (i % 14) + 1;
      const x = o + 20 + Math.round(Math.cos(a) * r * 1.3);
      const y = 14 + Math.round(Math.sin(a) * r * 0.8);
      px(c, x, y, i % 3 ? '#6a8a2a' : '#a8b840');
      if (i % 4 === 0) px(c, x + 1, y, '#3e5a1a');
    }
  }, 10, null);
  // Flood water overlay.
  strip(scene, 'fx2_flood', 16, 16, 2, (c, o, f) => {
    rect(c, o, 0, 16, 16, P.water);
    for (let i = 0; i < 5; i++) rect(c, o + ((i * 5 + f * 3) % 13), (i * 3 + 2) % 15, 3, 1, P.waterLight);
    px(c, o + ((7 + f * 5) % 15), 11, P.waterFoam);
  }, 3, null);
  // Earthquake crack.
  tex(scene, 'fx2_crack', 16, 16, (c) => {
    line(c, 2, 3, 7, 8, '#3a2a22');
    line(c, 7, 8, 5, 13, '#3a2a22');
    line(c, 7, 8, 13, 10, '#3a2a22');
    line(c, 13, 10, 14, 4, '#3a2a22');
    px(c, 8, 8, '#1a1210');
  }, null);
  // Fire.
  strip(scene, 'fx2_fire', 12, 16, 3, (c, o, f) => {
    const s = [0, 1, -1][f];
    ellipse(c, o + 6, 11, 5, 4, P.redDark);
    ellipse(c, o + 6 + s, 8, 4, 5, P.red);
    ellipse(c, o + 6 - s, 9, 2, 4, P.orange);
    ellipse(c, o + 6, 11, 2, 2, P.yellow);
    px(c, o + 6 + s, 2, P.orange);
  }, 10, null);
  tex(scene, 'fx2_ash', 3, 3, (c) => rect(c, 0, 0, 2, 2, '#4a4448'), null);
  tex(scene, 'fx2_ember', 2, 2, (c) => rect(c, 0, 0, 2, 2, P.orange), null);
  tex(scene, 'fx2_scorch', 16, 16, (c) => {
    ellipse(c, 8, 8, 7, 6, 'rgba(40,30,30,0.55)');
    ellipse(c, 7, 9, 3, 2, 'rgba(20,15,15,0.6)');
  }, null);
  // UFO and tractor beam.
  strip(scene, 'fx2_ufo', 32, 16, 2, (c, o, f) => {
    ellipse(c, o + 16, 5, 6, 4, P.glass);
    px(c, o + 14, 3, '#ffffff');
    ellipse(c, o + 16, 9, 14, 3, P.grayLight);
    rect(c, o + 3, 9, 26, 1, P.grayDark);
    for (let i = 0; i < 5; i++) px(c, o + 6 + i * 5, 10, (i + f) % 2 ? P.yellow : '#7aff8a');
  }, 4);
  tex(scene, 'fx2_beam', 20, 48, (c) => {
    for (let y = 0; y < 48; y++) {
      const w = 3 + Math.round((y / 48) * 7);
      rect(c, 10 - w, y, w * 2, 1, `rgba(170,255,180,${(0.25 + (y % 6 === 0 ? 0.2 : 0)).toFixed(2)})`);
    }
  }, null);
  // Giant snail.
  strip(scene, 'fx2_snail', 32, 24, 2, (c, o, f) => {
    rect(c, o + 2, 18, 28, 4, '#c8b8a0');
    ellipse(c, o + 25 + f, 15, 4, 5, '#d8c8b0');
    line(c, o + 25 + f, 10, o + 23 + f, 4, '#a89880');
    line(c, o + 27 + f, 10, o + 29 + f, 4, '#a89880');
    px(c, o + 23 + f, 3, P.black);
    px(c, o + 29 + f, 3, P.black);
    ellipse(c, o + 13, 11, 10, 9, P.brown);
    ellipse(c, o + 13, 11, 7, 6, P.wood);
    ellipse(c, o + 13, 11, 4, 3, P.woodLight);
    ellipse(c, o + 13, 11, 1, 1, P.brown);
  }, 3);
  tex(scene, 'fx2_slime', 16, 16, (c) => {
    ellipse(c, 8, 9, 7, 3, 'rgba(200,230,220,0.45)');
  }, null);
  // Living pumpkin.
  strip(scene, 'fx2_pumpkin', 14, 16, 2, (c, o, f) => {
    ellipse(c, o + 7, 8, 6, 5, P.orange);
    rect(c, o + 4, 4, 1, 9, '#d06a3a');
    rect(c, o + 9, 4, 1, 9, '#d06a3a');
    rect(c, o + 6, 1, 2, 3, P.leafDark);
    px(c, o + 5, 7, P.yellow);
    px(c, o + 9, 7, P.yellow);
    rect(c, o + 5, 10, 5, 1, P.yellow);
    rect(c, o + 4 + f * 4, 13, 2, 2, P.leafDark);
    rect(c, o + 8 - f * 4, 13, 2, 2, P.leafDark);
  }, 6);
  // Fog puff (big soft blob).
  {
    const { c, ctx } = makeCanvas(64, 48);
    for (let r = 22; r > 0; r -= 2) ellipse(ctx, 32, 24, r * 1.4, r, `rgba(190,196,210,${(0.06).toFixed(2)})`);
    addTex(scene, 'fx2_fog', c);
  }
  // Heat shimmer particle.
  tex(scene, 'fx2_heat', 6, 6, (c) => {
    px(c, 1, 4, P.sunset);
    px(c, 2, 3, P.sunset);
    px(c, 3, 2, P.yellow);
    px(c, 4, 1, P.yellow);
  }, null);
  // Rabbit.
  strip(scene, 'fx2_rabbit', 12, 12, 2, (c, o, f) => {
    const h = f ? -1 : 0;
    ellipse(c, o + 5, 8 + h, 4, 3, '#c8a888');
    ellipse(c, o + 9, 6 + h, 2, 2, '#d8b898');
    rect(c, o + 8, 1 + h, 1, 4, '#d8b898');
    rect(c, o + 10, 1 + h, 1, 4, '#d8b898');
    px(c, o + 10, 6 + h, P.black);
    px(c, o + 1, 7 + h, P.white);
  }, 6);
  // Goose.
  strip(scene, 'fx2_goose', 16, 16, 2, (c, o, f) => {
    ellipse(c, o + 7, 11, 6, 3, P.white);
    rect(c, o + 11, 3, 2, 8, P.white);
    ellipse(c, o + 12, 3, 2, 2, P.white);
    rect(c, o + 14, 3, 2, 1, P.orange);
    px(c, o + 12, 2, P.black);
    rect(c, o + 6 + f, 14, 1, 2, P.orange);
    rect(c, o + 9 - f, 14, 1, 2, P.orange);
    rect(c, o + 3, 10, 4, 1, P.grayLight);
  }, 6);
  // Sinkhole.
  tex(scene, 'fx2_hole', 16, 16, (c) => {
    ellipse(c, 8, 8, 7, 6, '#5a4434');
    ellipse(c, 8, 9, 5, 4, '#2a1e18');
    ellipse(c, 8, 10, 3, 2, '#0e0a08');
  }, null);
  // Snowdrift (blizzard).
  tex(scene, 'fx2_snow', 16, 16, (c) => {
    ellipse(c, 8, 10, 7, 4, '#f2f6ff');
    ellipse(c, 6, 8, 4, 3, '#ffffff');
    px(c, 10, 9, '#d0d8ea');
  }, '#b8c4dc');
  tex(scene, 'fx2_flake', 3, 3, (c) => {
    px(c, 1, 0, '#ffffff');
    rect(c, 0, 1, 3, 1, '#ffffff');
    px(c, 1, 2, '#ffffff');
  }, null);
}

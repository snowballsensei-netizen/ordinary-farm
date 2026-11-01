// Beekeeping art: hives in four moods, bees, honey drip, angry sparks, smoke,
// wild flowers and the bee item icons. Every key is prefixed `bee_` (icons
// overwrite the generic `icon_<id>` placeholders made by genIcons).
import Phaser from 'phaser';
import { addFrames, addTex, ellipse, line, makeCanvas, px, rect, shade, tex, type Ctx } from './draw';
import { P } from './palette';

/** Hive body colours per state: calm, agitated, angry, empty (no queen). */
export const HIVE_STATES = ['calm', 'agitated', 'angry', 'empty'] as const;
const BODY: Record<string, [string, string]> = {
  calm: ['#e8c070', '#c09040'],
  agitated: ['#e8a050', '#b87030'],
  angry: ['#d86848', '#a03828'],
  empty: ['#a8a090', '#7a7468'],
};

/** Big apiary hive: gabled roof over three stacked wooden supers on a stand (24x32). */
function bigHive(c: Ctx, state: string): void {
  const [base, dark] = BODY[state];
  ellipse(c, 12, 30, 10, 1.5, P.shadow);
  rect(c, 4, 26, 2, 4, P.wood);                     // legs
  rect(c, 18, 26, 2, 4, P.wood);
  rect(c, 2, 25, 20, 2, P.woodLight);               // stand
  rect(c, 2, 26, 20, 1, P.wood);
  for (let i = 0; i < 3; i++) {                     // stacked boxes
    const y = 7 + i * 6;
    rect(c, 3, y, 18, 6, base);
    rect(c, 3, y, 18, 1, shade(base, 1.12));
    rect(c, 3, y + 5, 18, 1, dark);
    for (const x of [7, 12, 16]) rect(c, x, y + 1, 1, 4, shade(base, 0.92));
    rect(c, 10, y + 2, 4, 1, dark);                 // hand-hold
  }
  rect(c, 8, 23, 8, 2, P.dark);                     // entrance
  rect(c, 7, 25, 10, 1, shade(base, 0.8));          // landing board
  // gabled roof with overhang
  rect(c, 9, 1, 6, 1, P.roof);
  rect(c, 7, 2, 10, 1, P.roof);
  rect(c, 5, 3, 14, 1, P.roof);
  rect(c, 3, 4, 18, 1, P.roof);
  rect(c, 1, 5, 22, 2, P.roofDark);
  rect(c, 10, 2, 4, 2, P.roofDark);                 // vent
  if (state === 'empty') line(c, 4, 9, 19, 23, '#5a5448');
}

function hive(c: Ctx, state: string): void {
  const [base, dark] = BODY[state];
  rect(c, 2, 17, 12, 2, P.shadow);                 // stand shadow
  rect(c, 3, 15, 2, 3, P.wood);                    // legs
  rect(c, 11, 15, 2, 3, P.wood);
  rect(c, 1, 2, 14, 3, P.roof);                    // lid
  rect(c, 1, 2, 14, 1, P.roofDark);
  for (let i = 0; i < 3; i++) {                    // stacked boxes
    rect(c, 2, 5 + i * 3, 12, 3, base);
    rect(c, 2, 7 + i * 3, 12, 1, dark);
  }
  rect(c, 6, 13, 4, 2, P.dark);                    // entrance
  if (state === 'empty') line(c, 3, 6, 12, 12, '#5a5448');
}

export function genBees(scene: Phaser.Scene): void {
  for (const s of HIVE_STATES) tex(scene, `bee_hive_${s}`, 24, 32, (c) => bigHive(c, s));

  // pulsing attention marker above a hive
  tex(scene, 'bee_alert', 7, 13, (c) => {
    rect(c, 1, 0, 5, 13, '#fff4c0');
    rect(c, 2, 1, 3, 7, '#e8402a');
    rect(c, 2, 9, 3, 3, '#e8402a');
  });
  // apiary sign post
  tex(scene, 'bee_sign', 30, 24, (c) => {
    rect(c, 13, 12, 3, 11, P.wood);
    rect(c, 1, 1, 28, 12, P.woodLight);
    rect(c, 1, 11, 28, 2, P.wood);
    rect(c, 3, 4, 24, 1, P.wood);
    rect(c, 3, 7, 18, 1, P.wood);
    ellipse(c, 24, 8, 2, 1.5, P.yellow);           // a little bee
    px(c, 24, 8, P.ink);
    px(c, 23, 6, '#e8f4ff');
  });

  // honey drip (2 frames), placed at the hive entrance
  {
    const { c, ctx } = makeCanvas(8, 12);
    rect(ctx, 2, 0, 3, 2, P.gold);
    rect(ctx, 3, 2, 1, 2, P.gold);
    rect(ctx, 6, 0, 2, 1, P.gold);
    rect(ctx, 2, 6, 3, 2, P.gold);
    rect(ctx, 3, 8, 1, 3, P.gold);
    px(ctx, 3, 11, P.yellowLight);
    px(ctx, 6, 7, P.yellow);
    addFrames(addTex(scene, 'bee_drip', c), 4, 12, 2, 2);
  }

  // a single bee, 2 wing frames
  {
    const { c, ctx } = makeCanvas(10, 5);
    for (let f = 0; f < 2; f++) {
      const o = f * 5;
      rect(ctx, o + 1, 2, 3, 2, P.yellow);
      px(ctx, o + 2, 2, P.ink);
      px(ctx, o + 4, 3, P.ink);
      if (f === 0) rect(ctx, o + 1, 0, 2, 2, '#e8f4ff');
      else rect(ctx, o + 2, 1, 2, 1, '#c8dcf0');
    }
    addFrames(addTex(scene, 'bee_bee', c), 5, 5, 2, 2);
    if (scene.anims.exists('bee_buzz')) scene.anims.remove('bee_buzz');
    scene.anims.create({ key: 'bee_buzz', frames: [0, 1].map((f) => ({ key: 'bee_bee', frame: f })), frameRate: 18, repeat: -1 });
  }

  tex(scene, 'bee_spark', 3, 3, (c) => {
    px(c, 1, 0, '#ff4030');
    rect(c, 0, 1, 3, 1, '#ff4030');
    px(c, 1, 2, '#ff8060');
  }, null);
  tex(scene, 'bee_smoke', 6, 6, (c) => ellipse(c, 3, 3, 2.5, 2.5, '#d8d8d0'), null);
  tex(scene, 'bee_slot', 16, 16, (c) => {
    rect(c, 3, 11, 10, 2, '#9a8058');
    rect(c, 4, 9, 2, 2, P.wood);
    rect(c, 10, 9, 2, 2, P.wood);
  }, null);

  // wild flowers (3 variants)
  const petals = ['#f080b0', '#f0e060', '#a080f0'];
  petals.forEach((col, i) => {
    tex(scene, `bee_flower_${i}`, 16, 16, (c) => {
      for (const [x, y] of [[4, 6], [10, 4], [7, 11], [12, 12]]) {
        line(c, x, y + 1, x, y + 3, P.leafDark);
        px(c, x - 1, y, col);
        px(c, x + 1, y, col);
        px(c, x, y - 1, col);
        px(c, x, y + 1, col);
        px(c, x, y, P.yellowLight);
      }
    }, null);
  });

  // item icons
  const icon = (id: string, draw: (c: Ctx) => void) => tex(scene, `icon_${id}`, 16, 16, draw);
  icon('honey', (c) => {
    rect(c, 4, 5, 8, 9, P.gold);
    rect(c, 5, 6, 2, 5, P.yellowLight);
    rect(c, 4, 3, 8, 2, P.wood);
    rect(c, 3, 2, 10, 1, P.cream);
  });
  icon('beeswax', (c) => {
    rect(c, 3, 6, 10, 6, '#f0d878');
    for (const [x, y] of [[4, 7], [8, 7], [6, 9], [10, 9]]) rect(c, x, y, 2, 1, '#c8a848');
  });
  icon('sugar_water', (c) => {
    rect(c, 5, 3, 6, 2, P.grayLight);
    rect(c, 4, 5, 8, 9, '#cfe8f4');
    rect(c, 4, 9, 8, 5, '#f4f0e0');
    px(c, 6, 7, P.white);
  });
  icon('smoker', (c) => {
    rect(c, 5, 6, 6, 8, P.gray);
    rect(c, 5, 6, 6, 1, P.grayLight);
    rect(c, 6, 3, 3, 3, P.grayDark);
    rect(c, 11, 9, 3, 4, P.brown);
    px(c, 5, 1, '#d8d8d0');
    px(c, 7, 0, '#d8d8d0');
  });
  icon('beehive', (c) => hive(c, 'calm'));
  icon('queen_bee', (c) => {
    ellipse(c, 8, 9, 4, 3, P.yellow);
    rect(c, 6, 8, 1, 3, P.ink);
    rect(c, 9, 8, 1, 3, P.ink);
    rect(c, 5, 4, 6, 2, P.gold);
    px(c, 5, 3, P.gold);
    px(c, 8, 3, P.gold);
    px(c, 10, 3, P.gold);
  });
}

// 16x16 inventory icons for every item, plus small UI icons.
import Phaser from 'phaser';
import { CROPS, type CropDef } from '../config/crops';
import { ITEMS } from '../config/items';
import { ellipse, line, px, rect, shade, tex, type Ctx } from './draw';
import { P } from './palette';

function handle(ctx: Ctx): void {
  line(ctx, 3, 14, 11, 4, P.brown);
  line(ctx, 4, 14, 12, 4, P.wood);
}

const TOOL: Record<string, (ctx: Ctx) => void> = {
  hoe: (c) => {
    handle(c);
    rect(c, 10, 2, 5, 3, P.grayLight);
    rect(c, 12, 4, 3, 3, P.gray);
  },
  can: (c) => {
    rect(c, 3, 6, 9, 8, P.blue);
    rect(c, 3, 6, 9, 2, P.waterLight);
    line(c, 11, 8, 14, 5, P.blueDark);
    rect(c, 13, 4, 2, 2, P.blueDark);
    line(c, 4, 6, 7, 3, P.blueDark);
    line(c, 7, 3, 10, 6, P.blueDark);
  },
  scythe: (c) => {
    line(c, 4, 15, 9, 3, P.brown);
    line(c, 9, 3, 2, 3, P.grayLight);
    line(c, 8, 4, 2, 5, P.gray);
    px(c, 1, 4, P.grayLight);
  },
  axe: (c) => {
    handle(c);
    rect(c, 9, 1, 4, 6, P.grayLight);
    rect(c, 12, 2, 2, 4, P.white);
  },
  pickaxe: (c) => {
    handle(c);
    line(c, 6, 2, 13, 2, P.grayLight);
    line(c, 13, 2, 15, 6, P.gray);
    line(c, 6, 2, 4, 5, P.gray);
  },
  hammer: (c) => {
    handle(c);
    rect(c, 8, 1, 7, 4, P.grayDark);
    rect(c, 8, 1, 7, 1, P.grayLight);
  },
  basket: (c) => {
    rect(c, 3, 8, 10, 6, P.woodLight);
    for (let x = 4; x < 13; x += 2) rect(c, x, 8, 1, 6, P.wood);
    line(c, 4, 8, 6, 3, P.brown);
    line(c, 6, 3, 10, 3, P.brown);
    line(c, 10, 3, 12, 8, P.brown);
    rect(c, 5, 6, 3, 2, P.red);
  },
};

function produce(ctx: Ctx, d: CropDef): void {
  switch (d.kind) {
    case 'root':
      ellipse(ctx, 8, 10, 4, 4, d.color);
      rect(ctx, 5, 8, 7, 1, d.color2 ?? shade(d.color, 0.8));
      px(ctx, 6, 8, '#ffffff');
      line(ctx, 8, 14, 8, 15, shade(d.color, 0.7));
      line(ctx, 8, 6, 5, 2, P.leaf);
      line(ctx, 8, 6, 11, 2, P.leafLight);
      break;
    case 'grain':
      for (const x of [5, 8, 11]) {
        line(ctx, x, 14, 8, 9, d.color2 ?? d.color);
        rect(ctx, x - 1, 2 + Math.abs(x - 8), 3, 6, d.color);
        px(ctx, x, 2 + Math.abs(x - 8), shade(d.color, 1.2));
      }
      rect(ctx, 6, 10, 5, 1, P.brown);
      break;
    case 'stalk':
      rect(ctx, 5, 3, 6, 11, d.color);
      for (let y = 4; y < 13; y += 2) rect(ctx, 6, y, 4, 1, shade(d.color, 0.85));
      line(ctx, 4, 14, 4, 6, d.color2 ?? P.leaf);
      line(ctx, 11, 14, 11, 6, d.color2 ?? P.leaf);
      break;
    case 'bush':
      ellipse(ctx, 8, 9, 5, 5, d.color);
      px(ctx, 6, 7, '#ffd0d0');
      for (const [x, y] of [[6, 10], [9, 8], [10, 11], [7, 12]]) px(ctx, x, y, d.color2 ?? P.yellow);
      rect(ctx, 6, 3, 5, 2, P.leaf);
      break;
    case 'vine':
      ellipse(ctx, 8, 10, 6, 5, d.color);
      line(ctx, 5, 6, 5, 14, d.color2 ?? shade(d.color, 0.8));
      line(ctx, 11, 6, 11, 14, d.color2 ?? shade(d.color, 0.8));
      rect(ctx, 7, 3, 2, 3, P.leafDark);
      px(ctx, 6, 7, P.yellowLight);
      break;
  }
}

function seedPacket(ctx: Ctx, d: CropDef): void {
  rect(ctx, 3, 2, 10, 13, P.cream);
  rect(ctx, 3, 2, 10, 3, d.color);
  rect(ctx, 3, 5, 10, 1, shade(P.cream, 0.8));
  ellipse(ctx, 8, 10, 3, 3, d.color);
  px(ctx, 7, 9, '#ffffff');
  line(ctx, 8, 7, 9, 6, P.leaf);
}

const OTHER: Record<string, (ctx: Ctx) => void> = {
  egg: (c) => {
    // half-widths per row, top to bottom: narrow crown, wide rounded base
    const rows = [1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 4, 4, 3];
    rows.forEach((hw, i) => rect(c, 8 - hw, 2 + i, hw * 2, 1, '#f8ecd4'));
    // soft shadow on the lower right
    rows.forEach((hw, i) => {
      if (i > 5) rect(c, 8 + hw - 2, 2 + i, 2, 1, '#e2cca8');
    });
    rect(c, 5, 13, 6, 1, '#e2cca8');
    rect(c, 6, 14, 4, 1, '#d4b890');
    // highlight on the upper left
    rect(c, 6, 5, 1, 3, '#ffffff');
    px(c, 7, 4, '#ffffff');
    px(c, 10, 9, '#efdcbc');
  },
  milk: (c) => {
    rect(c, 5, 5, 6, 10, '#ffffff');
    rect(c, 6, 2, 4, 3, '#ffffff');
    rect(c, 5, 9, 6, 3, P.blue);
    rect(c, 6, 1, 4, 1, P.red);
  },
  goat_milk: (c) => {
    rect(c, 5, 5, 6, 10, '#fffaf0');
    rect(c, 6, 2, 4, 3, '#fffaf0');
    rect(c, 5, 9, 6, 3, P.tan);
    rect(c, 6, 1, 4, 1, P.brown);
  },
  truffle: (c) => {
    ellipse(c, 8, 9, 5, 4, '#4a3428');
    px(c, 6, 8, '#6a5040');
    px(c, 10, 10, '#2a1a12');
    px(c, 8, 6, '#6a5040');
  },
  wool: (c) => {
    for (const [x, y] of [[5, 8], [10, 8], [8, 6], [7, 11], [11, 11]]) ellipse(c, x, y, 3, 3, '#f8f0e0');
    px(c, 6, 7, '#ffffff');
  },
  hay: (c) => {
    rect(c, 2, 5, 12, 8, P.yellow);
    for (let x = 3; x < 14; x += 2) line(c, x, 5, x - 1, 12, P.gold);
    rect(c, 2, 8, 12, 1, P.brown);
  },
  planks: (c) => {
    rect(c, 2, 4, 12, 3, P.woodLight);
    rect(c, 2, 8, 12, 3, P.wood);
    rect(c, 3, 12, 11, 2, P.woodLight);
    px(c, 4, 5, P.brown);
    px(c, 11, 9, P.brown);
  },
  sprinkler: (c) => {
    ellipse(c, 8, 12, 5, 2, P.grayDark);
    rect(c, 6, 5, 4, 7, P.grayLight);
    rect(c, 5, 4, 6, 2, P.gray);
    px(c, 4, 2, P.waterLight);
    px(c, 12, 2, P.waterLight);
    px(c, 8, 1, P.waterLight);
  },
  scarecrow: (c) => {
    rect(c, 7, 7, 2, 9, P.brown);
    rect(c, 2, 8, 12, 2, P.brown);
    rect(c, 5, 8, 6, 5, '#5a7ab8');
    ellipse(c, 8, 4, 3, 3, '#e8d090');
    rect(c, 4, 1, 8, 1, '#8a5a2a');
  },
  star_ore: (c) => {
    ellipse(c, 8, 9, 5, 5, '#5a3a8a');
    line(c, 5, 10, 9, 5, '#c07aff');
    line(c, 8, 12, 11, 7, '#ff9ae0');
    px(c, 6, 6, '#ffffff');
  },
};

export function genIcons(scene: Phaser.Scene): void {
  for (const it of Object.values(ITEMS)) {
    const key = `icon_${it.id}`;
    tex(scene, key, 16, 16, (ctx) => {
      if (it.tool) TOOL[it.tool](ctx);
      else if (it.cat === 'seed' && it.crop) seedPacket(ctx, CROPS[it.crop]);
      else if (it.cat === 'produce') produce(ctx, CROPS[it.id]);
      else if (OTHER[it.id]) OTHER[it.id](ctx);
      else rect(ctx, 4, 4, 8, 8, P.purple);
    });
  }

  // UI icons
  tex(scene, 'coin', 9, 9, (c) => {
    // 1px padding on every side so the outline is never clipped
    rect(c, 2, 1, 5, 7, P.yellow);
    rect(c, 1, 2, 7, 5, P.yellow);
    rect(c, 4, 2, 1, 5, P.gold);
    px(c, 2, 2, P.yellowLight);
    px(c, 3, 2, P.yellowLight);
  });
  tex(scene, 'star', 9, 9, (c) => {
    c.translate(1, 1);
    px(c, 3, 0, P.yellow);
    rect(c, 2, 1, 3, 2, P.yellow);
    rect(c, 0, 2, 7, 1, P.yellow);
    rect(c, 1, 3, 5, 1, P.yellow);
    px(c, 1, 4, P.yellow);
    px(c, 5, 4, P.yellow);
    c.setTransform(1, 0, 0, 1, 0, 0);
  });
  const weather: Record<string, (c: Ctx) => void> = {
    sun: (c) => {
      ellipse(c, 6, 6, 3, 3, P.yellow);
      for (const [x, y] of [[6, 0], [6, 11], [0, 6], [11, 6], [2, 2], [10, 2], [2, 10], [10, 10]]) px(c, x, y, P.yellow);
    },
    cloudy: (c) => {
      ellipse(c, 4, 7, 3, 2, P.grayLight);
      ellipse(c, 7, 5, 3, 3, '#e0e0e8');
      ellipse(c, 9, 7, 2, 2, P.grayLight);
    },
    rain: (c) => {
      ellipse(c, 6, 4, 4, 2, P.gray);
      for (const x of [3, 6, 9]) line(c, x, 8, x - 1, 10, P.waterLight);
    },
    snow: (c) => {
      ellipse(c, 6, 4, 4, 2, P.grayLight);
      for (const x of [3, 6, 9]) px(c, x, 9, '#ffffff');
    },
    hail: (c) => {
      ellipse(c, 6, 4, 4, 2, P.grayDark);
      for (const x of [3, 6, 9]) rect(c, x, 8, 2, 2, '#e8f4ff');
    },
    windy: (c) => {
      line(c, 1, 4, 9, 4, P.grayLight);
      line(c, 3, 7, 11, 7, P.grayLight);
      line(c, 1, 10, 7, 10, P.grayLight);
    },
    ominous: (c) => {
      ellipse(c, 6, 5, 5, 3, '#6a9a5a');
      ellipse(c, 6, 4, 3, 2, '#8aba6a');
      px(c, 6, 10, P.yellow);
      px(c, 5, 9, P.yellow);
    },
  };
  for (const [k, fn] of Object.entries(weather)) tex(scene, `w_${k}`, 14, 14, (c) => {
    c.translate(1, 1);
    fn(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
  });
}

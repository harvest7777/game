// Writes the starter 8x8 sprites to public/sprites as PNGs. It's a one-off
// seed: once the files exist, edit them in a pixel editor and don't rerun this
// unless you want to reset them.
//
//   node scripts/generate-sprites.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/sprites");

const PALETTE = {
  ".": [0, 0, 0, 0],
  P: [88, 56, 160, 255], // wizard robe and hat
  r: [60, 36, 112, 255], // hat brim
  W: [232, 232, 232, 255], // beard and hair
  s: [241, 194, 125, 255], // skin
  e: [32, 32, 32, 255], // eyes
  d: [58, 42, 26, 255], // boots
  o: [139, 94, 52, 255], // staff wood
  c: [120, 220, 255, 255], // staff gem
  y: [255, 204, 51, 255], // hat star, projectile glow
  w: [255, 248, 224, 255], // projectile core
  b: [60, 120, 255, 255], // bolt tail
  B: [120, 180, 255, 255], // bolt body
  V: [230, 245, 255, 255], // bolt head
  z: [214, 180, 90, 255], // dummy straw
  Z: [170, 140, 60, 255], // dummy straw shadow
  n: [120, 80, 40, 255], // dummy wood
  x: [200, 40, 40, 255], // dummy target red
  X: [240, 240, 240, 255], // dummy target white
  l: [90, 200, 90, 255], // slime
  L: [170, 240, 170, 255], // slime shine
  D: [50, 130, 60, 255], // slime shadow
  O: [230, 225, 210, 255], // bone
  u: [140, 90, 60, 255], // boar hide
  U: [100, 60, 40, 255], // boar shadow
  i: [245, 240, 225, 255], // boar tusk
  F: [255, 255, 255, 255], // font, pure white so it can be tinted any color
  k: [230, 60, 220, 255], // prejudice shard
  K: [255, 190, 250, 255], // prejudice core
  g: [74, 107, 58, 255], // floor
  G: [92, 127, 72, 255], // floor highlight
  q: [61, 90, 48, 255], // floor shadow
  t: [154, 154, 154, 255], // wall top
  T: [122, 122, 122, 255], // wall top mortar
  m: [106, 106, 106, 255], // wall side brick
  M: [80, 80, 80, 255], // wall side mortar
};

// The player is a wizard holding a staff. The first seven rows of each
// facing stay put; the last (feet) changes per walk frame. The staff is on
// the wizard's right hand, so it's on screen-right from the front and
// screen-left from the back.
const LEGS = {
  front: [".d...d.o", ".d.....o", ".....d.o"],
  back: ["o.d...d.", "o.d.....", "o.....d."],
  side: ["..d.d..o", ".d...d.o", "..dd...o"],
};

const BODY = {
  front: [
    "..PPP..c",
    ".PPPyP.o",
    "rrrrrrro",
    ".seses.o",
    ".WWWWW.o",
    "sPWWWPso",
    "PPPPPPPo",
  ],
  back: [
    "c..PPP..",
    "o.PPPPP.",
    "orrrrrrr",
    "o.WWWWW.",
    "o.PWWWP.",
    "osPPPPPs",
    "oPPPPPPP",
  ],
  // Faces right; the renderer mirrors it for left.
  side: [
    "..PP...c",
    ".PPPP..o",
    "rrrrrr.o",
    ".Wsse..o",
    ".WWWW..o",
    "..PPPsso",
    ".PPPPP.o",
  ],
};

// Attack frames thrust the staff forward. The staff isn't at the edge here,
// so the feet rows are drawn without it.
const ATTACK_LEGS = {
  front: [".d...d..", ".d......", ".....d.."],
  back: ["..d...d.", "..d.....", "......d."],
  side: ["..d.d...", ".d...d..", "..dd...."],
};

const ATTACK_BODY = {
  front: [
    "..PPP.c.",
    ".PPPyPo.",
    "rrrrrro.",
    ".seseso.",
    ".WWWWWs.",
    "PPWWWPP.",
    "PPPPPPP.",
  ],
  back: [
    ".c.PPP..",
    ".oPPPPP.",
    ".orrrrrr",
    ".oWWWWW.",
    ".sPWWWP.",
    "PPPPPPPP",
    ".PPPPPPP",
  ],
  // Faces right, staff thrust straight out in front.
  side: [
    "..PP....",
    ".PPPP...",
    "rrrrrr..",
    ".Wsse...",
    ".WWWW...",
    "..PPsooc",
    ".PPPPP..",
  ],
};

const SPRITES = {
  // A straw training dummy with a target on its chest.
  "enemies/dummy": [
    "..zzzz..",
    ".zZzzZz.",
    "..zzzz..",
    "nnnnnnnn",
    "..xXXx..",
    "..XxxX..",
    "..xXXx..",
    "...nn...",
  ],
  "enemies/slime": [
    "........",
    "........",
    "..llll..",
    ".lLLlll.",
    ".lelell.",
    "llllllll",
    "DllllllD",
    ".DDDDDD.",
  ],
  // A boar facing the viewer, tusks out.
  "enemies/boar": [
    "........",
    ".U....U.",
    ".uuuuuu.",
    "uueuueuu",
    "uuuUUuuu",
    "iuUddUui",
    ".uuuuuu.",
    ".UU..UU.",
  ],
  // A skeleton with its bow drawn on the right.
  "enemies/archer": [
    "..OOO.n.",
    ".OeOeOnX",
    "..OOO.nX",
    ".OOOOOOX",
    "...O..nX",
    "..OOO.n.",
    "..O.O...",
    ".OO.OO..",
  ],
  // Projectile art points right; the renderer turns it to face its path.
  "projectiles/bolt": [
    "........",
    "........",
    "..bbBB..",
    "bBBBBVV.",
    "bBBBBVV.",
    "..bbBB..",
    "........",
    "........",
  ],
  // A pinwheel, so spinning is easy to see.
  "projectiles/star": [
    "....y...",
    "...yy...",
    "...yy...",
    "yyywwyy.",
    ".yywwyyy",
    "...yy...",
    "...yy...",
    "...y....",
  ],
  // Extreme Prejudice's shard: a magenta pinwheel.
  "projectiles/prejudice": [
    "....k...",
    "...kk...",
    "...kk...",
    "kkkKKkk.",
    ".kkKKkkk",
    "...kk...",
    "...kk...",
    "...k....",
  ],
  "projectiles/orb": [
    "........",
    "........",
    "...yy...",
    "..ywwy..",
    "..ywwy..",
    "...yy...",
    "........",
    "........",
  ],
  "tiles/floor": [
    "gggggqgg",
    "gGgggggg",
    "ggggGggq",
    "gqgggggg",
    "gggggGgg",
    "ggGggggg",
    "gggqgggG",
    "Gggggggg",
  ],
  "tiles/wall-top": [
    "tttTtttt",
    "tttTtttt",
    "tttTtttt",
    "TTTTTTTT",
    "tttttttT",
    "tttttttT",
    "tttttttT",
    "TTTTTTTT",
  ],
  "tiles/wall-side": [
    "mmmMmmmm",
    "mmmMmmmm",
    "MMMMMMMM",
    "mmmmmmmM",
    "mmmmmmmM",
    "MMMMMMMM",
    "mmmMmmmm",
    "mmmMmmmm",
  ],
};

// Digits for floating text: bold 6x7 glyphs with 2-pixel strokes, one blank
// column to their left in the 8x8 canvas. White so the renderer can tint
// them.
const DIGITS = {
  0: [".FFFF.", "FF..FF", "FF..FF", "FF..FF", "FF..FF", "FF..FF", ".FFFF."],
  1: ["..FF..", ".FFF..", "..FF..", "..FF..", "..FF..", "..FF..", ".FFFF."],
  2: [".FFFF.", "FF..FF", "....FF", "...FF.", "..FF..", ".FF...", "FFFFFF"],
  3: ["FFFFF.", "....FF", "....FF", ".FFFF.", "....FF", "....FF", "FFFFF."],
  4: ["FF..FF", "FF..FF", "FF..FF", "FFFFFF", "....FF", "....FF", "....FF"],
  5: ["FFFFFF", "FF....", "FFFFF.", "....FF", "....FF", "FF..FF", ".FFFF."],
  6: [".FFFF.", "FF....", "FF....", "FFFFF.", "FF..FF", "FF..FF", ".FFFF."],
  7: ["FFFFFF", "....FF", "...FF.", "..FF..", "..FF..", "..FF..", "..FF.."],
  8: [".FFFF.", "FF..FF", "FF..FF", ".FFFF.", "FF..FF", "FF..FF", ".FFFF."],
  9: [".FFFF.", "FF..FF", "FF..FF", ".FFFFF", "....FF", "....FF", ".FFFF."],
};
for (const [digit, rows] of Object.entries(DIGITS)) {
  SPRITES[`font/${digit}`] = [...rows.map((row) => `.${row}.`), "........"];
}

for (const facing of ["front", "back", "side"]) {
  LEGS[facing].forEach((feet, frame) => {
    SPRITES[`player/${facing}-${frame}`] = [...BODY[facing], feet];
  });
  ATTACK_LEGS[facing].forEach((feet, frame) => {
    SPRITES[`player/${facing}-attack-${frame}`] = [
      ...ATTACK_BODY[facing],
      feet,
    ];
  });
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

// Minimal RGBA PNG: one IHDR, one IDAT with every row unfiltered, one IEND.
function encodePng(rows, palette = PALETTE) {
  const height = rows.length;
  const width = rows[0].length;
  const raw = Buffer.alloc(height * (1 + width * 4));
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`row ${y} is not ${width} wide`);
    const offset = y * (1 + width * 4);
    raw[offset] = 0; // filter: none
    [...row].forEach((key, x) => {
      const color = palette[key];
      if (!color) throw new Error(`unknown palette key "${key}"`);
      raw.set(color, offset + 1 + x * 4);
    });
  });

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Sprites that recolor a shared template: their own colors for some keys.
const RECOLORED = {};

// Item icons. Staves share one template, told apart by their gem: "1" is the
// gem, "2" its shine, "o" the wooden shaft.
const STAFF = [
  ".....11.",
  "....1211",
  "....o11.",
  "...oo...",
  "..oo....",
  ".oo.....",
  "oo......",
  "o.......",
];
const STAFF_GEMS = {
  apprenticeStaff: [
    [70, 120, 230],
    [170, 200, 255],
  ],
  hasteStaff: [
    [60, 210, 230],
    [200, 250, 255],
  ],
  serpentStaff: [
    [60, 180, 70],
    [170, 240, 160],
  ],
  currentStaff: [
    [40, 160, 150],
    [150, 230, 220],
  ],
  cometStaff: [
    [240, 130, 40],
    [255, 210, 140],
  ],
  mireStaff: [
    [120, 110, 50],
    [190, 180, 110],
  ],
  spiralStaff: [
    [140, 70, 200],
    [210, 170, 250],
  ],
  phantomStaff: [
    [190, 220, 240],
    [255, 255, 255],
  ],
  prejudiceStaff: [
    [230, 60, 220],
    [255, 190, 250],
  ],
};
for (const [item, [gem, shine]] of Object.entries(STAFF_GEMS)) {
  RECOLORED[`items/${item}`] = {
    rows: STAFF,
    colors: { 1: [...gem, 255], 2: [...shine, 255] },
  };
}

SPRITES["items/boomerang"] = [
  "........",
  ".nnn....",
  ".nZZn...",
  "..nZZn..",
  "...nZn..",
  "..nZZn..",
  ".nZZn...",
  ".nnn....",
];
// A long spear with a steel head.
SPRITES["items/lance"] = [
  "......TT",
  ".....TtT",
  "....oTT.",
  "...oo...",
  "..oo....",
  ".oo.....",
  "oo......",
  "o.......",
];

for (const [name, sprite] of Object.entries({ ...SPRITES, ...RECOLORED })) {
  const rows = Array.isArray(sprite) ? sprite : sprite.rows;
  const palette = Array.isArray(sprite)
    ? PALETTE
    : { ...PALETTE, ...sprite.colors };
  const path = join(OUT, `${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(rows, palette));
  console.log(`wrote ${path}`);
}

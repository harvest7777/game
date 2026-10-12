// Writes the starter 8x8 sprites to public/sprites as PNGs. It's a one-off
// seed: once the files exist, edit them in a pixel editor and don't rerun this
// unless you want to reset them. Name sprites to write only those, so new
// starter art can be added without touching what's been edited.
//
//   node scripts/generate-sprites.mjs
//   node scripts/generate-sprites.mjs characters/gravestone

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

// Slime King's 16px clips. The encounter system chooses a named clip and
// stage progress picks its frame; these poses are intentionally broad so
// players can read tells at a glance.
const KING_CLIPS = [
  "idle",
  "ringTell",
  "ringCast",
  "aimTell",
  "sprayCast",
  "chargeTell",
  "chargeDash",
  "recover",
  "frenzyTell",
  "frenzyCast",
  "collapse",
  "exposed",
];

function kingFrame(clip, frame) {
  const grid = Array.from({ length: 16 }, () => Array(16).fill("."));
  const put = (x, y, color) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16) grid[y][x] = color;
  };
  const squashed = clip === "chargeTell" || clip === "collapse";
  const top = squashed ? 7 : clip === "chargeDash" ? 5 : 3;
  const bottom = clip === "collapse" ? 13 : 14;
  const left = clip === "chargeDash" ? 0 : 1;
  const right = clip === "chargeDash" ? 15 : 14;

  for (let y = top; y <= bottom; y++) {
    const inset = y === top || y === bottom ? 2 : 0;
    for (let x = left + inset; x <= right - inset; x++) {
      const edge = x === left + inset || x === right - inset || y === bottom;
      put(x, y, edge ? "D" : "l");
    }
  }

  // A small fixed shine gives the slime volume without a busy checker or
  // diagonal pattern that can be mistaken for missing texture pixels.
  for (let i = 0; i < 3; i++) put(left + 3 + i, top + 2 - i, "L");

  if (clip !== "collapse") {
    put(5, top + 4, "e");
    put(10, top + 4, "e");
  }
  if (
    ["ringTell", "ringCast", "frenzyTell", "frenzyCast", "exposed"].includes(
      clip,
    )
  ) {
    for (let x = 4; x <= 11; x++) put(x, top - 1, "y");
    put(5, top - 2, "y");
    put(8, top - 3, "y");
    put(11, top - 2, "y");
  }
  if (["ringTell", "frenzyTell"].includes(clip)) {
    const reach = 2 + frame;
    for (let x = left - reach; x <= right + reach; x++) {
      if (x < left || x > right) put(x, top + 5, "y");
    }
  }
  if (["ringCast", "frenzyCast", "sprayCast"].includes(clip)) {
    // Gold edge sparks are a cast signal; the actual bright projectiles are
    // spawned by the matching gameplay cue, outside the boss sprite.
    put(0, top + 4 + frame, "y");
    put(15, top + 4 - frame, "y");
  }
  if (clip === "aimTell") {
    for (let x = 12; x < 16; x++) put(x, top + 4, frame === 2 ? "w" : "y");
  }
  if (clip === "chargeTell") {
    for (let x = 2; x < 14; x += 3) put(x, bottom + 1, "y");
  }
  if (clip === "chargeDash") {
    for (let x = 0; x < 5 + frame * 2; x++) put(x, 11, "L");
  }
  if (["collapse", "exposed"].includes(clip)) {
    // An opaque, faceted core. Avoid a checker pattern here: at game scale
    // it reads as an accidental transparency grid rather than a weak point.
    put(8, 6, "y");
    put(7, 7, "y");
    put(8, 7, "w");
    put(9, 7, "y");
    for (let x = 6; x <= 10; x++) put(x, 8, "y");
    put(7, 8, "w");
    put(8, 8, "w");
    put(9, 8, "w");
    for (let x = 6; x <= 10; x++) put(x, 9, "y");
    put(7, 9, "w");
    put(8, 9, "w");
    put(9, 9, "w");
    put(7, 10, "y");
    put(8, 10, "w");
    put(9, 10, "y");
    put(8, 11, "y");
  }
  return grid.map((row) => row.join(""));
}

for (const clip of KING_CLIPS) {
  for (let frame = 0; frame < 3; frame++) {
    SPRITES[`enemies/slime-king/${clip}-${frame}`] = kingFrame(clip, frame);
  }
}

// Fonts, drawn white ("F") so the renderer can tint them. Each glyph sits at
// the left of an 8x8 cell; the renderer measures how wide it is from the
// art, so glyphs can be any width. Capitals and digits use rows 0-6, and
// the bottom row is for descenders.
//
// Bold: chunky 6x7 digits with 2-pixel strokes, for damage numbers.
const BOLD = {
  0: [".FFFF.", "FF..FF", "FF..FF", "FF..FF", "FF..FF", "FF..FF", ".FFFF."],
  1: [".FF.", "FFF.", ".FF.", ".FF.", ".FF.", ".FF.", "FFFF"],
  2: [".FFFF.", "FF..FF", "....FF", "...FF.", "..FF..", ".FF...", "FFFFFF"],
  3: ["FFFFF.", "....FF", "....FF", ".FFFF.", "....FF", "....FF", "FFFFF."],
  4: ["FF..FF", "FF..FF", "FF..FF", "FFFFFF", "....FF", "....FF", "....FF"],
  5: ["FFFFFF", "FF....", "FFFFF.", "....FF", "....FF", "FF..FF", ".FFFF."],
  6: [".FFFF.", "FF....", "FF....", "FFFFF.", "FF..FF", "FF..FF", ".FFFF."],
  7: ["FFFFFF", "....FF", "...FF.", "..FF..", "..FF..", "..FF..", "..FF.."],
  8: [".FFFF.", "FF..FF", "FF..FF", ".FFFF.", "FF..FF", "FF..FF", ".FFFF."],
  9: [".FFFF.", "FF..FF", "FF..FF", ".FFFFF", "....FF", "....FF", ".FFFF."],
};

// Regular: a 1-pixel-stroke font for labels and tooltips.
const REGULAR = {
  A: [".##.", "#..#", "#..#", "####", "#..#", "#..#", "#..#"],
  B: ["###.", "#..#", "#..#", "###.", "#..#", "#..#", "###."],
  C: [".##.", "#..#", "#...", "#...", "#...", "#..#", ".##."],
  D: ["###.", "#..#", "#..#", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "#...", "###.", "#...", "#...", "####"],
  F: ["####", "#...", "#...", "###.", "#...", "#...", "#..."],
  G: [".##.", "#..#", "#...", "#.##", "#..#", "#..#", ".###"],
  H: ["#..#", "#..#", "#..#", "####", "#..#", "#..#", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  J: ["..##", "...#", "...#", "...#", "#..#", "#..#", ".##."],
  K: ["#..#", "#..#", "#.#.", "##..", "#.#.", "#..#", "#..#"],
  L: ["#...", "#...", "#...", "#...", "#...", "#...", "####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#..#", "##.#", "##.#", "#.##", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "#..#", "###.", "#...", "#...", "#..."],
  Q: [".##.", "#..#", "#..#", "#..#", "#..#", "#.#.", ".#.#"],
  R: ["###.", "#..#", "#..#", "###.", "#.#.", "#..#", "#..#"],
  S: [".###", "#...", "#...", ".##.", "...#", "...#", "###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#..#", "#..#", "#..#", "#..#", "#..#", "#..#", ".##."],
  V: ["#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#..", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["####", "...#", "...#", "..#.", ".#..", "#...", "####"],
  a: ["....", "....", ".##.", "...#", ".###", "#..#", ".###", "...."],
  b: ["#...", "#...", "###.", "#..#", "#..#", "#..#", "###.", "...."],
  c: ["....", "....", ".##.", "#...", "#...", "#...", ".##.", "...."],
  d: ["...#", "...#", ".###", "#..#", "#..#", "#..#", ".###", "...."],
  e: ["....", "....", ".##.", "#..#", "####", "#...", ".##.", "...."],
  f: [".##", "#..", "#..", "##.", "#..", "#..", "#..", "..."],
  g: ["....", "....", ".###", "#..#", "#..#", ".###", "...#", ".##."],
  h: ["#...", "#...", "###.", "#..#", "#..#", "#..#", "#..#", "...."],
  i: ["#", ".", "#", "#", "#", "#", "#", "."],
  j: [".#", "..", ".#", ".#", ".#", ".#", ".#", "#."],
  k: ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#", "...."],
  l: ["#.", "#.", "#.", "#.", "#.", "#.", ".#", ".."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#", "....."],
  n: ["....", "....", "###.", "#..#", "#..#", "#..#", "#..#", "...."],
  o: ["....", "....", ".##.", "#..#", "#..#", "#..#", ".##.", "...."],
  p: ["....", "....", "###.", "#..#", "#..#", "###.", "#...", "#..."],
  q: ["....", "....", ".###", "#..#", "#..#", ".###", "...#", "...#"],
  r: ["...", "...", "#.#", "##.", "#..", "#..", "#..", "..."],
  s: ["....", "....", ".###", "#...", ".##.", "...#", "###.", "...."],
  t: [".#.", ".#.", "###", ".#.", ".#.", ".#.", "..#", "..."],
  u: ["....", "....", "#..#", "#..#", "#..#", "#..#", ".###", "...."],
  v: [".....", ".....", "#...#", "#...#", ".#.#.", ".#.#.", "..#..", "....."],
  w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#.", "....."],
  x: ["....", "....", "#..#", "#..#", ".##.", "#..#", "#..#", "...."],
  y: ["....", "....", "#..#", "#..#", "#..#", ".###", "...#", ".##."],
  z: ["....", "....", "####", "...#", ".##.", "#...", "####", "...."],
  0: [".##.", "#..#", "#.##", "##.#", "#..#", "#..#", ".##."],
  1: [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"],
  2: [".##.", "#..#", "...#", "..#.", ".#..", "#...", "####"],
  3: ["###.", "...#", "...#", ".##.", "...#", "...#", "###."],
  4: ["#..#", "#..#", "#..#", "####", "...#", "...#", "...#"],
  5: ["####", "#...", "###.", "...#", "...#", "#..#", ".##."],
  6: [".##.", "#...", "#...", "###.", "#..#", "#..#", ".##."],
  7: ["####", "...#", "..#.", ".#..", ".#..", ".#..", ".#.."],
  8: [".##.", "#..#", "#..#", ".##.", "#..#", "#..#", ".##."],
  9: [".##.", "#..#", "#..#", ".###", "...#", "...#", ".##."],
  ".": [".", ".", ".", ".", ".", ".", "#"],
  ",": ["..", "..", "..", "..", "..", ".#", ".#", "#."],
  ":": [".", ".", "#", ".", ".", "#", "."],
  ";": ["..", "..", ".#", "..", "..", ".#", "#."],
  "!": ["#", "#", "#", "#", "#", ".", "#"],
  "?": [".##.", "#..#", "...#", "..#.", ".#..", "....", ".#.."],
  "'": ["#", "#", ".", ".", ".", ".", "."],
  '"': ["#.#", "#.#", "...", "...", "...", "...", "..."],
  "-": ["...", "...", "...", "###", "...", "...", "..."],
  "+": ["...", "...", ".#.", "###", ".#.", "...", "..."],
  "/": ["...#", "...#", "..#.", "..#.", ".#..", ".#..", "#..."],
  "(": [".#", "#.", "#.", "#.", "#.", "#.", ".#"],
  ")": ["#.", ".#", ".#", ".#", ".#", ".#", "#."],
  "%": ["#...#", "#..#.", "...#.", "..#..", ".#...", ".#..#", "#...#"],
};

// File name for a character. Letters say their case, since some file
// systems treat "a" and "A" as the same name. Keep in step with glyphFile in
// src/render/assets.ts.
const PUNCTUATION = {
  ".": "period",
  ",": "comma",
  ":": "colon",
  ";": "semicolon",
  "!": "exclamation",
  "?": "question",
  "'": "apostrophe",
  '"': "quote",
  "-": "dash",
  "+": "plus",
  "/": "slash",
  "(": "open-paren",
  ")": "close-paren",
  "%": "percent",
};
function glyphFile(char) {
  if (/[A-Z]/.test(char)) return `upper-${char.toLowerCase()}`;
  if (/[a-z]/.test(char)) return `lower-${char}`;
  return PUNCTUATION[char] ?? char;
}

function glyphCell(rows) {
  const cell = rows.map((row) => row.replaceAll("#", "F").padEnd(8, "."));
  while (cell.length < 8) cell.push("........");
  return cell;
}
for (const [char, rows] of Object.entries(BOLD)) {
  SPRITES[`font/bold/${glyphFile(char)}`] = glyphCell(rows);
}
for (const [char, rows] of Object.entries(REGULAR)) {
  SPRITES[`font/regular/${glyphFile(char)}`] = glyphCell(rows);
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
  helixStaff: [
    [220, 70, 110],
    [255, 180, 200],
  ],
  leafStaff: [
    [110, 190, 50],
    [210, 250, 150],
  ],
  forkStaff: [
    [140, 150, 210],
    [225, 230, 255],
  ],
  bloomStaff: [
    [240, 110, 170],
    [255, 215, 235],
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

// A plain headstone with two engraved lines.
SPRITES["characters/gravestone"] = [
  "........",
  "..MMMM..",
  ".MttttM.",
  ".MtmmtM.",
  ".MttttM.",
  ".MtmmtM.",
  ".MttttM.",
  "MMMMMMMM",
];

// Nexus ground: warm planks, still water and soft grass. Each tiles with
// itself, so neighbours line up seamlessly.
SPRITES["tiles/wood"] = {
  rows: [
    "hhhhhhhh",
    "hhkkkhhh",
    "hhhhhhHH",
    "jjjjjjjj",
    "Hhhhhhhh",
    "hhhhkkkh",
    "hhhhhhhh",
    "jjjjjjjj",
  ],
  colors: {
    h: [176, 122, 72, 255], // plank
    H: [198, 144, 90, 255], // plank highlight
    k: [154, 104, 60, 255], // grain
    j: [118, 78, 44, 255], // gap between planks
  },
};
SPRITES["tiles/water"] = {
  rows: [
    "aaaaaaaa",
    "aaAAaaaa",
    "aaaaAaaa",
    "aaaaaaaa",
    "aaaaaaaa",
    "aaaaaaAA",
    "Aaaaaaaa",
    "aaaaaaaa",
  ],
  colors: {
    a: [64, 132, 196, 255], // water
    A: [150, 206, 236, 255], // ripple
  },
};
SPRITES["tiles/grass"] = {
  rows: [
    "vvvvvVvv",
    "vVvvvvvv",
    "vvvvvvvf",
    "vvvvvvvv",
    "vvvVvvvv",
    "vvvvvvVv",
    "vVvvvvvv",
    "vvvvvvvv",
  ],
  colors: {
    v: [96, 152, 80, 255], // grass
    V: [124, 180, 98, 255], // blade highlight
    f: [176, 204, 112, 255], // clover
  },
};

// Dungeon ground: molten rock with cooler crust drifting on it. Tiles with
// itself.
SPRITES["tiles/lava"] = {
  rows: [
    "llllLlll",
    "lLLlllll",
    "llllllcc",
    "lllyllll",
    "cllllllL",
    "llllLLll",
    "llclllll",
    "Llllllyl",
  ],
  colors: {
    l: [214, 72, 26, 255], // lava
    L: [244, 140, 44, 255], // bright flow
    y: [255, 214, 92, 255], // hottest spot
    c: [150, 40, 24, 255], // cooling crust
  },
};

// Portals: a swirling ring, lying on the ground. One shape, colored by
// where it goes.
const PORTAL = [
  "..aaaa..",
  ".abbbba.",
  "abccccba",
  "abc..cba",
  "abc..cba",
  "abccccba",
  ".abbbba.",
  "..aaaa..",
];
SPRITES["portals/nexus"] = {
  rows: PORTAL,
  colors: {
    a: [40, 70, 160, 255], // rim
    b: [80, 140, 230, 255], // swirl
    c: [190, 230, 255, 255], // bright inner edge
  },
};
SPRITES["portals/abyss"] = {
  rows: PORTAL,
  colors: {
    a: [90, 14, 14, 255], // rim
    b: [200, 50, 24, 255], // swirl
    c: [255, 170, 60, 255], // bright inner edge
  },
};

const only = process.argv.slice(2);
for (const [name, sprite] of Object.entries({ ...SPRITES, ...RECOLORED })) {
  if (only.length > 0 && !only.includes(name)) continue;
  const rows = Array.isArray(sprite) ? sprite : sprite.rows;
  const palette = Array.isArray(sprite)
    ? PALETTE
    : { ...PALETTE, ...sprite.colors };
  const path = join(OUT, `${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(rows, palette));
  console.log(`wrote ${path}`);
}

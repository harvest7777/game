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

const SPRITES = {
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

for (const facing of ["front", "back", "side"]) {
  LEGS[facing].forEach((feet, frame) => {
    SPRITES[`player/${facing}-${frame}`] = [...BODY[facing], feet];
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
function encodePng(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const raw = Buffer.alloc(height * (1 + width * 4));
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`row ${y} is not ${width} wide`);
    const offset = y * (1 + width * 4);
    raw[offset] = 0; // filter: none
    [...row].forEach((key, x) => {
      const color = PALETTE[key];
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

for (const [name, rows] of Object.entries(SPRITES)) {
  const path = join(OUT, `${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(rows));
  console.log(`wrote ${path}`);
}

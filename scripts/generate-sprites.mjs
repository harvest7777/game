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
  h: [107, 62, 38, 255], // hair
  s: [241, 194, 125, 255], // skin
  e: [32, 32, 32, 255], // eyes
  b: [59, 111, 216, 255], // shirt
  p: [43, 43, 80, 255], // pants
  d: [58, 42, 26, 255], // boots
  y: [255, 204, 51, 255], // projectile glow
  w: [255, 248, 224, 255], // projectile core
  g: [74, 107, 58, 255], // floor
  G: [92, 127, 72, 255], // floor highlight
  q: [61, 90, 48, 255], // floor shadow
  t: [154, 154, 154, 255], // wall top
  T: [122, 122, 122, 255], // wall top mortar
  m: [106, 106, 106, 255], // wall side brick
  M: [80, 80, 80, 255], // wall side mortar
};

// Rows shared by the player's facings; the last two rows are the legs and
// change per walk frame.
const LEGS = {
  front: [
    ["..p..p..", "..d..d.."],
    ["..p..d..", "..d....."],
    ["..d..p..", ".....d.."],
  ],
  side: [
    ["...pp...", "...dd..."],
    ["..p..p..", ".d....d."],
    ["...p.p..", "..d...d."],
  ],
};

const BODY = {
  front: [
    "..hhhh..",
    ".hhhhhh.",
    ".hesseh.",
    "..ssss..",
    ".bbbbbb.",
    ".sbbbbs.",
  ],
  back: [
    "..hhhh..",
    ".hhhhhh.",
    ".hhhhhh.",
    "..hhhh..",
    ".bbbbbb.",
    ".sbbbbs.",
  ],
  // Faces right; the renderer mirrors it for left.
  side: [
    "..hhhh..",
    ".hhhhhh.",
    ".hhsses.",
    "..hsss..",
    "..bbbb..",
    "..bsbb..",
  ],
};

const SPRITES = {
  projectile: [
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
  const legs = facing === "side" ? LEGS.side : LEGS.front;
  legs.forEach((frameLegs, frame) => {
    SPRITES[`player/${facing}-${frame}`] = [...BODY[facing], ...frameLegs];
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

import { describe, expect, it } from "vitest";
import { contentArt } from "../content/art";
import { characterIds, characters } from "../content/characters";
import { enemies, enemyIds } from "../content/enemies";
import { itemIds, items } from "../content/items";
import { projectileIds, projectiles } from "../content/projectiles";
import {
  createManifest,
  glyphFile,
  manifestFiles,
  type Manifest,
} from "./assets";
import { buildAtlas, measureGlyph } from "./loader";

type FakeImage = { file: string; width: number; height: number };

function fakeLoad(file: string): Promise<FakeImage> {
  return Promise.resolve({ file, width: 8, height: 8 });
}

function fakeCanvas(width: number, height: number) {
  const draws: { file: string; x: number; y: number }[] = [];
  return {
    width,
    height,
    draws,
    drawImage(image: FakeImage, x: number, y: number) {
      draws.push({ file: image.file, x, y });
    },
    // Fully transparent: every glyph measures empty.
    pixels: (_x: number, _y: number, w: number, h: number) =>
      new Uint8ClampedArray(w * h * 4),
  };
}

// RGBA bytes for a w-wide image where `inked` columns are opaque.
function columns(w: number, h: number, inked: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (const x of inked) data[(y * w + x) * 4 + 3] = 255;
  }
  return data;
}

const small: Manifest = {
  sprites: [
    { kind: "walker", front: ["a", "b"], back: ["a"], side: ["c"] },
    { kind: "static", file: "c" },
  ],
  ground: { 0: "floor", 1: "floor" },
  fonts: { bold: { "1": "one" }, regular: {} },
  walls: { top: "top", side: "side" },
};

describe("manifestFiles", () => {
  it("lists each file the manifest uses once", () => {
    expect(manifestFiles(small).sort()).toEqual(
      ["a", "b", "c", "floor", "one", "side", "top"].sort(),
    );
  });
});

describe("buildAtlas", () => {
  it("draws every file into one canvas at its region", async () => {
    const atlas = await buildAtlas(small, fakeLoad, fakeCanvas);

    expect(atlas.canvas.draws).toHaveLength(7);
    for (const draw of atlas.canvas.draws) {
      const region = atlas.regions.get(draw.file)!;
      expect({ x: draw.x, y: draw.y }).toEqual({ x: region.x, y: region.y });
    }
  });

  it("sizes the canvas to the packing", async () => {
    const atlas = await buildAtlas(small, fakeLoad, fakeCanvas);

    expect(atlas.canvas.width).toBe(atlas.width);
    expect(atlas.canvas.height).toBe(atlas.height);
    for (const region of atlas.regions.values()) {
      expect(region.x + region.w).toBeLessThanOrEqual(atlas.width);
      expect(region.y + region.h).toBeLessThanOrEqual(atlas.height);
    }
  });
});

describe("measureGlyph", () => {
  const rect = { x: 0, y: 0, w: 8, h: 8 };

  it("finds the first inked column and the ink's width", () => {
    const canvas = { pixels: () => columns(8, 8, [1, 2, 3, 4, 5, 6]) };
    expect(measureGlyph(canvas, rect)).toEqual({ left: 1, width: 6 });
  });

  it("counts gaps inside a glyph as part of its width", () => {
    const canvas = { pixels: () => columns(8, 8, [0, 4]) };
    expect(measureGlyph(canvas, rect)).toEqual({ left: 0, width: 5 });
  });

  it("gives an empty glyph no width", () => {
    const canvas = { pixels: () => columns(8, 8, []) };
    expect(measureGlyph(canvas, rect)).toEqual({ left: 0, width: 0 });
  });

  it("reads the glyph's own rectangle of the atlas", () => {
    const asked: number[][] = [];
    const canvas = {
      pixels: (x: number, y: number, w: number, h: number) => {
        asked.push([x, y, w, h]);
        return columns(w, h, [2]);
      },
    };
    measureGlyph(canvas, { x: 17, y: 9, w: 8, h: 8 });
    expect(asked).toEqual([[17, 9, 8, 8]]);
  });
});

describe("buildAtlas glyphs", () => {
  it("measures every font glyph", async () => {
    const atlas = await buildAtlas(small, fakeLoad, fakeCanvas);
    expect([...atlas.glyphs.keys()]).toEqual(["one"]);
  });
});

describe("the real manifest", () => {
  const manifest = createManifest(contentArt());

  it("only references sprite files that exist", () => {
    const onDisk = new Set(
      Object.keys(import.meta.glob("../../public/sprites/**/*.png")).map(
        (path) => path.replace("../../public/sprites/", "").replace(".png", ""),
      ),
    );
    expect(onDisk.size).toBeGreaterThan(0);
    for (const file of manifestFiles(manifest)) {
      expect(onDisk.has(file), file).toBe(true);
    }
  });

  it("has art for every projectile", () => {
    for (const id of projectileIds) {
      expect(manifest.sprites, id).toContain(projectiles[id].sprite.art);
    }
  });

  it("has an icon for every item", () => {
    const files = manifestFiles(manifest);
    for (const id of itemIds) expect(files, id).toContain(items[id].icon);
  });

  it("has a bold glyph for every digit", () => {
    for (const digit of "0123456789") {
      expect(manifest.fonts.bold[digit], digit).toBeDefined();
    }
  });

  it("has a regular glyph for every letter, digit and common punctuation", () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:!?-+/()%";
    for (const char of chars) {
      expect(manifest.fonts.regular[char], char).toBeDefined();
    }
  });

  it("names letter glyphs by case so they can't collide", () => {
    expect(glyphFile("A")).toBe("upper-a");
    expect(glyphFile("a")).toBe("lower-a");
    expect(glyphFile("7")).toBe("7");
    expect(glyphFile("?")).toBe("question");
  });

  it("has art for every character", () => {
    for (const id of characterIds) {
      expect(manifest.sprites, id).toContain(characters[id].sprite.art);
      expect(manifest.sprites, id).toContain(characters[id].gravestone);
    }
  });

  it("has art for every enemy", () => {
    for (const id of enemyIds) {
      expect(manifest.sprites, id).toContain(enemies[id].sprite.art);
    }
  });

  it("gives every walker three frames per facing, attacks included", () => {
    for (const art of manifest.sprites) {
      if (art.kind !== "walker") continue;
      for (const set of [art, art.attack]) {
        if (!set) continue;
        expect(set.front).toHaveLength(3);
        expect(set.back).toHaveLength(3);
        expect(set.side).toHaveLength(3);
      }
    }
  });
});

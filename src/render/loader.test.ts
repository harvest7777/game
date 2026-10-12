import { describe, expect, it } from "vitest";
import { enemyDef, enemyIds } from "../ecs/enemy/definitions";
import { projectileDef, projectileIds } from "../ecs/projectile/definitions";
import { manifest, manifestFiles, type Manifest } from "./assets";
import { buildAtlas } from "./loader";

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
  };
}

const small: Manifest = {
  sprites: {
    hero: { kind: "walker", front: ["a", "b"], back: ["a"], side: ["c"] },
    rock: { kind: "static", file: "c" },
  },
  ground: { 0: "floor", 1: "floor" },
  walls: { top: "top", side: "side" },
};

describe("manifestFiles", () => {
  it("lists each file the manifest uses once", () => {
    expect(manifestFiles(small).sort()).toEqual(
      ["a", "b", "c", "floor", "side", "top"].sort(),
    );
  });
});

describe("buildAtlas", () => {
  it("draws every file into one canvas at its region", async () => {
    const atlas = await buildAtlas(small, fakeLoad, fakeCanvas);

    expect(atlas.canvas.draws).toHaveLength(6);
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

describe("the real manifest", () => {
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
      const { name } = projectileDef(id).sprite;
      expect(manifest.sprites[name], `${id} uses "${name}"`).toBeDefined();
    }
  });

  it("has art for every enemy", () => {
    for (const id of enemyIds) {
      const { name } = enemyDef(id).sprite;
      expect(manifest.sprites[name], `${id} uses "${name}"`).toBeDefined();
    }
  });

  it("gives every walker three frames per facing, attacks included", () => {
    for (const art of Object.values(manifest.sprites)) {
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

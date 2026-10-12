import { describe, expect, it } from "vitest";
import { addMovable, addSprite } from "../ecs/bundles";
import { createTiles, setWall } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import type { Art } from "./art";
import type { Manifest } from "./assets";
import { buildFrame, cameraAngle, cameraCenter, frameView } from "./frame";
import { QuadBuffer, readQuads, type Quad } from "./quads";

const manifest: Manifest = {
  sprites: { orb: { kind: "static", file: "orb" } },
  fonts: { bold: {}, regular: {} },
  ground: { 0: "floor" },
  walls: { top: "top", side: "side" },
};
const files = ["floor", "top", "side", "orb"];
const art: Art = {
  manifest,
  regions: new Map(files.map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }])),
  glyphs: new Map(),
};
const fileOf = (q: Quad) => files[q.region.x / 10];

function worldWithPlayer() {
  const world = createWorld(createTiles(20, 20));
  const player = spawn(world);
  addMovable(world, player, { at: { x: 12, y: 10 }, hitbox: { r: 0.4 } });
  addSprite(world, player, { name: "orb", layer: "player" });
  world.components.previousPosition.set(player, { x: 10, y: 10 });
  return { world, player };
}

describe("cameraCenter", () => {
  it("follows the target where it's drawn between ticks", () => {
    const { world, player } = worldWithPlayer();
    world.camera.target = player;

    expect(cameraCenter(world, 0.5)).toEqual({ x: 11, y: 10 });
  });

  it("looks at the middle of the map with no target", () => {
    const { world } = worldWithPlayer();
    expect(cameraCenter(world, 0.5)).toEqual({ x: 10, y: 10 });
  });
});

describe("cameraAngle", () => {
  function turning(from: number, to: number) {
    const { world } = worldWithPlayer();
    world.camera.previousAngle = from;
    world.camera.angle = to;
    return world;
  }

  it("is the previous tick's angle at alpha 0 and the latest at alpha 1", () => {
    const world = turning(1, 2);
    expect(cameraAngle(world, 0)).toBeCloseTo(1);
    expect(cameraAngle(world, 1)).toBeCloseTo(2);
  });

  it("turns partway between ticks", () => {
    const world = turning(1, 2);
    expect(cameraAngle(world, 0.25)).toBeCloseTo(1.25);
  });

  it("turns the short way across 0 instead of spinning all the way round", () => {
    // 0.1 rad before a full turn to 0.1 rad after it: 0.2 rad clockwise.
    const world = turning(2 * Math.PI - 0.1, 0.1);
    const halfway = cameraAngle(world, 0.5);
    expect(Math.cos(halfway)).toBeCloseTo(1);
    expect(Math.sin(halfway)).toBeCloseTo(0);
  });

  it("is what the frame's view is drawn with", () => {
    const world = turning(1, 2);
    expect(frameView(world, 0.5, 400, 400, 1).angle).toBeCloseTo(1.5);
  });
});

describe("buildFrame", () => {
  it("puts terrain, health bars, sprites, then debug overlays, and counts each", () => {
    const { world, player } = worldWithPlayer();
    world.components.health.set(player, { hp: 50, max: 100 });
    setWall(world.tiles, 11, 9);
    const view = frameView(world, 1, 400, 400, 1);
    const out = new QuadBuffer();

    const sections = buildFrame(out, world, view, art, 1, 0, {
      hitboxes: true,
      font: false,
    });

    const quads = readQuads(out);
    let at = 0;
    const take = (n: number) => quads.slice(at, (at += n));
    const terrain = take(sections.terrain);
    const sprites = take(sections.sprites);
    const overlay = take(sections.overlay);
    const debug = take(sections.debug);
    expect(at).toBe(out.count);
    expect(terrain.map(fileOf)).toContain("top");
    // The health bar (background and fill) comes first so the sprite covers
    // it.
    expect(sprites.map((q) => q.fill)).toEqual([true, true, false]);
    expect(fileOf(sprites[2])).toBe("orb");
    expect(overlay).toHaveLength(0);
    expect(debug).toHaveLength(1);
    expect(debug[0].ring).toBeGreaterThan(0);
  });

  it("has no debug overlays unless asked", () => {
    const { world } = worldWithPlayer();
    const view = frameView(world, 1, 400, 400, 1);

    const sections = buildFrame(new QuadBuffer(), world, view, art, 1, 0);

    expect(sections.debug).toBe(0);
  });

  describe("depth between walls and sprites", () => {
    // The player stands at (12, 10); look at the depth of a wall placed
    // relative to it, and the player's own depth.
    function depths(wallX: number, wallY: number, angle = 0) {
      const { world } = worldWithPlayer();
      setWall(world.tiles, wallX, wallY);
      world.camera.angle = world.camera.previousAngle = angle;
      const view = frameView(world, 1, 400, 400, 1);
      const out = new QuadBuffer();
      buildFrame(out, world, view, art, 1, 0);
      const quads = readQuads(out);
      const wall = quads.find((q) => fileOf(q) === "top")!;
      const sprite = quads.find((q) => fileOf(q) === "orb")!;
      return { wall: wall.depth, sprite: sprite.depth };
    }

    it("puts a sprite in front of a wall it stands south of", () => {
      const { wall, sprite } = depths(12, 9);
      expect(sprite).toBeLessThan(wall);
    });

    it("puts a sprite behind a wall it stands north of", () => {
      const { wall, sprite } = depths(12, 11);
      expect(sprite).toBeGreaterThan(wall);
    });

    it("flips with the camera turned around", () => {
      const { wall, sprite } = depths(12, 9, Math.PI);
      expect(sprite).toBeGreaterThan(wall);
    });

    it("puts a sprite in front of a wall diagonally behind it", () => {
      // Wall center at y 9.5, player at 10: the player is lower on screen.
      const { wall, sprite } = depths(11, 9);
      expect(sprite).toBeLessThan(wall);
    });

    it("puts ground at the back", () => {
      const { world } = worldWithPlayer();
      const view = frameView(world, 1, 400, 400, 1);
      const out = new QuadBuffer();
      buildFrame(out, world, view, art, 1, 0);
      const floors = readQuads(out).filter((q) => fileOf(q) === "floor");
      expect(floors.every((q) => q.depth === 1)).toBe(true);
    });
  });

  it("keeps the followed player at the focus point mid-tick", () => {
    const { world, player } = worldWithPlayer();
    world.camera.target = player;
    world.camera.focusOffset = { x: 0, y: 0.25 };
    const alpha = 0.3;
    const view = frameView(world, alpha, 400, 400, 1);
    const out = new QuadBuffer();

    buildFrame(out, world, view, art, alpha, 0);

    const [sprite] = readQuads(out).filter((q) => fileOf(q) === "orb");
    const centerX = (sprite.corners[0].x + sprite.corners[2].x) / 2;
    const centerY = (sprite.corners[0].y + sprite.corners[2].y) / 2;
    expect(centerX).toBeCloseTo(view.focus.x, 3);
    expect(centerY).toBeCloseTo(view.focus.y, 3);
  });

  it("starts from an empty buffer each frame", () => {
    const { world } = worldWithPlayer();
    const view = frameView(world, 1, 400, 400, 1);
    const out = new QuadBuffer();

    buildFrame(out, world, view, art, 1, 0);
    const first = out.count;
    buildFrame(out, world, view, art, 1, 0);

    expect(out.count).toBe(first);
  });
});

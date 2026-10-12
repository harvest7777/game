import { describe, expect, it } from "vitest";
import { addMovable, addSprite } from "../ecs/bundles";
import { createTiles, setWall } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import type { Art } from "./art";
import type { Manifest } from "./assets";
import { buildFrame, cameraCenter, frameView } from "./frame";
import { QuadBuffer, readQuads, type Quad } from "./quads";

const manifest: Manifest = {
  sprites: { orb: { kind: "static", file: "orb" } },
  ground: { 0: "floor" },
  walls: { top: "top", side: "side" },
};
const files = ["floor", "top", "side", "orb"];
const art: Art = {
  manifest,
  regions: new Map(files.map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }])),
};
const fileOf = (q: Quad) => files[q.region.x / 10];

function worldWithPlayer() {
  const world = createWorld(createTiles(20, 20));
  const player = spawn(world);
  addMovable(world, player, { at: { x: 12, y: 10 }, r: 0.4 });
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

describe("buildFrame", () => {
  it("draws ground, then walls, then sprites", () => {
    const { world } = worldWithPlayer();
    setWall(world.tiles, 11, 9);
    const view = frameView(world, 1, 400, 400, 1);
    const out = new QuadBuffer();

    buildFrame(out, world, view, art, 1, 0);

    const kinds = readQuads(out).map(fileOf);
    const lastGround = kinds.lastIndexOf("floor");
    const firstWall = kinds.findIndex((k) => k === "top" || k === "side");
    const lastWall = Math.max(
      kinds.lastIndexOf("top"),
      kinds.lastIndexOf("side"),
    );
    expect(lastGround).toBeLessThan(firstWall);
    expect(lastWall).toBeLessThan(kinds.indexOf("orb"));
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

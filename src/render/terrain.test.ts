import { describe, expect, it } from "vitest";
import { createCamera } from "../ecs/camera/resource";
import type { Vec2 } from "../ecs/shared/physics/math";
import { createTiles, setGround, setWall, type Tiles } from "../ecs/tiles";
import type { Art } from "./art";
import type { Manifest } from "./assets";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import { pushGround, pushWalls, WALL_HEIGHT } from "./terrain";
import { createView, TILE_PIXELS, worldToScreen, type View } from "./view";

const LAVA = 3;
const manifest: Manifest = {
  sprites: {},
  ground: { 0: "floor", [LAVA]: "lava" },
  walls: { top: "top", side: "side" },
};
// Each file gets its own x so a quad's region says which file it is.
const files = ["floor", "lava", "top", "side"];
const art: Art = {
  manifest,
  regions: new Map(files.map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }])),
};
const fileOf = (q: Quad) => files[q.region.x / 10];

// 200x200 px at 40 px per tile shows 5x5 tiles around the center.
const SIZE = 200;
const LIFT = WALL_HEIGHT * TILE_PIXELS;

function viewAt(center: Vec2, angle = 0, zoom = 1): View {
  return createView({ ...createCamera(), angle, zoom }, center, SIZE, SIZE);
}

function ground(tiles: Tiles, view: View): Quad[] {
  const out = new QuadBuffer();
  pushGround(out, tiles, view, art);
  return readQuads(out);
}

function walls(tiles: Tiles, view: View): Quad[] {
  const out = new QuadBuffer();
  pushWalls(out, tiles, view, art);
  return readQuads(out);
}

function expectCorners(quad: Quad, expected: Vec2[]) {
  quad.corners.forEach((corner, i) => {
    expect(corner.x, `corner ${i} x`).toBeCloseTo(expected[i].x);
    expect(corner.y, `corner ${i} y`).toBeCloseTo(expected[i].y);
  });
}

function lifted(p: Vec2): Vec2 {
  return { x: p.x, y: p.y - LIFT };
}

describe("pushGround", () => {
  it("draws only tiles on screen", () => {
    // Visible x and y run 7.5..12.5, touching tiles 7..12.
    const quads = ground(createTiles(20, 20), viewAt({ x: 10, y: 10 }));
    expect(quads).toHaveLength(6 * 6);
  });

  it("draws nothing outside the map", () => {
    // Visible x and y run -2.5..2.5, but only tiles 0..2 exist.
    const quads = ground(createTiles(20, 20), viewAt({ x: 0, y: 0 }));
    expect(quads).toHaveLength(3 * 3);
  });

  it("draws more tiles when zoomed out", () => {
    // 10x10 tiles visible: 5..15.
    const quads = ground(createTiles(20, 20), viewAt({ x: 10, y: 10 }, 0, 0.5));
    expect(quads).toHaveLength(11 * 11);
  });

  it("rotates each tile with the camera", () => {
    const view = viewAt({ x: 0.5, y: 0.5 }, 0.6);

    const [tile] = ground(createTiles(1, 1), view);

    const at = (x: number, y: number) => worldToScreen(view, { x, y });
    expectCorners(tile, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)]);
  });

  it("uses each tile's ground art", () => {
    const tiles = createTiles(20, 20);
    setGround(tiles, 10, 10, LAVA);

    const quads = ground(tiles, viewAt({ x: 10, y: 10 }));

    expect(quads.filter((q) => fileOf(q) === "lava")).toHaveLength(1);
    expect(quads.filter((q) => fileOf(q) === "floor")).toHaveLength(35);
  });

  it("refuses a ground type with no art", () => {
    const tiles = createTiles(20, 20);
    setGround(tiles, 10, 10, 99);
    expect(() => ground(tiles, viewAt({ x: 10, y: 10 }))).toThrow();
  });
});

describe("pushWalls", () => {
  // A lone wall at (10, 10) on an open map.
  function lone(angle: number) {
    const tiles = createTiles(20, 20);
    setWall(tiles, 10, 10);
    const view = viewAt({ x: 10.5, y: 10.5 }, angle);
    const at = (x: number, y: number) => worldToScreen(view, { x, y });
    return { quads: walls(tiles, view), at };
  }

  it("draws the south face and a raised top when unrotated", () => {
    const { quads, at } = lone(0);

    expect(quads.map(fileOf)).toEqual(["side", "top"]);
    const [face, top] = quads;
    // Face runs from the south edge on the ground up to the raised edge.
    expectCorners(face, [
      lifted(at(10, 11)),
      lifted(at(11, 11)),
      at(11, 11),
      at(10, 11),
    ]);
    expectCorners(top, [
      lifted(at(10, 10)),
      lifted(at(11, 10)),
      lifted(at(11, 11)),
      lifted(at(10, 11)),
    ]);
  });

  it("shows the north face when the camera is turned around", () => {
    const { quads, at } = lone(Math.PI);

    const sides = quads.filter((q) => fileOf(q) === "side");
    expect(sides).toHaveLength(1);
    // World north is now screen-down, so (11, 10) is on the left.
    expectCorners(sides[0], [
      lifted(at(11, 10)),
      lifted(at(10, 10)),
      at(10, 10),
      at(11, 10),
    ]);
  });

  it("shows the west face when the top of the screen faces east", () => {
    const { quads, at } = lone(Math.PI / 2);

    const sides = quads.filter((q) => fileOf(q) === "side");
    expect(sides).toHaveLength(1);
    expectCorners(sides[0], [
      lifted(at(10, 10)),
      lifted(at(10, 11)),
      at(10, 11),
      at(10, 10),
    ]);
  });

  it("shows two faces when rotated diagonally", () => {
    const { quads } = lone(Math.PI / 4);
    expect(quads.filter((q) => fileOf(q) === "side")).toHaveLength(2);
  });

  it("hides faces that are against another wall", () => {
    const tiles = createTiles(20, 20);
    setWall(tiles, 10, 10);
    setWall(tiles, 10, 11);

    const quads = walls(tiles, viewAt({ x: 10.5, y: 10.5 }));

    // Only the southern wall's south face; the shared edge is hidden.
    expect(quads.map(fileOf)).toEqual(["top", "side", "top"]);
  });

  it("shows faces looking out past the edge of the map", () => {
    const tiles = createTiles(20, 20);
    // Bottom row: its south neighbour is outside the map.
    setWall(tiles, 10, 19);

    const quads = walls(tiles, viewAt({ x: 10.5, y: 18.5 }));

    expect(quads.map(fileOf)).toEqual(["side", "top"]);
  });

  it("draws walls higher on screen first so nearer ones cover them", () => {
    const tiles = createTiles(20, 20);
    setWall(tiles, 9, 9);
    setWall(tiles, 12, 11);
    // Turned around, so the wall farther south is higher on screen, the
    // opposite of the map's row order.
    const view = viewAt({ x: 10.5, y: 10.5 }, Math.PI);

    const tops = walls(tiles, view).filter((q) => fileOf(q) === "top");

    const topLeftOf = (x: number, y: number) =>
      lifted(worldToScreen(view, { x, y }));
    // Texture top-left sits at the tile's world top-left corner.
    expect(tops[0].corners[0].x).toBeCloseTo(topLeftOf(12, 11).x);
    expect(tops[1].corners[0].x).toBeCloseTo(topLeftOf(9, 9).x);
  });

  it("includes walls just off the bottom of the screen whose top reaches in", () => {
    const tiles = createTiles(30, 30);
    // Visible y runs 7.5..12.5; this wall's face and top cover 12..14.
    setWall(tiles, 10, 13);
    setWall(tiles, 10, 25);

    const quads = walls(tiles, viewAt({ x: 10, y: 10 }));

    expect(quads.map(fileOf)).toEqual(["side", "top"]);
  });
});

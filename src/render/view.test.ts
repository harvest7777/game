import { describe, expect, it } from "vitest";
import { addControllable } from "../ecs/bundles";
import { createCamera } from "../ecs/camera/resource";
import { Action } from "../ecs/input/actions";
import { playerInputSystem } from "../ecs/input/system";
import type { Vec2 } from "../ecs/shared/physics/math";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import {
  createView,
  depthOf,
  screenToWorld,
  TILE_PIXELS,
  visibleWorldRect,
  worldToScreen,
  type View,
} from "./view";

const WIDTH = 800;
const HEIGHT = 600;
const CENTER = { x: 10, y: 10 };

function view(changes: Partial<ReturnType<typeof createCamera>> = {}, dpr = 1) {
  const camera = { ...createCamera(), ...changes };
  return createView(camera, CENTER, WIDTH, HEIGHT, dpr);
}

function expectPoint(actual: Vec2, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

// Screen position of the world point one tile from CENTER along (dx, dy).
function oneTile(v: View, dx: number, dy: number) {
  return worldToScreen(v, { x: CENTER.x + dx, y: CENTER.y + dy });
}

describe("worldToScreen", () => {
  it("puts the camera center in the middle of the screen", () => {
    expectPoint(worldToScreen(view(), CENTER), WIDTH / 2, HEIGHT / 2);
  });

  it("matches the screen when unrotated: +x right, +y down", () => {
    const v = view();
    expectPoint(oneTile(v, 1, 0), WIDTH / 2 + TILE_PIXELS, HEIGHT / 2);
    expectPoint(oneTile(v, 0, 1), WIDTH / 2, HEIGHT / 2 + TILE_PIXELS);
  });

  it("shows world +x at the top of the screen at angle π/2", () => {
    const v = view({ angle: Math.PI / 2 });
    expectPoint(oneTile(v, 1, 0), WIDTH / 2, HEIGHT / 2 - TILE_PIXELS);
    // World up (-y) is now on the left.
    expectPoint(oneTile(v, 0, -1), WIDTH / 2 - TILE_PIXELS, HEIGHT / 2);
  });

  it("scales distances by zoom", () => {
    const v = view({ zoom: 2 });
    expectPoint(oneTile(v, 1, 0), WIDTH / 2 + 2 * TILE_PIXELS, HEIGHT / 2);
  });

  it("scales distances by devicePixelRatio", () => {
    const v = view({}, 2);
    expectPoint(oneTile(v, 1, 0), WIDTH / 2 + 2 * TILE_PIXELS, HEIGHT / 2);
  });

  it("moves the camera center by the focus offset", () => {
    const v = view({ focusOffset: { x: 0, y: 0.25 } });
    expectPoint(worldToScreen(v, CENTER), WIDTH / 2, HEIGHT / 2 + HEIGHT / 4);
  });
});

describe("screenToWorld", () => {
  it("undoes worldToScreen for any rotation, zoom and offset", () => {
    const v = view({
      angle: 1.234,
      zoom: 0.37,
      focusOffset: { x: -0.1, y: 0.3 },
    });
    for (const p of [
      { x: 0, y: 0 },
      { x: 13.5, y: -2.25 },
      { x: -40, y: 99 },
    ]) {
      expectPoint(screenToWorld(v, worldToScreen(v, p)), p.x, p.y);
    }
  });
});

describe("visibleWorldRect", () => {
  it("is exactly the screen when unrotated", () => {
    const rect = visibleWorldRect(view());
    const halfW = WIDTH / 2 / TILE_PIXELS;
    const halfH = HEIGHT / 2 / TILE_PIXELS;
    expect(rect.minX).toBeCloseTo(CENTER.x - halfW);
    expect(rect.maxX).toBeCloseTo(CENTER.x + halfW);
    expect(rect.minY).toBeCloseTo(CENTER.y - halfH);
    expect(rect.maxY).toBeCloseTo(CENTER.y + halfH);
  });

  it("covers more of the world when zoomed out", () => {
    const normal = visibleWorldRect(view());
    const zoomedOut = visibleWorldRect(view({ zoom: 0.25 }));
    expect(zoomedOut.maxX - zoomedOut.minX).toBeCloseTo(
      4 * (normal.maxX - normal.minX),
    );
  });

  it("contains every screen corner when rotated", () => {
    const v = view({ angle: Math.PI / 5, focusOffset: { x: 0.2, y: -0.1 } });
    const rect = visibleWorldRect(v);
    for (const corner of [
      { x: 0, y: 0 },
      { x: WIDTH, y: 0 },
      { x: 0, y: HEIGHT },
      { x: WIDTH, y: HEIGHT },
    ]) {
      const p = screenToWorld(v, corner);
      expect(p.x).toBeGreaterThanOrEqual(rect.minX - 1e-9);
      expect(p.x).toBeLessThanOrEqual(rect.maxX + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(rect.minY - 1e-9);
      expect(p.y).toBeLessThanOrEqual(rect.maxY + 1e-9);
    }
  });
});

describe("depthOf", () => {
  it("is nearer (smaller) lower on the screen", () => {
    const v = view();
    expect(depthOf(v, 400)).toBeLessThan(depthOf(v, 100));
  });

  it("stays in 0..1 and keeps order across the whole screen", () => {
    const v = view();
    const ys = [-HEIGHT, 0, HEIGHT / 2, HEIGHT, 2 * HEIGHT];
    const depths = ys.map((y) => depthOf(v, y));
    for (const d of depths) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(1);
    }
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeLessThan(depths[i - 1]);
    }
  });

  it("clamps far off screen", () => {
    const v = view();
    expect(depthOf(v, -100 * HEIGHT)).toBe(1);
    expect(depthOf(v, 100 * HEIGHT)).toBe(0);
  });
});

describe("agreement with player input", () => {
  // Movement keys are screen-relative, so the velocity input produces must
  // point that way on screen once the view draws it, at any camera angle.
  function screenDirectionOf(action: Action, angle: number): Vec2 {
    const world = createWorld(createTiles(1, 1));
    world.camera.angle = angle;
    world.input.held = new Set([action]);
    const player = spawn(world);
    addControllable(world, player, { moveSpeed: 1 });
    playerInputSystem(world, 1);
    const velocity = world.components.velocity.get(player)!;

    const v = createView(world.camera, CENTER, WIDTH, HEIGHT);
    const from = worldToScreen(v, CENTER);
    const to = worldToScreen(v, {
      x: CENTER.x + velocity.x,
      y: CENTER.y + velocity.y,
    });
    return {
      x: (to.x - from.x) / TILE_PIXELS,
      y: (to.y - from.y) / TILE_PIXELS,
    };
  }

  for (const angle of [0, 0.7, Math.PI / 2, 2.5, 4]) {
    it(`Up is screen up and Right is screen right at angle ${angle}`, () => {
      expectPoint(screenDirectionOf(Action.Up, angle), 0, -1);
      expectPoint(screenDirectionOf(Action.Right, angle), 1, 0);
    });
  }
});

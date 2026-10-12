import { describe, expect, it } from "vitest";
import { addSprite } from "../ecs/bundles";
import { createCamera } from "../ecs/camera/resource";
import type { Vec2 } from "../ecs/shared/physics/math";
import type { Sprite, SpriteLayer } from "../ecs/sprite/components";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn, type Entity, type World } from "../ecs/world";
import type { Art } from "./art";
import type { Manifest } from "./assets";
import { QuadBuffer, readQuads, type Quad } from "./quads";
import {
  interpolatedPosition,
  OUTLINE_THICKNESS,
  pushSprites,
  WALK_FPS,
} from "./sprites";
import { createView, TILE_PIXELS, worldToScreen, type View } from "./view";

const frames = (facing: string) => [0, 1, 2].map((i) => `${facing}-${i}`);
const manifest: Manifest = {
  sprites: {
    hero: {
      kind: "walker",
      front: frames("front"),
      back: frames("back"),
      side: frames("side"),
      attack: {
        front: frames("front-attack"),
        back: frames("back-attack"),
        side: frames("side-attack"),
      },
    },
    plainWalker: {
      kind: "walker",
      front: frames("front"),
      back: frames("back"),
      side: frames("side"),
    },
    orb: { kind: "static", file: "orb" },
  },
  fonts: { bold: {}, regular: {} },
  ground: {},
  walls: { top: "top", side: "side" },
};
const files = [
  ...frames("front"),
  ...frames("back"),
  ...frames("side"),
  ...frames("front-attack"),
  ...frames("back-attack"),
  ...frames("side-attack"),
  "orb",
  "top",
  "side",
];
// Each file gets its own x so a quad's region says which file it is.
const art: Art = {
  manifest,
  regions: new Map(files.map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }])),
  glyphs: new Map(),
};
const fileOf = (q: Quad) => files[q.region.x / 10];

const SIZE = 400;
const CENTER = { x: 10, y: 10 };

function setup(angle = 0) {
  const world = createWorld(createTiles(20, 20));
  const view = createView({ ...createCamera(), angle }, CENTER, SIZE, SIZE);
  return { world, view };
}

function addAt(
  world: World,
  at: Vec2,
  sprite: Partial<Sprite> = {},
  facing?: Vec2,
): Entity {
  const e = spawn(world);
  world.components.position.set(e, { ...at });
  addSprite(world, e, { name: "hero", layer: "player", ...sprite });
  if (facing) world.components.facing.set(e, facing);
  return e;
}

function draw(world: World, view: View, alpha = 1, time = 0): Quad[] {
  const out = new QuadBuffer();
  pushSprites(out, world, view, art, alpha, time);
  return readQuads(out);
}

describe("interpolatedPosition", () => {
  function moved() {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    world.components.previousPosition.set(e, { x: 0, y: 0 });
    world.components.position.set(e, { x: 2, y: 4 });
    return { world, e };
  }

  it("is the previous tick's position at alpha 0", () => {
    const { world, e } = moved();
    expect(interpolatedPosition(world, e, 0)).toEqual({ x: 0, y: 0 });
  });

  it("is the latest position at alpha 1", () => {
    const { world, e } = moved();
    expect(interpolatedPosition(world, e, 1)).toEqual({ x: 2, y: 4 });
  });

  it("is in between for alpha in between", () => {
    const { world, e } = moved();
    expect(interpolatedPosition(world, e, 0.25)).toEqual({ x: 0.5, y: 1 });
  });

  it("is the current position for an entity that hasn't moved yet", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    world.components.position.set(e, { x: 3, y: 3 });
    expect(interpolatedPosition(world, e, 0)).toEqual({ x: 3, y: 3 });
  });
});

describe("pushSprites", () => {
  describe("placement", () => {
    it("draws a one-tile square centered on the entity, upright when rotated", () => {
      const { world, view } = setup(0.8);
      const at = { x: 11, y: 9 };
      addAt(world, at);

      const [quad] = draw(world, view);

      const c = worldToScreen(view, at);
      const h = TILE_PIXELS / 2;
      const expected = [
        { x: c.x - h, y: c.y - h },
        { x: c.x + h, y: c.y - h },
        { x: c.x + h, y: c.y + h },
        { x: c.x - h, y: c.y + h },
      ];
      quad.corners.forEach((corner, i) => {
        expect(corner.x).toBeCloseTo(expected[i].x, 3);
        expect(corner.y).toBeCloseTo(expected[i].y, 3);
      });
    });

    it("draws at the interpolated position", () => {
      const { world, view } = setup();
      const e = addAt(world, { x: 12, y: 10 });
      world.components.previousPosition.set(e, { x: 10, y: 10 });

      const [quad] = draw(world, view, 0.5);

      const middle = (quad.corners[0].x + quad.corners[1].x) / 2;
      expect(middle).toBeCloseTo(worldToScreen(view, { x: 11, y: 10 }).x);
    });

    it("skips sprites entirely off screen", () => {
      const { world, view } = setup();
      // Screen shows 5..15; this is far to the right.
      addAt(world, { x: 30, y: 10 });
      expect(draw(world, view)).toHaveLength(0);
    });

    it("keeps sprites partly on screen", () => {
      const { world, view } = setup();
      // Center just past the right edge (x = 15), half the sprite still shows.
      addAt(world, { x: 15.3, y: 10 });
      expect(draw(world, view)).toHaveLength(1);
    });
  });

  describe("rotation", () => {
    // Static art 8 sprite pixels wide = one tile; corners as offsets from
    // the sprite's center on screen.
    function cornerOffsets(angle: number, cameraAngle = 0, previous = angle) {
      const { world, view } = setup(cameraAngle);
      const e = addAt(world, CENTER, { name: "orb", layer: "projectile" });
      world.components.rotation.set(e, { angle, previous });
      const [quad] = draw(world, view, 0.5);
      const c = worldToScreen(view, CENTER);
      return quad.corners.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
    }

    function expectOffsets(actual: Vec2[], expected: [number, number][]) {
      const h = TILE_PIXELS / 2;
      actual.forEach((p, i) => {
        expect(p.x, `corner ${i} x`).toBeCloseTo(expected[i][0] * h, 3);
        expect(p.y, `corner ${i} y`).toBeCloseTo(expected[i][1] * h, 3);
      });
    }

    it("leaves art pointing right at angle 0", () => {
      expectOffsets(cornerOffsets(0), [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]);
    });

    it("points the art's right side down the screen at world +y", () => {
      // Top-left of the art swings to the top-right.
      expectOffsets(cornerOffsets(Math.PI / 2), [
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ]);
    });

    it("turns with the camera", () => {
      // World +y with the camera at π/2 is screen-right, so no turn on screen.
      expectOffsets(cornerOffsets(Math.PI / 2, Math.PI / 2), [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]);
    });

    it("turns smoothly between ticks", () => {
      // Halfway from 0 to π is π/2.
      expectOffsets(cornerOffsets(Math.PI - 1e-9, 0, 0), [
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ]);
    });

    it("isn't culled while a turned corner is still on screen", () => {
      const { world, view } = setup();
      // Screen shows 5..15; the center is past the right edge by more than
      // half a tile but less than half the diagonal.
      const e = addAt(world, { x: 15.6, y: 10 }, { name: "orb" });
      world.components.rotation.set(e, {
        angle: Math.PI / 4,
        previous: Math.PI / 4,
      });
      expect(draw(world, view)).toHaveLength(1);
    });
  });

  describe("scale", () => {
    it("draws the art at its scale, outline included", () => {
      const { world, view } = setup();
      addAt(world, CENTER, {
        name: "orb",
        scale: 0.8,
        outline: { color: [0, 0, 0, 1] },
      });

      const [quad] = draw(world, view);

      const pixel = (TILE_PIXELS / 8) * 0.8;
      const width = quad.corners[1].x - quad.corners[0].x;
      expect(width).toBeCloseTo((8 + 2 * OUTLINE_THICKNESS) * pixel, 3);
    });

    it("stays centered on the entity", () => {
      const { world, view } = setup();
      addAt(world, { x: 11, y: 9 }, { name: "orb", scale: 0.5 });

      const [quad] = draw(world, view);

      const c = worldToScreen(view, { x: 11, y: 9 });
      expect((quad.corners[0].x + quad.corners[2].x) / 2).toBeCloseTo(c.x, 3);
      expect((quad.corners[0].y + quad.corners[2].y) / 2).toBeCloseTo(c.y, 3);
    });
  });

  describe("outline", () => {
    it("grows the quad by the outline thickness and carries its color", () => {
      const { world, view } = setup();
      addAt(world, CENTER, { outline: { color: [1, 0, 0, 1] } });

      const [quad] = draw(world, view);

      const pixel = TILE_PIXELS / 8;
      const width = quad.corners[1].x - quad.corners[0].x;
      expect(width).toBeCloseTo((8 + 2 * OUTLINE_THICKNESS) * pixel);
      expect(quad.margin).toBeCloseTo(OUTLINE_THICKNESS);
      expect(quad.outline).toEqual([1, 0, 0, 1]);
    });

    it("grows the quad by the glow radius when that's larger", () => {
      const { world, view } = setup();
      addAt(world, CENTER, {
        outline: { color: [1, 1, 0, 1], glow: { radius: 2, pulseHz: 1 } },
      });

      const [quad] = draw(world, view);

      expect(quad.margin).toBe(2);
      expect(quad.glowRadius).toBe(2);
      expect(quad.glowPulseHz).toBe(1);
    });

    it("has no margin or outline without one", () => {
      const { world, view } = setup();
      addAt(world, CENTER);

      const [quad] = draw(world, view);

      expect(quad.margin).toBe(0);
      expect(quad.outline[3]).toBe(0);
    });
  });

  describe("draw order", () => {
    it("draws enemies, then projectiles, then the player on top", () => {
      const { world, view } = setup();
      const layers: SpriteLayer[] = ["player", "projectile", "enemy"];
      // Player is highest on screen, which would otherwise put it first.
      layers.forEach((layer, i) =>
        addAt(world, { x: 10, y: 9 + i }, { name: "orb", layer }),
      );

      const ys = draw(world, view).map((q) => q.corners[0].y);

      // Enemy (lowest) first, player (highest) last.
      expect(ys[0]).toBeGreaterThan(ys[1]);
      expect(ys[1]).toBeGreaterThan(ys[2]);
    });

    it("draws lower sprites over higher ones within a layer", () => {
      const { world, view } = setup();
      addAt(world, { x: 10, y: 11 }, { name: "orb", layer: "enemy" });
      addAt(world, { x: 10, y: 9 }, { name: "orb", layer: "enemy" });

      const ys = draw(world, view).map((q) => q.corners[0].y);

      expect(ys[0]).toBeLessThan(ys[1]);
    });
  });

  describe("walk cycle", () => {
    const faceOf = (world: World, view: View, facing: Vec2) => {
      addAt(world, CENTER, {}, facing);
      const [quad] = draw(world, view);
      return { file: fileOf(quad), flipX: quad.flipX };
    };

    it("stands facing the viewer by default", () => {
      const { world, view } = setup();
      addAt(world, CENTER);
      expect(fileOf(draw(world, view)[0])).toBe("front-0");
    });

    it("shows its back when facing up the screen", () => {
      const { world, view } = setup();
      expect(faceOf(world, view, { x: 0, y: -1 })).toEqual({
        file: "back-0",
        flipX: false,
      });
    });

    it("shows its side facing right, and mirrored facing left", () => {
      const right = setup();
      expect(faceOf(right.world, right.view, { x: 1, y: 0 })).toEqual({
        file: "side-0",
        flipX: false,
      });
      const left = setup();
      expect(faceOf(left.world, left.view, { x: -1, y: 0 })).toEqual({
        file: "side-0",
        flipX: true,
      });
    });

    it("shows its side on diagonals", () => {
      const { world, view } = setup();
      expect(
        faceOf(world, view, { x: Math.SQRT1_2, y: Math.SQRT1_2 }).file,
      ).toBe("side-0");
    });

    it("turns with the camera: facing world east shows its back at π/2", () => {
      // The top of the screen faces world +x.
      const { world, view } = setup(Math.PI / 2);
      expect(faceOf(world, view, { x: 1, y: 0 }).file).toBe("back-0");
    });

    it("cycles step frames while moving", () => {
      const { world, view } = setup();
      const e = addAt(world, CENTER);
      world.components.velocity.set(e, { x: 0, y: 1 });
      const frameAt = (t: number) => fileOf(draw(world, view, 1, t)[0]);

      const step = 1 / WALK_FPS;
      expect([0, 1, 2, 3, 4].map((i) => frameAt(i * step + step / 2))).toEqual([
        "front-1",
        "front-0",
        "front-2",
        "front-0",
        "front-1",
      ]);
    });

    it("stands still when not moving", () => {
      const { world, view } = setup();
      const e = addAt(world, CENTER);
      world.components.velocity.set(e, { x: 0, y: 0 });
      expect(fileOf(draw(world, view, 1, 0.2)[0])).toBe("front-0");
    });

    describe("attacking", () => {
      // The bolt weapon fires 4 times a second: 0.25 s between shots, so
      // it thrusts while more than 0.125 s of cooldown is left.
      function shooting(cooldown: number, facing: Vec2, name = "hero") {
        const { world, view } = setup();
        const e = addAt(world, CENTER, { name }, facing);
        world.components.shooter.set(e, { weapon: "bolt", cooldown });
        return { world, view, e };
      }

      it("thrusts just after a shot", () => {
        const { world, view } = shooting(0.24, { x: 0, y: 1 });
        expect(fileOf(draw(world, view)[0])).toBe("front-attack-0");
      });

      it("pulls back for the second half of the interval", () => {
        const { world, view } = shooting(0.05, { x: 0, y: 1 });
        expect(fileOf(draw(world, view)[0])).toBe("front-0");
      });

      it("thrusts in every direction, mirrored to the left", () => {
        const left = shooting(0.24, { x: -1, y: 0 });
        const [quad] = draw(left.world, left.view);
        expect(fileOf(quad)).toBe("side-attack-0");
        expect(quad.flipX).toBe(true);

        const up = shooting(0.24, { x: 0, y: -1 });
        expect(fileOf(draw(up.world, up.view)[0])).toBe("back-attack-0");
      });

      it("keeps walking while it thrusts", () => {
        const { world, view, e } = shooting(0.24, { x: 1, y: 0 });
        world.components.velocity.set(e, { x: 1, y: 0 });
        const step = 1 / WALK_FPS;
        // First step frame of the walk cycle.
        expect(fileOf(draw(world, view, 1, step / 2)[0])).toBe("side-attack-1");
      });

      it("uses its normal frames when it has no attack art", () => {
        const { world, view } = shooting(0.24, { x: 0, y: 1 }, "plainWalker");
        expect(fileOf(draw(world, view)[0])).toBe("front-0");
      });
    });

    it("draws static art regardless of facing", () => {
      const { world, view } = setup();
      addAt(world, CENTER, { name: "orb" }, { x: -1, y: 0 });
      const [quad] = draw(world, view);
      expect(fileOf(quad)).toBe("orb");
      expect(quad.flipX).toBe(false);
    });
  });

  it("refuses a sprite name with no art", () => {
    const { world, view } = setup();
    addAt(world, CENTER, { name: "ghost" });
    expect(() => draw(world, view)).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { penetrationRectCircle } from "../shared/physics/geometry";
import type { Vec2 } from "../shared/physics/math";
import { createTiles, setWall, wallsInBox } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import type { WallResponse } from "./components";
import { movementSystem } from "./system";

type MoverOptions = {
  at: Vec2;
  velocity?: Vec2;
  r?: number;
  response?: WallResponse;
  solid?: boolean;
};

function addMover(world: World, options: MoverOptions): Entity {
  const entity = spawn(world);
  const { components } = world;
  components.position.set(entity, { ...options.at });
  components.velocity.set(entity, options.velocity ?? { x: 0, y: 0 });
  if (options.r !== undefined) components.hitbox.set(entity, { r: options.r });
  if (options.response) components.wallResponse.set(entity, options.response);
  if (options.solid) components.solid.set(entity, true);
  return entity;
}

function positionOf(world: World, entity: Entity): Vec2 {
  return world.components.position.get(entity)!;
}

// Deepest overlap between the entity's hitbox and any wall tile, 0 if none.
function wallOverlap(world: World, entity: Entity): number {
  const pos = positionOf(world, entity);
  const circle = world.components.hitbox.get(entity)!;
  let deepest = 0;
  const walls = wallsInBox(
    world.tiles,
    pos.x - circle.r,
    pos.y - circle.r,
    pos.x + circle.r,
    pos.y + circle.r,
  );
  for (const wall of walls) {
    const center = { x: wall.x + 0.5, y: wall.y + 0.5 };
    const pen = penetrationRectCircle({ w: 1, h: 1 }, center, circle, pos);
    if (pen) deepest = Math.max(deepest, pen.depth);
  }
  return deepest;
}

function wallColumn(world: World, x: number) {
  for (let y = 0; y < world.tiles.height; y++) setWall(world.tiles, x, y);
}

function wallRow(world: World, y: number) {
  for (let x = 0; x < world.tiles.width; x++) setWall(world.tiles, x, y);
}

describe("movementSystem", () => {
  describe("without a wall response", () => {
    it("moves by velocity * dt", () => {
      const world = createWorld(createTiles(10, 10));
      const e = addMover(world, {
        at: { x: 1, y: 1 },
        velocity: { x: 2, y: 3 },
      });

      movementSystem(world, 0.5);

      expect(positionOf(world, e)).toEqual({ x: 2, y: 2.5 });
    });

    it("passes straight through walls", () => {
      const world = createWorld(createTiles(10, 3));
      wallColumn(world, 5);
      const e = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: 6, y: 0 },
        r: 0.1,
      });

      movementSystem(world, 1);

      expect(positionOf(world, e).x).toBeCloseTo(8);
    });
  });

  it("records where each entity started the step", () => {
    const world = createWorld(createTiles(10, 10));
    const e = addMover(world, { at: { x: 1, y: 1 }, velocity: { x: 2, y: 0 } });

    movementSystem(world, 1);

    expect(world.components.previousPosition.get(e)).toEqual({ x: 1, y: 1 });
  });

  describe("with a stop response", () => {
    it("can't pass through a 1-tile wall at any speed", () => {
      const world = createWorld(createTiles(200, 3));
      setWall(world.tiles, 10, 1);
      const r = 0.1;
      const bullet = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: 1000, y: 0 },
        r,
        response: "stop",
      });

      movementSystem(world, 0.1);

      // Would travel 100 tiles unblocked; stops against the wall's face at x = 10.
      expect(positionOf(world, bullet).x).toBeCloseTo(10 - r, 3);
    });

    it("records the contact as blocked", () => {
      const world = createWorld(createTiles(20, 3));
      setWall(world.tiles, 10, 1);
      const r = 0.1;
      const speed = 100;
      const bullet = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: speed, y: 0 },
        r,
        response: "stop",
      });

      movementSystem(world, 0.1);

      const blocked = world.components.blocked.get(bullet);
      const distanceToFace = 10 - r - 2;
      expect(blocked?.t).toBeCloseTo(distanceToFace / speed);
      expect(blocked?.normal).toEqual({ x: -1, y: 0 });
    });

    it("clears blocked on a step with no contact", () => {
      const world = createWorld(createTiles(20, 3));
      setWall(world.tiles, 10, 1);
      const bullet = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: 100, y: 0 },
        r: 0.1,
        response: "stop",
      });
      movementSystem(world, 0.1);
      world.components.velocity.set(bullet, { x: -1, y: 0 });

      movementSystem(world, 0.1);

      expect(world.components.blocked.has(bullet)).toBe(false);
    });
  });

  describe("with a slide response", () => {
    it("slides along a wall instead of stopping", () => {
      const world = createWorld(createTiles(10, 10));
      wallColumn(world, 5);
      const r = 0.4;
      const player = addMover(world, {
        at: { x: 4, y: 2 },
        velocity: { x: 2, y: 2 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);

      // x stops at the wall face; y keeps its full 2 tiles of travel.
      const pos = positionOf(world, player);
      expect(pos.x).toBeCloseTo(5 - r, 3);
      expect(pos.y).toBeCloseTo(4, 3);
    });

    it("doesn't snag on seams while sliding along a wall made of many tiles", () => {
      const world = createWorld(createTiles(20, 10));
      wallRow(world, 5);
      const r = 0.5;
      const player = addMover(world, {
        at: { x: 1.5, y: 5 - r - 0.001 },
        velocity: { x: 5, y: 1 },
        r,
        response: "slide",
      });

      for (let i = 0; i < 10; i++) movementSystem(world, 0.1);

      // Pressing into the wall the whole time; 5 tiles of x across 5 seams.
      expect(positionOf(world, player).x).toBeCloseTo(6.5, 3);
      expect(wallOverlap(world, player)).toBe(0);
    });

    it("stops cleanly in an inside corner", () => {
      const world = createWorld(createTiles(10, 10));
      wallColumn(world, 5);
      wallRow(world, 5);
      const r = 0.5;
      const player = addMover(world, {
        at: { x: 3, y: 3 },
        velocity: { x: 10, y: 10 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);
      movementSystem(world, 1);

      const pos = positionOf(world, player);
      expect(pos.x).toBeCloseTo(5 - r, 3);
      expect(pos.y).toBeCloseTo(5 - r, 3);
    });

    it("can move away from a wall it's touching", () => {
      const world = createWorld(createTiles(10, 10));
      wallColumn(world, 5);
      const r = 0.4;
      const player = addMover(world, {
        at: { x: 5 - r, y: 2 },
        velocity: { x: -1, y: 0 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);

      expect(positionOf(world, player).x).toBeCloseTo(5 - r - 1, 3);
    });

    it("can't leave the map", () => {
      const world = createWorld(createTiles(5, 5));
      const r = 0.5;
      const player = addMover(world, {
        at: { x: 2.5, y: 2.5 },
        velocity: { x: -100, y: 0 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);

      expect(positionOf(world, player).x).toBeCloseTo(r, 3);
    });
  });

  describe("when starting inside a wall", () => {
    it("is pushed out the nearest side", () => {
      const world = createWorld(createTiles(10, 10));
      setWall(world.tiles, 5, 5);
      const r = 0.4;
      const player = addMover(world, {
        at: { x: 5.3, y: 5.5 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);

      // 0.3 from the left face, 0.7 from the right.
      expect(positionOf(world, player).x).toBeCloseTo(5 - r, 3);
      expect(wallOverlap(world, player)).toBe(0);
    });

    it("escapes from the middle of a thick wall", () => {
      const world = createWorld(createTiles(10, 10));
      for (let y = 3; y <= 6; y++) {
        for (let x = 3; x <= 6; x++) setWall(world.tiles, x, y);
      }
      const player = addMover(world, {
        at: { x: 4.5, y: 4.4 },
        r: 0.4,
        response: "slide",
      });

      movementSystem(world, 1);

      expect(wallOverlap(world, player)).toBe(0);
    });
  });

  describe("solid entities", () => {
    it("block movers like walls do", () => {
      const world = createWorld(createTiles(10, 3));
      const r = 0.5;
      addMover(world, { at: { x: 5, y: 1.5 }, r, solid: true });
      const player = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: 10, y: 0 },
        r,
        response: "slide",
      });

      movementSystem(world, 1);

      // Stops when the two radii touch.
      expect(positionOf(world, player).x).toBeCloseTo(5 - 2 * r, 3);
    });

    it("push movers out of the way when they move into them", () => {
      const world = createWorld(createTiles(10, 3));
      const r = 0.5;
      const enemy = addMover(world, {
        at: { x: 3, y: 1.5 },
        velocity: { x: 1, y: 0 },
        r,
        response: "slide",
        solid: true,
      });
      const player = addMover(world, {
        at: { x: 4.2, y: 1.5 },
        r,
        response: "slide",
      });

      movementSystem(world, 0.5);

      const gap = positionOf(world, player).x - positionOf(world, enemy).x;
      expect(gap).toBeGreaterThanOrEqual(2 * r);
    });

    it("don't block themselves", () => {
      const world = createWorld(createTiles(10, 3));
      const enemy = addMover(world, {
        at: { x: 2, y: 1.5 },
        velocity: { x: 1, y: 0 },
        r: 0.5,
        response: "slide",
        solid: true,
      });

      movementSystem(world, 1);

      expect(positionOf(world, enemy).x).toBeCloseTo(3);
    });
  });
});

import { describe, expect, it } from "vitest";
import { cleanupSystem } from "../cleanup";
import { movementSystem } from "../movement/system";
import { createTiles, setWall } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import { testProjectile } from "../../testing/defs";
import type { ProjectileDef } from "./definitions";
import { pathPoint } from "./path";
import { fireProjectile } from "./spawn";
import { projectileSystem } from "./system";
import { projectileWallHitSystem } from "./walls";

const DT = 0.05;
const FROM = { x: 2.5, y: 10.5 };
const RIGHT = { x: 1, y: 0 };

// 12 tiles/s for 0.6 s.
const BOLT = testProjectile({ speed: 12, lifetime: 0.6 });

function setup(def: ProjectileDef) {
  const world = createWorld(createTiles(40, 21));
  const owner = spawn(world);
  const entity = fireProjectile(world, {
    def,
    owner,
    team: "player",
    at: FROM,
    toward: RIGHT,
  });
  return { world, entity };
}

// The part of a tick that matters to projectiles.
function step(world: World, ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    projectileSystem(world, DT);
    movementSystem(world, DT);
    projectileWallHitSystem(world, DT);
    cleanupSystem(world, DT);
  }
}

function alive(world: World, entity: Entity) {
  return world.components.projectile.has(entity);
}

describe("projectileSystem", () => {
  it("follows its path tick by tick", () => {
    const paths = {
      straight: BOLT,
      wavy: testProjectile({ wave: { amplitude: 0.5, frequency: 2 } }),
      spiral: testProjectile({ speed: 6, turnRate: Math.PI }),
      accelerating: testProjectile({ acceleration: 40, maxSpeed: 20 }),
    };
    for (const [name, def] of Object.entries(paths)) {
      const { world, entity } = setup(def);

      step(world, 8);

      const expected = pathPoint(def, FROM, RIGHT, 8 * DT);
      const actual = world.components.position.get(entity)!;
      expect(actual.x, `${name} x`).toBeCloseTo(expected.x, 4);
      expect(actual.y, `${name} y`).toBeCloseTo(expected.y, 4);
    }
  });

  it("ages each tick", () => {
    const { world, entity } = setup(BOLT);
    step(world, 3);
    expect(world.components.projectile.get(entity)!.age).toBeCloseTo(3 * DT);
  });

  it("is removed once its lifetime is up", () => {
    const { world, entity } = setup(BOLT);
    // 0.6 s lifetime is 12 ticks; it's removed on the tick after.
    step(world, 12);
    expect(alive(world, entity)).toBe(true);
    step(world, 1);
    expect(alive(world, entity)).toBe(false);
    expect(world.components.position.has(entity)).toBe(false);
  });

  it("never travels past its range when ticks don't divide its lifetime", () => {
    const { world, entity } = setup(BOLT);
    const { speed, lifetime } = BOLT;

    // 0.25 s ticks: the third would run to 0.75 s, past the 0.6 s lifetime.
    for (let i = 0; i < 3; i++) {
      projectileSystem(world, 0.25);
      movementSystem(world, 0.25);
    }

    const at = world.components.position.get(entity)!;
    expect(at.x).toBeCloseTo(FROM.x + speed * lifetime, 4);
  });

  it("ends a boomerang back where it was fired", () => {
    const { world, entity } = setup(
      testProjectile({ lifetime: 1.2, boomerang: true }),
    );
    // 1.2 s lifetime is 24 ticks.
    step(world, 24);
    const at = world.components.position.get(entity)!;
    expect(at.x).toBeCloseTo(FROM.x, 4);
    expect(at.y).toBeCloseTo(FROM.y, 4);
  });

  describe("walls", () => {
    it("stops at a wall and is removed", () => {
      const { world, entity } = setup(BOLT);
      setWall(world.tiles, 5, 10);

      let ticks = 0;
      while (!world.components.blocked.has(entity) && ticks < 20) {
        projectileSystem(world, DT);
        movementSystem(world, DT);
        ticks++;
      }

      // Stopped against the wall's face, not inside or past it.
      const at = world.components.position.get(entity)!;
      expect(at.x).toBeCloseTo(5 - BOLT.hitbox.r, 3);
      expect(alive(world, entity)).toBe(true);
      projectileWallHitSystem(world, DT);
      cleanupSystem(world, DT);
      expect(alive(world, entity)).toBe(false);
    });

    it("can't skip a wall however fast it goes", () => {
      // 40 tiles/s covers 2 tiles a tick.
      const { world, entity } = setup(
        testProjectile({ speed: 40, hitbox: { r: 0.12 } }),
      );
      setWall(world.tiles, 4, 10);

      let furthest = 0;
      for (let i = 0; i < 10 && alive(world, entity); i++) {
        step(world);
        const at = world.components.position.get(entity);
        if (at) furthest = Math.max(furthest, at.x);
      }

      expect(furthest).toBeLessThanOrEqual(4);
      expect(alive(world, entity)).toBe(false);
    });

    it("flies through walls when it passes them", () => {
      const { world, entity } = setup(testProjectile({ walls: "pass" }));
      setWall(world.tiles, 4, 10);

      step(world, 10);

      expect(world.components.position.get(entity)!.x).toBeGreaterThan(5);
    });

    it("skids along a wall when it slides", () => {
      const { world, entity } = setup(testProjectile({ walls: "slide" }));
      setWall(world.tiles, 4, 10);

      step(world, 5);

      expect(alive(world, entity)).toBe(true);
    });
  });

  describe("rotation", () => {
    it("points along its path when it faces its direction", () => {
      // A quarter wave in, a tight wave has turned well off straight.
      const { world, entity } = setup(
        testProjectile({
          wave: { amplitude: 0.25, frequency: 6 },
          faceDirection: true,
        }),
      );

      step(world, 1);

      const turn = world.components.rotation.get(entity)!;
      const v = world.components.velocity.get(entity)!;
      expect(turn.angle).toBeCloseTo(Math.atan2(v.y, v.x));
      expect(turn.angle).not.toBeCloseTo(0);
    });

    it("spins at its spin rate, remembering last tick's angle", () => {
      const spin = 3 * Math.PI;
      const { world, entity } = setup(testProjectile({ spin }));

      step(world, 2);

      const turn = world.components.rotation.get(entity)!;
      expect(turn.angle).toBeCloseTo(2 * spin * DT);
      expect(turn.previous).toBeCloseTo(spin * DT);
    });
  });
});

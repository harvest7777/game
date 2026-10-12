import { describe, expect, it } from "vitest";
import { testProjectile } from "../../testing/defs";
import type { ProjectileDef } from "../projectile/definitions";
import { fireProjectile } from "../projectile/spawn";
import type { Team } from "../projectile/components";
import type { Vec2 } from "../shared/physics/math";
import { createTiles } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import { hitSystem } from "./hits";

const PIERCING = testProjectile({ pierces: true });

function setup(random = () => 0) {
  const world = createWorld(createTiles(40, 40), random);
  const owner = spawn(world);
  return { world, owner };
}

// A projectile that moved `from` → `to` this tick.
function shot(
  world: World,
  owner: Entity,
  from: Vec2,
  to: Vec2,
  def: ProjectileDef = testProjectile(),
  team: Team = "player",
): Entity {
  const e = fireProjectile(world, {
    def,
    owner,
    team,
    at: from,
    toward: { x: 1, y: 0 },
  });
  world.components.previousPosition.set(e, { ...from });
  world.components.position.set(e, { ...to });
  return e;
}

// Something with health that moved `from` → `to` this tick.
function target(
  world: World,
  from: Vec2,
  to: Vec2 = from,
  team: Team = "enemy",
): Entity {
  const e = spawn(world);
  const c = world.components;
  c.previousPosition.set(e, { ...from });
  c.position.set(e, { ...to });
  c.hitbox.set(e, { r: 0.4 });
  c.health.set(e, { hp: 100, max: 100 });
  c.team.set(e, team);
  return e;
}

function targetsHit(world: World) {
  return world.events.hits.map((h) => h.target);
}

describe("hitSystem", () => {
  it("hits something on the other team it passes through", () => {
    const { world, owner } = setup();
    const enemy = target(world, { x: 10, y: 10 });
    const bolt = shot(world, owner, { x: 8, y: 10 }, { x: 9.8, y: 10 });

    hitSystem(world, 0.05);

    expect(world.events.hits).toEqual([
      expect.objectContaining({ projectile: bolt, target: enemy, owner }),
    ]);
  });

  it("can't skip through a target in one big step", () => {
    const { world, owner } = setup();
    const enemy = target(world, { x: 10, y: 10 });
    shot(world, owner, { x: 2, y: 10 }, { x: 30, y: 10 });

    hitSystem(world, 0.05);

    expect(targetsHit(world)).toEqual([enemy]);
  });

  it("hits a target that steps across its path", () => {
    const { world, owner } = setup();
    // Both move this tick and cross in the middle; neither end overlaps.
    const enemy = target(world, { x: 10, y: 8 }, { x: 10, y: 12 });
    shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 });

    hitSystem(world, 0.05);

    expect(targetsHit(world)).toEqual([enemy]);
  });

  it("misses what it doesn't touch", () => {
    const { world, owner } = setup();
    target(world, { x: 10, y: 12 });
    shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 });

    hitSystem(world, 0.05);

    expect(world.events.hits).toHaveLength(0);
  });

  it("doesn't hit its own team", () => {
    const { world, owner } = setup();
    target(world, { x: 10, y: 10 }, undefined, "player");
    shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 });

    hitSystem(world, 0.05);

    expect(world.events.hits).toHaveLength(0);
  });

  it("ignores things without health", () => {
    const { world, owner } = setup();
    const wallish = target(world, { x: 10, y: 10 });
    world.components.health.delete(wallish);
    shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 });

    hitSystem(world, 0.05);

    expect(world.events.hits).toHaveLength(0);
  });

  describe("without piercing", () => {
    it("hits only the first target it reached and is removed", () => {
      const { world, owner } = setup();
      const far = target(world, { x: 14, y: 10 });
      const near = target(world, { x: 10, y: 10 });
      const bolt = shot(world, owner, { x: 8, y: 10 }, { x: 16, y: 10 });

      hitSystem(world, 0.05);

      expect(targetsHit(world)).toEqual([near]);
      expect(targetsHit(world)).not.toContain(far);
      expect(world.events.despawns).toEqual([bolt]);
    });
  });

  describe("with piercing", () => {
    it("hits everything it passes through and keeps going", () => {
      const { world, owner } = setup();
      const far = target(world, { x: 14, y: 10 });
      const near = target(world, { x: 10, y: 10 });
      shot(world, owner, { x: 8, y: 10 }, { x: 16, y: 10 }, PIERCING);

      hitSystem(world, 0.05);

      expect(targetsHit(world)).toEqual([near, far]);
      expect(world.events.despawns).toHaveLength(0);
    });

    it("hits each thing once over its whole flight", () => {
      const { world, owner } = setup();
      target(world, { x: 10, y: 10 });
      const lance = shot(
        world,
        owner,
        { x: 9, y: 10 },
        { x: 9.8, y: 10 },
        PIERCING,
      );

      hitSystem(world, 0.05);
      world.events.hits.length = 0;
      world.components.previousPosition.set(lance, { x: 9.8, y: 10 });
      world.components.position.set(lance, { x: 10.6, y: 10 });
      hitSystem(world, 0.05);

      expect(world.events.hits).toHaveLength(0);
    });
  });

  describe("damage roll", () => {
    const BOLT = testProjectile({ damage: [20, 30] });

    it("is the minimum at the bottom of the random range", () => {
      const { world, owner } = setup(() => 0);
      target(world, { x: 10, y: 10 });
      shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 }, BOLT);
      hitSystem(world, 0.05);
      expect(world.events.hits[0].damage).toBe(20);
    });

    it("is the maximum at the top of the random range", () => {
      const { world, owner } = setup(() => 0.9999);
      target(world, { x: 10, y: 10 });
      shot(world, owner, { x: 8, y: 10 }, { x: 12, y: 10 }, BOLT);
      hitSystem(world, 0.05);
      expect(world.events.hits[0].damage).toBe(30);
    });
  });
});

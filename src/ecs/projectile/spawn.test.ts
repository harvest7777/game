import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { testProjectile } from "../../testing/defs";
import { DEFAULT_PROJECTILE_SCALE, type ProjectileDef } from "./definitions";
import { fireProjectile, type FireOptions } from "./spawn";

const BOLT = testProjectile({ faceDirection: true });
const GHOST = testProjectile({
  walls: "pass",
  hitbox: { r: 0.2 },
  sprite: {
    art: { kind: "static", file: "orb" },
    outline: { color: [0.6, 0.9, 1, 1] },
  },
});

function fire(def: ProjectileDef, changes: Partial<FireOptions> = {}) {
  const world = createWorld(createTiles(20, 20));
  const owner = spawn(world);
  const entity = fireProjectile(world, {
    def,
    owner,
    team: "player",
    at: { x: 5, y: 6 },
    toward: { x: 0, y: 3 },
    ...changes,
  });
  return { world, owner, entity, c: world.components };
}

describe("fireProjectile", () => {
  it("records what was fired, by whom, from where and which way", () => {
    const { owner, entity, c } = fire(BOLT);

    expect(c.projectile.get(entity)).toEqual({
      def: BOLT,
      owner,
      team: "player",
      origin: { x: 5, y: 6 },
      direction: { x: 0, y: 1 },
      age: 0,
      struck: [],
      damageScale: 1,
      mirror: false,
    });
  });

  it("is a movable on the projectile layer with the definition's hitbox", () => {
    const { entity, c } = fire(BOLT);

    expect(c.position.get(entity)).toEqual({ x: 5, y: 6 });
    expect(c.velocity.get(entity)).toEqual({ x: 0, y: 0 });
    expect(c.hitbox.get(entity)).toEqual(BOLT.hitbox);
    expect(c.sprite.get(entity)).toEqual({
      art: BOLT.sprite.art,
      layer: "projectile",
      scale: DEFAULT_PROJECTILE_SCALE,
    });
  });

  it("draws at 80% by default but keeps the definition's hitbox", () => {
    const { entity, c } = fire(BOLT);
    expect(DEFAULT_PROJECTILE_SCALE).toBe(0.8);
    expect(c.sprite.get(entity)!.scale).toBe(0.8);
    expect(c.hitbox.get(entity)).toEqual(BOLT.hitbox);
  });

  it("stops at walls by default", () => {
    const { entity, c } = fire(BOLT);
    expect(c.wallResponse.get(entity)).toBe("stop");
  });

  it("passes through walls when its definition says so", () => {
    const { entity, c } = fire(GHOST);
    expect(c.wallResponse.has(entity)).toBe(false);
  });

  it("slides along walls when its definition says so", () => {
    const { entity, c } = fire(testProjectile({ walls: "slide" }));
    expect(c.wallResponse.get(entity)).toBe("slide");
  });

  it("points rotating sprites the way they were fired", () => {
    const { entity, c } = fire(BOLT);
    expect(c.rotation.get(entity)!.angle).toBeCloseTo(Math.PI / 2);
  });

  it("leaves sprites upright when they neither face their path nor spin", () => {
    const { entity, c } = fire(testProjectile());
    expect(c.rotation.has(entity)).toBe(false);
  });

  it("doesn't share the definition's objects", () => {
    const { entity, c } = fire(GHOST);

    c.hitbox.get(entity)!.r = 99;
    c.sprite.get(entity)!.outline!.color[0] = 0;

    expect(GHOST.hitbox.r).not.toBe(99);
    expect(GHOST.sprite.outline!.color[0]).not.toBe(0);
  });

  it("remembers when it's mirrored", () => {
    const { entity, c } = fire(BOLT, { mirror: true });
    expect(c.projectile.get(entity)!.mirror).toBe(true);
  });

  it("fires right when given no direction", () => {
    const { entity, c } = fire(BOLT, { toward: { x: 0, y: 0 } });
    expect(c.projectile.get(entity)!.direction).toEqual({ x: 1, y: 0 });
  });
});

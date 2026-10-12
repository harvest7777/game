import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import {
  DEFAULT_PROJECTILE_SCALE,
  projectiles,
  type ProjectileId,
} from "./definitions";
import { fireProjectile, type FireOptions } from "./spawn";

function fire(def: ProjectileId, changes: Partial<FireOptions> = {}) {
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
    const { owner, entity, c } = fire("bolt");

    expect(c.projectile.get(entity)).toEqual({
      def: "bolt",
      owner,
      team: "player",
      origin: { x: 5, y: 6 },
      direction: { x: 0, y: 1 },
      age: 0,
    });
  });

  it("is a movable on the projectile layer with the definition's hitbox", () => {
    const { entity, c } = fire("bolt");

    expect(c.position.get(entity)).toEqual({ x: 5, y: 6 });
    expect(c.velocity.get(entity)).toEqual({ x: 0, y: 0 });
    expect(c.hitbox.get(entity)).toEqual(projectiles.bolt.hitbox);
    expect(c.sprite.get(entity)).toEqual({
      name: "bolt",
      layer: "projectile",
      scale: DEFAULT_PROJECTILE_SCALE,
    });
  });

  it("draws at 80% by default but keeps the definition's hitbox", () => {
    const { entity, c } = fire("bolt");
    expect(DEFAULT_PROJECTILE_SCALE).toBe(0.8);
    expect(c.sprite.get(entity)!.scale).toBe(0.8);
    expect(c.hitbox.get(entity)).toEqual(projectiles.bolt.hitbox);
  });

  it("stops at walls by default", () => {
    const { entity, c } = fire("bolt");
    expect(c.wallResponse.get(entity)).toBe("stop");
  });

  it("passes through walls when its definition says so", () => {
    const { entity, c } = fire("ghost");
    expect(c.wallResponse.has(entity)).toBe(false);
  });

  it("slides along walls when its definition says so", () => {
    const { entity, c } = fire("skidding");
    expect(c.wallResponse.get(entity)).toBe("slide");
  });

  it("points rotating sprites the way they were fired", () => {
    const { entity, c } = fire("bolt");
    expect(c.rotation.get(entity)!.angle).toBeCloseTo(Math.PI / 2);
  });

  it("leaves sprites upright when they neither face their path nor spin", () => {
    const { entity, c } = fire("wavy");
    expect(c.rotation.has(entity)).toBe(false);
  });

  it("doesn't share the definition's objects", () => {
    const { entity, c } = fire("ghost");

    c.hitbox.get(entity)!.r = 99;
    c.sprite.get(entity)!.outline!.color[0] = 0;

    expect(projectiles.ghost.hitbox.r).not.toBe(99);
    expect(projectiles.ghost.sprite.outline.color[0]).not.toBe(0);
  });

  it("fires right when given no direction", () => {
    const { entity, c } = fire("bolt", { toward: { x: 0, y: 0 } });
    expect(c.projectile.get(entity)!.direction).toEqual({ x: 1, y: 0 });
  });
});

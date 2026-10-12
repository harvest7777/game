import { describe, expect, it } from "vitest";
import { testWeapon } from "../testing/defs";
import { addControllable, addMovable, addShooter, addSprite } from "./bundles";
import { createTiles } from "./tiles";
import { createWorld, spawn } from "./world";

describe("addMovable", () => {
  it("adds position, zero velocity, hitbox and a slide response", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);

    addMovable(world, e, { at: { x: 2, y: 3 }, hitbox: { r: 0.4 } });

    const { components } = world;
    expect(components.position.get(e)).toEqual({ x: 2, y: 3 });
    expect(components.velocity.get(e)).toEqual({ x: 0, y: 0 });
    expect(components.hitbox.get(e)).toEqual({ r: 0.4 });
    expect(components.wallResponse.get(e)).toBe("slide");
  });

  it("leaves out the wall response for things that pass through walls", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);

    addMovable(world, e, {
      at: { x: 0, y: 0 },
      hitbox: { r: 0.1 },
      response: "pass",
    });

    expect(world.components.wallResponse.has(e)).toBe(false);
  });

  it("doesn't share the hitbox object it was given", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    const hitbox = { r: 0.4 };

    addMovable(world, e, { at: { x: 0, y: 0 }, hitbox });
    world.components.hitbox.get(e)!.r = 9;

    expect(hitbox.r).toBe(0.4);
  });

  it("doesn't share the position object it was given", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    const at = { x: 2, y: 3 };

    addMovable(world, e, { at, hitbox: { r: 0.4 } });
    world.components.position.get(e)!.x = 9;

    expect(at.x).toBe(2);
  });
});

describe("addControllable", () => {
  it("marks the entity player controlled with its speed", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);

    addControllable(world, e, { speed: 5 });

    expect(world.components.playerControlled.has(e)).toBe(true);
    expect(world.components.autoFire.get(e)).toBe(true);
    expect(world.components.speed.get(e)).toBe(5);
  });
});

describe("addSprite", () => {
  it("adds the sprite facing toward the viewer", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    const sprite = {
      art: { kind: "static", file: "player" },
      layer: "player",
    } as const;

    addSprite(world, e, sprite);

    expect(world.components.sprite.get(e)).toEqual(sprite);
    expect(world.components.facing.get(e)).toEqual({ x: 0, y: 1 });
  });
});

describe("addShooter", () => {
  it("adds a shooter ready to fire", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);

    const weapon = testWeapon();
    addShooter(world, e, { weapon });

    expect(world.components.shooter.get(e)).toEqual({
      weapon,
      cooldown: 0,
    });
  });
});

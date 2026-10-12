import { describe, expect, it } from "vitest";
import { addControllable, addMovable } from "./bundles";
import { createTiles } from "./tiles";
import { createWorld, spawn } from "./world";

describe("addMovable", () => {
  it("adds position, zero velocity, hitbox and a slide response", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);

    addMovable(world, e, { at: { x: 2, y: 3 }, r: 0.4 });

    const { components } = world;
    expect(components.position.get(e)).toEqual({ x: 2, y: 3 });
    expect(components.velocity.get(e)).toEqual({ x: 0, y: 0 });
    expect(components.hitbox.get(e)).toEqual({ r: 0.4 });
    expect(components.wallResponse.get(e)).toBe("slide");
  });

  it("doesn't share the position object it was given", () => {
    const world = createWorld(createTiles(1, 1));
    const e = spawn(world);
    const at = { x: 2, y: 3 };

    addMovable(world, e, { at, r: 0.4 });
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
    expect(world.components.speed.get(e)).toBe(5);
  });
});

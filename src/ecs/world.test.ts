import { describe, expect, it } from "vitest";
import { createWorld, despawn, spawn } from "./world";

describe("spawn", () => {
  it("gives every entity a unique id", () => {
    const world = createWorld();

    const ids = [spawn(world), spawn(world), spawn(world)];

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("despawn", () => {
  it("removes the entity from every component store", () => {
    const world = createWorld();
    const player = spawn(world);
    world.components.position.set(player, { x: 1, y: 2 });
    world.components.velocity.set(player, { x: 3, y: 4 });
    world.components.hitbox.set(player, { r: 0.5 });

    despawn(world, player);

    expect(world.components.position.has(player)).toBe(false);
    expect(world.components.velocity.has(player)).toBe(false);
    expect(world.components.hitbox.has(player)).toBe(false);
  });

  it("leaves other entities alone", () => {
    const world = createWorld();
    const player = spawn(world);
    const rock = spawn(world);
    const rockPosition = { x: 5, y: 6 };
    world.components.position.set(player, { x: 1, y: 2 });
    world.components.position.set(rock, rockPosition);

    despawn(world, player);

    expect(world.components.position.get(rock)).toEqual(rockPosition);
  });
});

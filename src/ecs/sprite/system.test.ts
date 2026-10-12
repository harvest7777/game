import { describe, expect, it } from "vitest";
import { testWeapon } from "../../testing/defs";
import type { Vec2 } from "../shared/physics/math";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { facingSystem } from "./system";

function setup(velocity: Vec2 | undefined, facing: Vec2) {
  const world = createWorld(createTiles(1, 1));
  const entity = spawn(world);
  if (velocity) world.components.velocity.set(entity, velocity);
  world.components.facing.set(entity, { ...facing });
  const facingOf = () => world.components.facing.get(entity)!;
  return { world, facingOf };
}

describe("facingSystem", () => {
  it("faces the direction of movement as a unit vector", () => {
    const { world, facingOf } = setup({ x: 3, y: 4 }, { x: 0, y: 1 });

    facingSystem(world, 1);

    expect(facingOf().x).toBeCloseTo(0.6);
    expect(facingOf().y).toBeCloseTo(0.8);
  });

  it("keeps the last facing when stopped", () => {
    const { world, facingOf } = setup({ x: 0, y: 0 }, { x: -1, y: 0 });

    facingSystem(world, 1);

    expect(facingOf()).toEqual({ x: -1, y: 0 });
  });

  it("leaves entities without a velocity alone", () => {
    const { world, facingOf } = setup(undefined, { x: 0, y: -1 });

    facingSystem(world, 1);

    expect(facingOf()).toEqual({ x: 0, y: -1 });
  });

  it("faces where a shooter is aiming rather than where it moves", () => {
    const { world, facingOf } = setup({ x: -1, y: 0 }, { x: 0, y: 1 });
    const [[entity]] = [...world.components.facing];
    world.components.shooter.set(entity, {
      weapon: testWeapon(),
      cooldown: 0,
      aim: { x: 0, y: -1 },
    });

    facingSystem(world, 1);

    expect(facingOf()).toEqual({ x: 0, y: -1 });
  });

  it("faces its movement while a shooter hasn't aimed yet", () => {
    const { world, facingOf } = setup({ x: -1, y: 0 }, { x: 0, y: 1 });
    const [[entity]] = [...world.components.facing];
    world.components.shooter.set(entity, { weapon: testWeapon(), cooldown: 0 });

    facingSystem(world, 1);

    expect(facingOf()).toEqual({ x: -1, y: 0 });
  });

  it("uses movement instead of cursor aim while player autofire is off", () => {
    const { world, facingOf } = setup({ x: -1, y: 0 }, { x: 0, y: 1 });
    const [[entity]] = [...world.components.facing];
    world.components.playerControlled.set(entity, true);
    world.components.autoFire.set(entity, false);
    world.components.shooter.set(entity, {
      weapon: testWeapon(),
      cooldown: 0,
      aim: { x: 0, y: -1 },
    });

    facingSystem(world, 1);

    expect(facingOf()).toEqual({ x: -1, y: 0 });
  });
});

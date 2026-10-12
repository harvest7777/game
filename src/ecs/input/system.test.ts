import { describe, expect, it } from "vitest";
import type { Vec2 } from "../shared/physics/math";
import { createTiles, setGround } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import { Action } from "./actions";
import { autoFireSystem, CROUCH_SPEED, playerInputSystem } from "./system";
import { STAT, stat } from "../stats/components";

const SPEED = 4;

function setup(held: Action[], cameraAngle = 0) {
  const world = createWorld(createTiles(1, 1));
  world.input.held = new Set(held);
  world.camera.angle = cameraAngle;
  const player = spawn(world);
  world.components.playerControlled.set(player, true);
  world.components.moveSpeed.set(player, SPEED);
  world.components.velocity.set(player, { x: 0, y: 0 });
  return { world, player };
}

function velocityOf(world: World, entity: Entity): Vec2 {
  return world.components.velocity.get(entity)!;
}

function expectVelocity(world: World, entity: Entity, x: number, y: number) {
  const v = velocityOf(world, entity);
  expect(v.x).toBeCloseTo(x);
  expect(v.y).toBeCloseTo(y);
}

describe("playerInputSystem", () => {
  describe("with the camera unrotated", () => {
    it("Up moves toward -y", () => {
      const { world, player } = setup([Action.Up]);
      playerInputSystem(world, 1);
      expectVelocity(world, player, 0, -SPEED);
    });

    it("Down moves toward +y", () => {
      const { world, player } = setup([Action.Down]);
      playerInputSystem(world, 1);
      expectVelocity(world, player, 0, SPEED);
    });

    it("Left moves toward -x", () => {
      const { world, player } = setup([Action.Left]);
      playerInputSystem(world, 1);
      expectVelocity(world, player, -SPEED, 0);
    });

    it("Right moves toward +x", () => {
      const { world, player } = setup([Action.Right]);
      playerInputSystem(world, 1);
      expectVelocity(world, player, SPEED, 0);
    });
  });

  it("moves diagonally no faster than straight", () => {
    const { world, player } = setup([Action.Up, Action.Right]);

    playerInputSystem(world, 1);

    const v = velocityOf(world, player);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(SPEED);
    expect(v.x).toBeCloseTo(SPEED * Math.SQRT1_2);
    expect(v.y).toBeCloseTo(-SPEED * Math.SQRT1_2);
  });

  it("stops when opposite keys are held", () => {
    const { world, player } = setup([Action.Left, Action.Right]);
    playerInputSystem(world, 1);
    expectVelocity(world, player, 0, 0);
  });

  it("stops when no movement keys are held", () => {
    const { world, player } = setup([]);
    world.components.velocity.set(player, { x: 3, y: 3 });

    playerInputSystem(world, 1);

    expectVelocity(world, player, 0, 0);
  });

  it("moves at a fraction of speed while crouching", () => {
    const { world, player } = setup([Action.Right, Action.Crouch]);
    playerInputSystem(world, 1);
    expectVelocity(world, player, SPEED * CROUCH_SPEED, 0);
  });

  it("uses the Speed stat instead of fallback movement speed", () => {
    const { world, player } = setup([Action.Right]);
    world.components[STAT.SPEED].set(player, stat(25, 75));

    playerInputSystem(world, 1);

    expectVelocity(world, player, 5, 0);
  });

  describe("with the camera rotated", () => {
    it("Up still moves toward the top of the screen, which faces world +x at π/2", () => {
      const { world, player } = setup([Action.Up], Math.PI / 2);
      playerInputSystem(world, 1);
      expectVelocity(world, player, SPEED, 0);
    });

    it("Right moves toward world +y at π/2", () => {
      const { world, player } = setup([Action.Right], Math.PI / 2);
      playerInputSystem(world, 1);
      expectVelocity(world, player, 0, SPEED);
    });

    it("Up moves toward world +y when the camera is turned around", () => {
      const { world, player } = setup([Action.Up], Math.PI);
      playerInputSystem(world, 1);
      expectVelocity(world, player, 0, SPEED);
    });
  });

  it("leaves entities that aren't player controlled alone", () => {
    const { world } = setup([Action.Right]);
    const enemy = spawn(world);
    world.components.moveSpeed.set(enemy, SPEED);
    world.components.velocity.set(enemy, { x: 0, y: 1 });

    playerInputSystem(world, 1);

    expectVelocity(world, enemy, 0, 1);
  });
});

describe("playerInputSystem on slow ground", () => {
  it("scales the speed by the ground under the player", () => {
    const water = { art: "water", speedScale: 0.8 };
    const world = createWorld(createTiles(2, 1, [{ art: "grass" }, water]));
    setGround(world.tiles, 1, 0, 1);
    world.input.held = new Set([Action.Right]);
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    world.components.moveSpeed.set(player, SPEED);

    world.components.position.set(player, { x: 0.5, y: 0.5 });
    playerInputSystem(world, 1);
    expect(velocityOf(world, player).x).toBeCloseTo(SPEED);

    world.components.position.set(player, { x: 1.5, y: 0.5 });
    playerInputSystem(world, 1);
    expect(velocityOf(world, player).x).toBeCloseTo(SPEED * 0.8);
  });
});

describe("autoFireSystem", () => {
  it("toggles each player when asked", () => {
    const { world, player } = setup([]);
    world.components.autoFire.set(player, true);
    world.input.commands = [{ kind: "toggleAutoFire" }];

    autoFireSystem(world, 0.05);

    expect(world.components.autoFire.get(player)).toBe(false);
  });

  it("leaves autofire alone after an even number of toggles", () => {
    const { world, player } = setup([]);
    world.components.autoFire.set(player, true);
    world.input.commands = [
      { kind: "toggleAutoFire" },
      { kind: "toggleAutoFire" },
    ];

    autoFireSystem(world, 0.05);

    expect(world.components.autoFire.get(player)).toBe(true);
  });
});

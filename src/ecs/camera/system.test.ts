import { describe, expect, it } from "vitest";
import { Action } from "../input/actions";
import { createTiles } from "../tiles";
import { createWorld } from "../world";
import { cameraSystem } from "./system";

function worldHolding(...actions: Action[]) {
  const world = createWorld(createTiles(1, 1));
  world.input.held = new Set(actions);
  world.camera.turnSpeed = Math.PI / 2;
  return world;
}

describe("cameraSystem", () => {
  it("turns clockwise while RotateRight is held", () => {
    const world = worldHolding(Action.RotateRight);

    cameraSystem(world, 1);

    expect(world.camera.angle).toBeCloseTo(Math.PI / 2);
  });

  it("turns counterclockwise while RotateLeft is held, wrapping past 0", () => {
    const world = worldHolding(Action.RotateLeft);

    cameraSystem(world, 1);

    expect(world.camera.angle).toBeCloseTo((3 * Math.PI) / 2);
  });

  it("doesn't turn when both are held", () => {
    const world = worldHolding(Action.RotateLeft, Action.RotateRight);

    cameraSystem(world, 1);

    expect(world.camera.angle).toBe(0);
  });

  it("doesn't turn when neither is held", () => {
    const world = worldHolding(Action.Up);

    cameraSystem(world, 1);

    expect(world.camera.angle).toBe(0);
  });
});

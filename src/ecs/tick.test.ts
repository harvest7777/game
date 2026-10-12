import { describe, expect, it } from "vitest";
import { addControllable, addMovable, addSprite } from "./bundles";
import { Action } from "./input/actions";
import { CROUCH_SPEED } from "./input/system";
import { runTick } from "./tick";
import { createTiles, setWall } from "./tiles";
import { createWorld, spawn, type World } from "./world";

const SPEED = 4;
const DT = 0.1;
const START = { x: 10, y: 10 };
const R = 0.4;

// A player standing in the middle of an open 20x20 map.
function setup() {
  const world = createWorld(createTiles(20, 20));
  const player = spawn(world);
  addMovable(world, player, { at: START, r: R });
  addControllable(world, player, { speed: SPEED });
  addSprite(world, player, { name: "player", layer: "player" });
  const position = () => world.components.position.get(player)!;
  const facing = () => world.components.facing.get(player)!;
  return { world, position, facing };
}

function hold(world: World, ...actions: Action[]) {
  world.input.held = new Set(actions);
}

describe("runTick", () => {
  describe("walking", () => {
    const step = SPEED * DT;

    it("Up moves up the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Up);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x);
      expect(position().y).toBeCloseTo(START.y - step);
    });

    it("Down moves down the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Down);
      runTick(world, DT);
      expect(position().y).toBeCloseTo(START.y + step);
    });

    it("Left moves left on the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Left);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x - step);
    });

    it("Right moves right on the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Right);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x + step);
    });

    it("stops as soon as keys are released", () => {
      const { world, position } = setup();
      hold(world, Action.Right);
      runTick(world, DT);
      const afterWalking = { ...position() };

      hold(world);
      runTick(world, DT);

      expect(position()).toEqual(afterWalking);
    });
  });

  it("faces the way it walks and keeps facing that way after stopping", () => {
    const { world, facing } = setup();
    hold(world, Action.Left);
    runTick(world, DT);
    hold(world);
    runTick(world, DT);

    expect(facing()).toEqual({ x: -1, y: 0 });
  });

  it("shift walks slower", () => {
    const { world, position } = setup();
    hold(world, Action.Right, Action.Crouch);

    runTick(world, DT);

    expect(position().x).toBeCloseTo(START.x + SPEED * CROUCH_SPEED * DT);
  });

  describe("rotating", () => {
    it("turns the camera without moving the player", () => {
      const { world, position } = setup();
      hold(world, Action.RotateRight);

      runTick(world, DT);

      expect(world.camera.angle).toBeCloseTo(world.camera.turnSpeed * DT);
      expect(position()).toEqual(START);
    });

    it("keeps Up pointing at the top of the screen after turning", () => {
      const { world, position } = setup();
      world.camera.angle = Math.PI / 2;
      hold(world, Action.Up);

      runTick(world, DT);

      // Top of the screen faces world +x at π/2.
      expect(position().x).toBeCloseTo(START.x + SPEED * DT);
      expect(position().y).toBeCloseTo(START.y);
    });

    it("uses this tick's angle when turning and walking together", () => {
      const { world, position } = setup();
      world.camera.turnSpeed = Math.PI / 2 / DT; // a quarter turn in one tick
      hold(world, Action.RotateRight, Action.Up);

      runTick(world, DT);

      expect(position().x).toBeCloseTo(START.x + SPEED * DT);
    });
  });

  it("stops the player at walls", () => {
    const { world, position } = setup();
    setWall(world.tiles, 11, 10);
    hold(world, Action.Right);

    for (let i = 0; i < 20; i++) runTick(world, DT);

    expect(position().x).toBeCloseTo(11 - R, 3);
  });
});

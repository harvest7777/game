import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { HURT_FADE, HURT_SHOWN, recentlyHurtSystem } from "./hurt";

function setup() {
  const world = createWorld(createTiles(1, 1));
  const target = spawn(world);
  const hurt = () => world.components.recentlyHurt.get(target);
  const hit = () => world.events.damaged.push({ target, amount: 5 });
  const tick = (dt: number) => {
    recentlyHurtSystem(world, dt);
    world.events.damaged.length = 0;
  };
  return { hurt, hit, tick };
}

describe("recentlyHurtSystem", () => {
  it("starts the clock when something takes damage", () => {
    const { hurt, hit, tick } = setup();
    hit();
    tick(0.05);
    expect(hurt()).toEqual({ age: 0, previousAge: 0 });
  });

  it("counts up after the hit, remembering last tick's age", () => {
    const { hurt, hit, tick } = setup();
    hit();
    tick(0.05);
    tick(0.5);
    expect(hurt()).toEqual({ age: 0.5, previousAge: 0 });
  });

  it("starts again on every hit", () => {
    const { hurt, hit, tick } = setup();
    hit();
    tick(0.05);
    tick(2);
    hit();
    tick(0.05);
    expect(hurt()!.age).toBe(0);
  });

  it("forgets it once its bar has faded", () => {
    const { hurt, hit, tick } = setup();
    hit();
    tick(0.05);
    tick(HURT_SHOWN + HURT_FADE);
    tick(0.05);
    expect(hurt()).toBeUndefined();
  });
});

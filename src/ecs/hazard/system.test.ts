import { describe, expect, it } from "vitest";
import { STAT, stat } from "../stats/components";
import { createTiles, setGround, type GroundDef } from "../tiles";
import { createWorld, spawn, type World } from "../world";
import type { Team } from "../projectile/components";
import { hazardSystem } from "./system";

const floor: GroundDef = { art: "test/floor" };
const lava: GroundDef = {
  art: "test/lava",
  hazard: { damage: 10, every: 0.5 },
};

// A 2x1 map: floor at x 0, lava at x 1.
function setup(team: Team = "player") {
  const tiles = createTiles(2, 1, [floor, lava]);
  setGround(tiles, 1, 0, 1);
  const world = createWorld(tiles);
  const walker = spawn(world);
  world.components.position.set(walker, { x: 1.5, y: 0.5 });
  world.components.team.set(walker, team);
  world.components[STAT.HEALTH].set(walker, stat(100));
  const hp = () => world.components[STAT.HEALTH].get(walker)!.value;
  return { world, walker, hp };
}

// In steps of a quarter second by default, which add up exactly.
function runFor(world: World, seconds: number, dt = 0.25) {
  for (let t = 0; t < seconds - 1e-9; t += dt) hazardSystem(world, dt);
}

describe("hazardSystem", () => {
  it("burns a character once for every `every` seconds on it", () => {
    const { world, hp } = setup();
    // 1.25 s at one burn per 0.5 s.
    runFor(world, 1.25);
    expect(hp()).toBe(80);
  });

  it("doesn't burn the moment a character steps on", () => {
    const { world, hp } = setup();
    runFor(world, 0.45, 0.05);
    expect(hp()).toBe(100);
  });

  it("forgets the time once they step off", () => {
    const { world, walker, hp } = setup();
    runFor(world, 0.45, 0.05);
    world.components.position.set(walker, { x: 0.5, y: 0.5 });
    runFor(world, 0.05, 0.05);
    world.components.position.set(walker, { x: 1.5, y: 0.5 });
    runFor(world, 0.45, 0.05);
    expect(hp()).toBe(100);
    expect(world.components.hazardExposure.has(walker)).toBe(true);
  });

  it("ignores defense", () => {
    const { world, walker, hp } = setup();
    world.components[STAT.DEFENSE].set(walker, stat(8));
    runFor(world, 0.5);
    expect(hp()).toBe(90);
  });

  it("leaves enemies alone", () => {
    const { world, hp } = setup("enemy");
    runFor(world, 2);
    expect(hp()).toBe(100);
  });

  it("records the burn as damage, for damage numbers", () => {
    const { world, walker } = setup();
    runFor(world, 0.5);
    expect(world.events.damaged).toEqual([{ target: walker, amount: 10 }]);
  });
});

import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { brainSystem } from "./brain";
import { spawnEnemy } from "./spawn";

// Wanders with no target, chases with one.
const SLIME = testEnemy();

function setup() {
  const world = createWorld(createTiles(40, 40), () => 0.5);
  const slime = spawnEnemy(world, SLIME, { x: 10, y: 10 });
  const player = spawn(world);
  world.components.position.set(player, { x: 16, y: 10 });
  const c = world.components;
  return { world, slime, player, c };
}

describe("brainSystem", () => {
  it("runs the idle behavior without a target", () => {
    const { world, slime, c } = setup();

    brainSystem(world, 0.05);

    expect(c.brain.get(slime)!.mode).toBe("idle");
    // Wandering: off toward its first waypoint at half speed.
    const v = c.velocity.get(slime)!;
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(SLIME.speed / 2);
  });

  it("runs the aggro behavior once it has a target", () => {
    const { world, slime, player, c } = setup();
    c.target.set(slime, player);

    brainSystem(world, 0.05);

    expect(c.brain.get(slime)!.mode).toBe("aggro");
    // Chasing: straight at the player at full speed.
    expect(c.velocity.get(slime)).toEqual({ x: SLIME.speed, y: 0 });
  });

  it("starts a behavior fresh when switching to it", () => {
    const { world, slime, player, c } = setup();
    brainSystem(world, 0.05);
    expect(c.brain.get(slime)!.memory.waypoint).toBeDefined();

    c.target.set(slime, player);
    brainSystem(world, 0.05);

    expect(c.brain.get(slime)!.memory.waypoint).toBeUndefined();
  });
});

describe("roaming", () => {
  // Chased the player from (10, 10) to (30, 10), then lost them.
  function ledAway(roams: boolean) {
    const world = createWorld(createTiles(40, 40), () => 0.5);
    const enemy = spawnEnemy(world, testEnemy({ roams }), { x: 10, y: 10 });
    const player = spawn(world);
    world.components.position.set(player, { x: 32, y: 10 });
    world.components.target.set(enemy, player);
    brainSystem(world, 0.05);
    world.components.position.set(enemy, { x: 30, y: 10 });
    world.components.target.delete(enemy);
    brainSystem(world, 0.05);
    return world.components.enemy.get(enemy)!.origin;
  }

  it("a roamer makes where it lost its target its new home", () => {
    expect(ledAway(true)).toEqual({ x: 30, y: 10 });
  });

  it("anything else keeps the home it spawned at", () => {
    expect(ledAway(false)).toEqual({ x: 10, y: 10 });
  });
});

import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { brainSystem } from "./brain";
import { SLEEP_DISTANCE, sleepSystem } from "./sleep";
import { spawnEnemy } from "./spawn";

// A player at (10, 10) and an enemy `away` tiles east of them.
function setup(away: number) {
  const world = createWorld(createTiles(100, 100), () => 0.5);
  const player = spawn(world);
  world.components.playerControlled.set(player, true);
  world.components.position.set(player, { x: 10, y: 10 });
  const enemy = spawnEnemy(world, testEnemy(), { x: 10 + away, y: 10 });
  const asleep = () => world.components.asleep.has(enemy);
  return { world, player, enemy, asleep };
}

describe("sleepSystem", () => {
  it("keeps an enemy near a player awake", () => {
    const { world, asleep } = setup(SLEEP_DISTANCE - 1);
    sleepSystem(world, 0.05);
    expect(asleep()).toBe(false);
  });

  it("puts an enemy far from every player to sleep, standing still", () => {
    const { world, enemy, asleep } = setup(SLEEP_DISTANCE + 1);
    world.components.velocity.set(enemy, { x: 2, y: 1 });

    sleepSystem(world, 0.05);

    expect(asleep()).toBe(true);
    expect(world.components.velocity.get(enemy)).toEqual({ x: 0, y: 0 });
  });

  it("keeps an enemy that's after something awake, however far", () => {
    const { world, player, enemy, asleep } = setup(SLEEP_DISTANCE + 1);
    world.components.target.set(enemy, player);
    sleepSystem(world, 0.05);
    expect(asleep()).toBe(false);
  });

  it("wakes an enemy once a player comes near", () => {
    const { world, player, asleep } = setup(SLEEP_DISTANCE + 1);
    sleepSystem(world, 0.05);
    world.components.position.set(player, { x: 20, y: 10 });

    sleepSystem(world, 0.05);

    expect(asleep()).toBe(false);
  });

  it("with no player at all, puts everything to sleep", () => {
    const world = createWorld(createTiles(10, 10));
    const enemy = spawnEnemy(world, testEnemy(), { x: 2, y: 2 });
    sleepSystem(world, 0.05);
    expect(world.components.asleep.has(enemy)).toBe(true);
  });

  it("leaves a sleeper's velocity alone in the brain", () => {
    const { world, enemy } = setup(SLEEP_DISTANCE + 1);
    sleepSystem(world, 0.05);
    brainSystem(world, 0.05);
    expect(world.components.velocity.get(enemy)).toEqual({ x: 0, y: 0 });
  });
});

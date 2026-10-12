import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import type { Team } from "../projectile/components";
import type { Vec2 } from "../shared/physics/math";
import { createTiles, setWall } from "../tiles";
import { createWorld, spawn, type World } from "../world";
import { aggroSystem } from "./aggro";
import { spawnEnemy } from "./spawn";

const SLIME = testEnemy();
const RANGE = SLIME.detectRange;
const SLIME_AT = { x: 10, y: 10 };

function setup() {
  const world = createWorld(createTiles(40, 40));
  const slime = spawnEnemy(world, SLIME, SLIME_AT);
  return { world, slime, targetOf: () => world.components.target.get(slime) };
}

function addLiving(world: World, at: Vec2, team: Team = "player", hp = 100) {
  const e = spawn(world);
  world.components.position.set(e, { ...at });
  world.components.health.set(e, { value: hp, max: 100 });
  world.components.team.set(e, team);
  return e;
}

describe("aggroSystem", () => {
  it("targets the player within detection range", () => {
    const { world, targetOf } = setup();
    const player = addLiving(world, { x: 10 + RANGE - 0.5, y: 10 });

    aggroSystem(world, 0.05);

    expect(targetOf()).toBe(player);
  });

  it("ignores things out of range", () => {
    const { world, targetOf } = setup();
    addLiving(world, { x: 10 + RANGE + 0.5, y: 10 });

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });

  it("drops its target once it leaves range", () => {
    const { world, targetOf } = setup();
    const player = addLiving(world, { x: 12, y: 10 });
    aggroSystem(world, 0.05);
    world.components.position.set(player, { x: 30, y: 10 });

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });

  it("picks the nearest of several", () => {
    const { world, targetOf } = setup();
    addLiving(world, { x: 15, y: 10 });
    const near = addLiving(world, { x: 10, y: 12 });

    aggroSystem(world, 0.05);

    expect(targetOf()).toBe(near);
  });

  it("ignores its own team", () => {
    const { world, targetOf } = setup();
    addLiving(world, { x: 11, y: 10 }, "enemy");

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });

  it("ignores anything at 0 health", () => {
    const { world, targetOf } = setup();
    addLiving(world, { x: 11, y: 10 }, "player", 0);

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });
});

describe("aggroSystem and walls", () => {
  // A wall from (12, 0) down to (12, 39), between the slime and the player.
  function walled() {
    const { world, slime, targetOf } = setup();
    for (let y = 0; y < 40; y++) setWall(world.tiles, 12, y);
    return { world, slime, targetOf };
  }

  it("doesn't notice anyone it can't see", () => {
    const { world, targetOf } = walled();
    addLiving(world, { x: 14, y: 10 });

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });

  it("keeps a target it already had while it's in range, seen or not", () => {
    const { world, targetOf } = setup();
    const player = addLiving(world, { x: 14, y: 10 });
    aggroSystem(world, 0.05);
    setWall(world.tiles, 12, 10);

    aggroSystem(world, 0.05);

    expect(targetOf()).toBe(player);
  });

  it("lets a dead target go", () => {
    const { world, targetOf } = setup();
    const player = addLiving(world, { x: 14, y: 10 });
    aggroSystem(world, 0.05);
    world.components.health.get(player)!.value = 0;

    aggroSystem(world, 0.05);

    expect(targetOf()).toBeUndefined();
  });
});

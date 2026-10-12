import { describe, expect, it } from "vitest";
import type { Vec2 } from "../shared/physics/math";
import { createTiles } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import { shootSystem } from "./shoot";

const DT = 0.05;
const AT = { x: 10, y: 10 };

function setup(rate: number, player = true) {
  const world = createWorld(createTiles(20, 20));
  const shooter = spawn(world);
  const c = world.components;
  c.position.set(shooter, { ...AT });
  c.facing.set(shooter, { x: 0, y: 1 });
  c.team.set(shooter, "player");
  c.shooter.set(shooter, { projectile: "bolt", rate, cooldown: 0 });
  if (player) c.playerControlled.set(shooter, true);
  return { world, shooter };
}

function shots(world: World) {
  return [...world.components.projectile].map(([, p]) => p);
}

function directionOf(world: World): Vec2 {
  return shots(world)[0].direction;
}

function tick(world: World, ticks = 1) {
  for (let i = 0; i < ticks; i++) shootSystem(world, DT);
}

describe("shootSystem", () => {
  it("fires straight away, then at its rate", () => {
    // 4 shots/s is one every 0.25 s: at 0, 0.25 and 0.5. Checked between
    // shots so rounding at the exact moment of a shot doesn't matter.
    const { world } = setup(4);
    tick(world);
    expect(shots(world)).toHaveLength(1);
    tick(world, 3); // 0.2 s
    expect(shots(world)).toHaveLength(1);
    tick(world, 8); // 0.6 s
    expect(shots(world)).toHaveLength(3);
  });

  it("fires several shots in a tick when faster than the tick rate", () => {
    // 55 shots/s at 20 ticks/s for 0.5 s: shots at 0, 1/55, ... up to 0.49.
    const { world } = setup(55);
    tick(world, 10);
    expect(shots(world)).toHaveLength(Math.floor(0.5 * 55) + 1);
  });

  it("fires from where the shooter stands, as its team, owned by it", () => {
    const { world, shooter } = setup(1);
    tick(world);
    const [shot] = shots(world);
    expect(shot.origin).toEqual(AT);
    expect(shot.owner).toBe(shooter);
    expect(shot.team).toBe("player");
  });

  it("aims the player's shots at the cursor", () => {
    const { world } = setup(1);
    world.input.aim = { x: 7, y: 6 };
    tick(world);
    const d = directionOf(world);
    expect(d.x).toBeCloseTo(-0.6);
    expect(d.y).toBeCloseTo(-0.8);
  });

  it("fires the way the player faces before the cursor is over the game", () => {
    const { world } = setup(1);
    tick(world);
    expect(directionOf(world)).toEqual({ x: 0, y: 1 });
  });

  it("fires the way the player faces with the cursor right on them", () => {
    const { world } = setup(1);
    world.input.aim = { ...AT };
    tick(world);
    expect(directionOf(world)).toEqual({ x: 0, y: 1 });
  });

  it("ignores the cursor for anything not player controlled", () => {
    const { world } = setup(1, false);
    world.input.aim = { x: 0, y: 0 };
    tick(world);
    expect(directionOf(world)).toEqual({ x: 0, y: 1 });
  });

  it("skips shooters with no position", () => {
    const world = createWorld(createTiles(20, 20));
    const shooter: Entity = spawn(world);
    world.components.shooter.set(shooter, {
      projectile: "bolt",
      rate: 1,
      cooldown: 0,
    });
    tick(world);
    expect(shots(world)).toHaveLength(0);
  });
});

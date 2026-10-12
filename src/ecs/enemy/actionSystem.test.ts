import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { bossActionSystem } from "./actionSystem";
import { phaseSystem } from "./phaseSystem";
import { spawnEnemy } from "./spawn";

function setup() {
  const world = createWorld(createTiles(40, 40), () => 0.5);
  const king = spawnEnemy(world, "slimeKing", { x: 10, y: 10 });
  const player = spawn(world);
  world.components.position.set(player, { x: 16, y: 10 });
  world.components.target.set(king, player);
  const action = () => world.components.bossAction.get(king)!;
  const tick = (dt: number) => bossActionSystem(world, dt);
  return { world, king, action, tick };
}

describe("bossActionSystem", () => {
  it("plays the current phase's deterministic rotation", () => {
    const { action, tick } = setup();
    tick(0.55);
    expect(action()).toMatchObject({ sequence: "crownRing", stageIndex: 1 });
    tick(0.25);
    expect(action()).toMatchObject({ sequence: "crownRing", stageIndex: 2 });
    tick(0.45);
    expect(action()).toMatchObject({ sequence: "aimedSpray", stageIndex: 0 });
  });

  it("fires a ring once at the cast cue, from the boss center", () => {
    const { world, king, tick } = setup();
    tick(0.55);
    tick(0.1);

    const shots = [...world.components.projectile].filter(
      ([, projectile]) => projectile.owner === king,
    );
    expect(shots).toHaveLength(12);
    for (const [, projectile] of shots) {
      expect(projectile.origin).toEqual({ x: 10, y: 10 });
    }
    tick(0.1);
    expect([...world.components.projectile]).toHaveLength(12);
  });

  it("makes the charge recovery vulnerable", () => {
    const { world, king, tick } = setup();
    world.components.health.get(king)!.hp = 1500 * 0.6;
    phaseSystem(world, 0.05);

    tick(0.55);
    tick(0.6);

    expect(world.components.bossAction.get(king)).toMatchObject({
      sequence: "charge",
      stageIndex: 2,
    });
    expect(world.components.vulnerable.get(king)).toEqual({ multiplier: 1.5 });
  });

  it("stops the timeline and clears weak points without a target", () => {
    const { world, king, tick } = setup();
    world.components.health.get(king)!.hp = 1500 * 0.6;
    phaseSystem(world, 0.05);
    tick(0.55);
    tick(0.6);
    expect(world.components.vulnerable.has(king)).toBe(true);

    world.components.target.delete(king);
    tick(0.05);

    expect(world.components.bossAction.get(king)).toMatchObject({
      active: false,
      time: 0,
    });
    expect(world.components.vulnerable.has(king)).toBe(false);
  });
});

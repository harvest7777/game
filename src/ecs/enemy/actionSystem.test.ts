import { describe, expect, it } from "vitest";
import {
  BOSS_CAST,
  BOSS_CAST_CUE,
  BOSS_DASH,
  BOSS_EXPOSED_MULTIPLIER,
  BOSS_RECOVER,
  BOSS_RING_COUNT,
  BOSS_TELL,
  testBoss,
} from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn, type Entity, type World } from "../world";
import { bossActionSystem } from "./actionSystem";
import { phaseSystem } from "./phaseSystem";
import { spawnEnemy } from "./spawn";

function setup() {
  const world = createWorld(createTiles(40, 40), () => 0.5);
  const king = spawnEnemy(world, testBoss(), { x: 10, y: 10 });
  const player = spawn(world);
  world.components.position.set(player, { x: 16, y: 10 });
  world.components.target.set(king, player);
  const action = () => world.components.bossAction.get(king)!;
  const tick = (dt: number) => bossActionSystem(world, dt);
  return { world, king, action, tick };
}

// Hurts the boss into its enraged phase, which opens with a charge.
function enrage(world: World, king: Entity) {
  world.components.health.get(king)!.value = 500;
  phaseSystem(world, 0.05);
}

describe("bossActionSystem", () => {
  it("plays the current phase's deterministic rotation", () => {
    const { action, tick } = setup();
    tick(BOSS_TELL);
    expect(action()).toMatchObject({ sequence: "ring", stageIndex: 1 });
    tick(BOSS_CAST);
    expect(action()).toMatchObject({ sequence: "ring", stageIndex: 2 });
    tick(BOSS_RECOVER);
    expect(action()).toMatchObject({ sequence: "spray", stageIndex: 0 });
  });

  it("fires a ring once at the cast cue, from the boss center", () => {
    const { world, king, tick } = setup();
    tick(BOSS_TELL);
    tick(BOSS_CAST_CUE);

    const shots = [...world.components.projectile].filter(
      ([, projectile]) => projectile.owner === king,
    );
    expect(shots).toHaveLength(BOSS_RING_COUNT);
    for (const [, projectile] of shots) {
      expect(projectile.origin).toEqual({ x: 10, y: 10 });
    }
    tick(BOSS_CAST_CUE);
    expect([...world.components.projectile]).toHaveLength(BOSS_RING_COUNT);
  });

  it("makes the charge recovery vulnerable", () => {
    const { world, king, tick } = setup();
    enrage(world, king);

    tick(BOSS_TELL);
    tick(BOSS_DASH);

    expect(world.components.bossAction.get(king)).toMatchObject({
      sequence: "charge",
      stageIndex: 2,
    });
    expect(world.components.vulnerable.get(king)).toEqual({
      multiplier: BOSS_EXPOSED_MULTIPLIER,
    });
  });

  it("stops the timeline and clears weak points without a target", () => {
    const { world, king, tick } = setup();
    enrage(world, king);
    tick(BOSS_TELL);
    tick(BOSS_DASH);
    expect(world.components.vulnerable.has(king)).toBe(true);

    world.components.target.delete(king);
    tick(0.05);

    expect(world.components.bossAction.get(king)).toMatchObject({
      active: false,
      time: 0,
    });
    expect(world.components.vulnerable.has(king)).toBe(false);
  });

  it("is invulnerable only during stages that say so", () => {
    const world = createWorld(createTiles(40, 40), () => 0.5);
    const def = testBoss();
    def.sequences!.ring.stages[0].invulnerable = true;
    const king = spawnEnemy(world, def, { x: 10, y: 10 });
    const player = spawn(world);
    world.components.position.set(player, { x: 16, y: 10 });
    world.components.target.set(king, player);

    bossActionSystem(world, 0.01);
    expect(world.components.invulnerable.has(king)).toBe(true);
    bossActionSystem(world, BOSS_TELL);
    expect(world.components.invulnerable.has(king)).toBe(false);
  });

  it("drops invulnerability when it loses its target", () => {
    const world = createWorld(createTiles(40, 40), () => 0.5);
    const def = testBoss();
    def.sequences!.ring.stages[0].invulnerable = true;
    const king = spawnEnemy(world, def, { x: 10, y: 10 });
    const player = spawn(world);
    world.components.position.set(player, { x: 16, y: 10 });
    world.components.target.set(king, player);
    bossActionSystem(world, 0.01);

    world.components.target.delete(king);
    bossActionSystem(world, 0.01);

    expect(world.components.invulnerable.has(king)).toBe(false);
  });
});

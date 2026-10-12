import { describe, expect, it } from "vitest";
import { testBoss, testEnemy, testWeapon } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { brainSystem } from "./brain";
import { bossActionSystem } from "./actionSystem";
import { phaseSystem } from "./phaseSystem";
import { spawnEnemy } from "./spawn";
import { STAT } from "../stats/components";

const DT = 0.05;

function setup() {
  const world = createWorld(createTiles(40, 40), () => 0.5);
  const boss = testBoss();
  const king = spawnEnemy(world, boss, { x: 10, y: 10 });
  const c = world.components;
  const phase = () => c.enemy.get(king)!.phase!;
  const action = () => c.bossAction.get(king)!;
  const hurtTo = (fraction: number) => {
    c.health.get(king)!.value = boss.stats[STAT.HEALTH].value * fraction;
  };
  const tick = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) phaseSystem(world, DT);
  };
  return { world, king, c, phase, action, hurtTo, tick };
}

describe("spawning an enemy with phases", () => {
  it("starts its first phase at the first sequence in its rotation", () => {
    const { phase, action, c, king } = setup();
    expect(phase()).toEqual({ name: "awake", time: 0 });
    expect(action()).toMatchObject({
      sequence: "ring",
      rotationIndex: 0,
      stageIndex: 0,
      active: false,
    });
    expect(c.shooter.has(king)).toBe(false);
  });
});

describe("phaseSystem", () => {
  it("times the current phase", () => {
    const { phase, tick } = setup();
    tick(4);
    expect(phase().time).toBeCloseTo(4 * DT);
  });

  it("moves on when its health drops low enough, resetting its rotation", () => {
    const { phase, action, hurtTo, tick } = setup();
    hurtTo(0.6);

    tick();

    expect(phase()).toEqual({ name: "enraged", time: 0 });
    expect(action()).toMatchObject({
      sequence: "charge",
      rotationIndex: 0,
      stageIndex: 0,
      active: false,
    });
  });

  it("switches at most once a tick", () => {
    const { phase, hurtTo, tick } = setup();
    hurtTo(0.1);

    tick();
    expect(phase().name).toBe("enraged");
    tick();
    expect(phase().name).toBe("desperate");
  });

  it("resets an active sequence when health enters a new phase", () => {
    const { world, king, c, phase, action, hurtTo, tick } = setup();
    const player = spawn(world);
    c.position.set(player, { x: 15, y: 10 });
    c.target.set(king, player);
    bossActionSystem(world, DT);
    expect(action().active).toBe(true);

    hurtTo(0.1);
    tick(2);
    expect(phase().name).toBe("desperate");
    expect(action()).toMatchObject({ sequence: "frenzy", active: false });
  });

  it("starts the brain's behavior fresh on a switch", () => {
    const { c, king, hurtTo, tick } = setup();
    c.brain.get(king)!.memory = { time: 3, stage: "dash" };
    hurtTo(0.6);

    tick();

    expect(c.brain.get(king)!.memory).toEqual({ time: 0 });
  });

  it("leaves enemies without phases alone", () => {
    const { world } = setup();
    const slimeDef = testEnemy({ weapon: testWeapon() });
    const slime = spawnEnemy(world, slimeDef, { x: 5, y: 5 });
    phaseSystem(world, DT);
    expect(world.components.enemy.get(slime)!.phase).toBeUndefined();
    expect(world.components.shooter.get(slime)!.weapon).toBe(slimeDef.weapon);
  });
});

describe("brain in a phase", () => {
  it("uses the phase's behavior over the enemy's own", () => {
    const { world, c, king, hurtTo, tick } = setup();
    const player = spawn(world);
    c.position.set(player, { x: 20, y: 10 });
    c.target.set(king, player);
    hurtTo(0.6);
    tick();

    brainSystem(world, DT);

    // Enraged chases straight at the target rather than circling it.
    expect(c.velocity.get(king)).toEqual({ x: 2.5, y: 0 });
  });
});

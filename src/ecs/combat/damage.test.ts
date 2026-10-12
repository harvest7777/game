import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { applyDamage } from "../shared/damage";
import { damageSystem, deathSystem } from "./damage";
import { testItem } from "../../testing/defs";
import { addHoldings } from "../inventory/bundle";

function setup(hp = 50) {
  const world = createWorld(createTiles(1, 1));
  const target = spawn(world);
  const attacker = spawn(world);
  world.components.health.set(target, { value: hp, max: 100 });
  const hpOf = () => world.components.health.get(target)!.value;
  return { world, target, attacker, hpOf };
}

describe("applyDamage", () => {
  it("takes the damage off health", () => {
    const { world, target, hpOf } = setup(50);
    applyDamage(world, target, 20);
    expect(hpOf()).toBe(30);
  });

  it("records the damage dealt, by whom", () => {
    const { world, target, attacker } = setup(50);
    applyDamage(world, target, 20, attacker);
    expect(world.events.damaged).toEqual([
      { target, amount: 20, source: attacker },
    ]);
  });

  it("records the full amount even past 0", () => {
    const { world, target } = setup(10);
    applyDamage(world, target, 25);
    expect(world.events.damaged[0].amount).toBe(25);
  });

  it("leaves something invulnerable at full health but still records the hit", () => {
    const { world, target, hpOf } = setup(50);
    world.components.invulnerable.set(target, true);

    applyDamage(world, target, 999);

    expect(hpOf()).toBe(50);
    expect(world.events.damaged).toHaveLength(1);
    expect(world.events.deaths).toHaveLength(0);
  });

  it("multiplies damage while a weak point is exposed", () => {
    const { world, target, attacker, hpOf } = setup(50);
    world.components.vulnerable.set(target, { multiplier: 2 });

    applyDamage(world, target, 15, attacker);

    expect(hpOf()).toBe(20);
    expect(world.events.damaged).toEqual([
      { target, amount: 30, source: attacker },
    ]);
  });

  it("subtracts defense down to fifteen percent of the hit", () => {
    const { world, target, hpOf } = setup(100);
    world.components.defense.set(target, { value: 90, max: 90 });

    applyDamage(world, target, 100);

    expect(hpOf()).toBe(85);
  });

  it("includes equipped Defense", () => {
    const { world, target, hpOf } = setup(100);
    world.components.defense.set(target, { value: 5, max: 25 });
    const armor = testItem({
      kind: "armor",
      weapon: undefined,
      bonuses: { defense: 10 },
    });
    addHoldings(world, target, { equipment: { armor } });

    applyDamage(world, target, 40);

    expect(hpOf()).toBe(75);
  });

  it("lets armor-piercing damage bypass defense", () => {
    const { world, target, hpOf } = setup(100);
    world.components.defense.set(target, { value: 90, max: 90 });

    applyDamage(world, target, 40, undefined, true);

    expect(hpOf()).toBe(60);
  });

  it("records nothing once it's at 0", () => {
    const { world, target } = setup(10);
    applyDamage(world, target, 25);
    applyDamage(world, target, 25);
    expect(world.events.damaged).toHaveLength(1);
  });

  it("stops at 0 and records the death with its killer", () => {
    const { world, target, attacker, hpOf } = setup(10);
    applyDamage(world, target, 25, attacker);
    expect(hpOf()).toBe(0);
    expect(world.events.deaths).toEqual([{ entity: target, killer: attacker }]);
  });

  it("records a death only once", () => {
    const { world, target } = setup(10);
    applyDamage(world, target, 25);
    applyDamage(world, target, 25);
    expect(world.events.deaths).toHaveLength(1);
  });

  it("does nothing to something without health", () => {
    const { world } = setup();
    const rock = spawn(world);
    applyDamage(world, rock, 25);
    expect(world.events.deaths).toHaveLength(0);
  });
});

describe("damageSystem", () => {
  it("applies every hit this tick", () => {
    const { world, target, attacker, hpOf } = setup(50);
    for (const damage of [10, 15]) {
      world.events.hits.push({
        projectile: attacker,
        target,
        owner: attacker,
        damage,
        armorPiercing: false,
      });
    }

    damageSystem(world, 0.05);

    expect(hpOf()).toBe(25);
  });
});

describe("deathSystem", () => {
  it("queues the dead for removal", () => {
    const { world, target } = setup();
    world.events.deaths.push({ entity: target });
    deathSystem(world, 0.05);
    expect(world.events.despawns).toEqual([target]);
  });

  it("removes the player too", () => {
    const { world, target } = setup();
    world.components.playerControlled.set(target, true);
    world.events.deaths.push({ entity: target });
    deathSystem(world, 0.05);
    expect(world.events.despawns).toEqual([target]);
  });
});

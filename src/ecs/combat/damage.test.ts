import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { applyDamage, damageSystem, deathSystem } from "./damage";

function setup(hp = 50) {
  const world = createWorld(createTiles(1, 1));
  const target = spawn(world);
  const attacker = spawn(world);
  world.components.health.set(target, { hp, max: 100 });
  const hpOf = () => world.components.health.get(target)!.hp;
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

  it("doesn't remove the player", () => {
    const { world, target } = setup();
    world.components.playerControlled.set(target, true);
    world.events.deaths.push({ entity: target });
    deathSystem(world, 0.05);
    expect(world.events.despawns).toHaveLength(0);
  });
});

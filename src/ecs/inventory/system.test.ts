import { describe, expect, it } from "vitest";
import { testConsumable, testItem } from "../../testing/defs";
import type { Command } from "../input/commands";
import { slotHotkeys } from "../input/commands";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { addHoldings } from "./bundle";
import { inventorySystem } from "./system";

const STAFF = testItem({ name: "Staff" });
const LANCE = testItem({ name: "Lance" });
const COMET = testItem({ name: "Comet" });
const PHANTOM = testItem({ name: "Phantom" });

function setup() {
  const world = createWorld(createTiles(1, 1));
  const player = spawn(world);
  world.components.playerControlled.set(player, true);
  world.components.team.set(player, "player");
  addHoldings(world, player, {
    equipment: { weapon: STAFF },
    carrying: [LANCE, COMET],
  });
  const c = world.components;
  const run = (...commands: Command[]) => {
    world.input.commands = commands;
    inventorySystem(world, 0.05);
  };
  return { world, player, c, run };
}

describe("addHoldings", () => {
  it("wears the weapon and carries the rest, arming the shooter", () => {
    const { player, c } = setup();
    expect(c.equipment.get(player)).toEqual({
      weapon: { def: STAFF },
      ability: null,
      armor: null,
      ring: null,
    });
    expect(c.inventory.get(player)!.slots).toEqual([
      { def: LANCE },
      { def: COMET },
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(c.shooter.get(player)!.weapon).toBe(STAFF.weapon);
  });
});

describe("inventorySystem", () => {
  it("equips from the inventory and switches what the player fires", () => {
    const { player, c, run } = setup();

    run({ kind: "equip", index: 0 });

    expect(c.equipment.get(player)!.weapon).toEqual({ def: LANCE });
    expect(c.inventory.get(player)!.slots[0]).toEqual({ def: STAFF });
    expect(c.shooter.get(player)!.weapon).toBe(LANCE.weapon);
  });

  it("keeps the shooter's cooldown when switching weapons", () => {
    const { player, c, run } = setup();
    c.shooter.get(player)!.cooldown = 0.2;
    run({ kind: "equip", index: 1 });
    expect(c.shooter.get(player)!.cooldown).toBe(0.2);
  });

  it("stops shooting when the weapon is unequipped, and starts again when one is worn", () => {
    const { player, c, run } = setup();

    run({
      kind: "move",
      from: { in: "equipment", slot: "weapon" },
      to: { in: "inventory", index: 5 },
    });
    expect(c.shooter.has(player)).toBe(false);

    run({ kind: "equip", index: 5 });
    expect(c.shooter.get(player)!.weapon).toBe(STAFF.weapon);
    expect(c.shooter.get(player)!.cooldown).toBe(0);
  });

  it("applies commands in order", () => {
    const { player, c, run } = setup();
    // Lance in, then the comet staff in, sending the lance back to slot 1.
    run({ kind: "equip", index: 0 }, { kind: "equip", index: 1 });
    expect(c.equipment.get(player)!.weapon).toEqual({ def: COMET });
    expect(c.inventory.get(player)!.slots.slice(0, 2)).toEqual([
      { def: STAFF },
      { def: LANCE },
    ]);
  });

  it("records each move that happened", () => {
    const { world, player, run } = setup();
    run({ kind: "equip", index: 0 }, { kind: "equip", index: 6 });
    expect(world.events.itemsMoved).toEqual([
      {
        entity: player,
        from: { in: "inventory", index: 0 },
        to: { in: "equipment", slot: "weapon" },
      },
    ]);
  });

  it("takes off what's worn into the first empty slot", () => {
    const { world, player, c, run } = setup();
    run({ kind: "unequip", slot: "weapon" });
    expect(c.equipment.get(player)!.weapon).toBeNull();
    expect(c.inventory.get(player)!.slots[2]).toEqual({ def: STAFF });
    expect(c.shooter.has(player)).toBe(false);
    expect(world.events.itemsMoved).toEqual([
      {
        entity: player,
        from: { in: "equipment", slot: "weapon" },
        to: { in: "inventory", index: 2 },
      },
    ]);
  });

  it("clamps Health and Mana when capacity gear comes off", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    world.components.health.set(player, { value: 140, max: 100 });
    world.components.mana.set(player, { value: 90, max: 80 });
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 50, mana: 20 },
    });
    addHoldings(world, player, { equipment: { ring } });
    world.input.commands = [{ kind: "unequip", slot: "ring" }];

    inventorySystem(world, 0.05);

    expect(world.components.health.get(player)!.value).toBe(100);
    expect(world.components.mana.get(player)!.value).toBe(80);
  });

  it("gives items into the first empty slot", () => {
    const { world, player, c, run } = setup();
    run({ kind: "give", item: PHANTOM });
    expect(c.inventory.get(player)!.slots[2]).toEqual({ def: PHANTOM });
    expect(world.events.itemsMoved).toEqual([
      { entity: player, to: { in: "inventory", index: 2 } },
    ]);
  });

  it("does nothing for commands that break the rules", () => {
    const { player, c, run } = setup();
    run({
      kind: "move",
      from: { in: "inventory", index: 0 },
      to: { in: "equipment", slot: "ring" },
    });
    expect(c.inventory.get(player)!.slots[0]).toEqual({ def: LANCE });
    expect(c.equipment.get(player)!.ring).toBeNull();
  });

  it("moves items between inventory and the currently open container", () => {
    const { world, player, c, run } = setup();
    const bag = spawn(world);
    c.container.set(bag, { slots: [{ def: PHANTOM }, null] });
    c.containerAccess.set(player, { container: bag });

    run({
      kind: "move",
      from: { in: "container", entity: bag, index: 0 },
      to: { in: "inventory", index: 1 },
    });

    expect(c.inventory.get(player)!.slots[1]).toEqual({ def: PHANTOM });
    expect(c.container.get(bag)!.slots[0]).toEqual({ def: COMET });
  });

  it("takes a container item into the first empty slot", () => {
    const { world, player, c, run } = setup();
    const bag = spawn(world);
    c.container.set(bag, { slots: [{ def: PHANTOM }] });
    c.containerAccess.set(player, { container: bag });

    run({
      kind: "take",
      from: { in: "container", entity: bag, index: 0 },
    });

    expect(c.inventory.get(player)!.slots[2]).toEqual({ def: PHANTOM });
    expect(c.container.get(bag)!.slots[0]).toBeNull();
    expect(world.events.itemsMoved).toEqual([
      {
        entity: player,
        from: { in: "container", entity: bag, index: 0 },
        to: { in: "inventory", index: 2 },
      },
    ]);
  });

  it("rejects transfers from a container the player cannot access", () => {
    const { world, c, run } = setup();
    const bag = spawn(world);
    c.container.set(bag, { slots: [{ def: PHANTOM }] });

    run({
      kind: "take",
      from: { in: "container", entity: bag, index: 0 },
    });

    expect(c.container.get(bag)!.slots[0]).toEqual({ def: PHANTOM });
  });
});

describe("slotHotkeys", () => {
  it("maps the number keys to equipping that slot", () => {
    expect(slotHotkeys.Digit1).toEqual({ kind: "equip", index: 0 });
    expect(slotHotkeys.Digit8).toEqual({ kind: "equip", index: 7 });
    expect(slotHotkeys.Digit9).toBeUndefined();
  });
});

describe("using consumables", () => {
  const POTION = testConsumable({
    name: "Health Potion",
    use: { kind: "heal", amount: 100 },
  });

  function hurt(hp: number) {
    const world = createWorld(createTiles(5, 5));
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    world.components.position.set(player, { x: 2, y: 2 });
    world.components.health.set(player, { value: hp, max: 500 });
    addHoldings(world, player, { carrying: [POTION] });
    const use = () => {
      world.input.commands = [{ kind: "equip", index: 0 }];
      inventorySystem(world, 0.05);
    };
    const hpOf = () => world.components.health.get(player)!.value;
    const slot = () => world.components.inventory.get(player)!.slots[0];
    return { world, player, use, hpOf, slot };
  }

  it("heals, uses the potion up and makes its sound", () => {
    const { world, player, use, hpOf, slot } = hurt(200);

    use();

    expect(hpOf()).toBe(300);
    expect(slot()).toBeNull();
    expect(world.events.healed).toEqual([{ target: player, amount: 100 }]);
    expect(world.events.soundCues).toEqual([
      { sound: "drink", at: { x: 2, y: 2 } },
    ]);
  });

  it("never heals past full", () => {
    const { use, hpOf } = hurt(450);
    use();
    expect(hpOf()).toBe(500);
  });

  it("heals into capacity from equipment", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    world.components.playerControlled.set(player, true);
    world.components.health.set(player, { value: 100, max: 100 });
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 50 },
    });
    addHoldings(world, player, {
      equipment: { ring },
      carrying: [POTION],
    });
    world.input.commands = [{ kind: "equip", index: 0 }];

    inventorySystem(world, 0.05);

    expect(world.components.health.get(player)!.value).toBe(150);
  });

  it("isn't wasted at full health", () => {
    const { use, slot } = hurt(500);
    use();
    expect(slot()).toEqual({ def: POTION });
  });
});

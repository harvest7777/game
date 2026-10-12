import { describe, expect, it } from "vitest";
import { testItem } from "../../testing/defs";
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
    weapon: STAFF,
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
});

describe("slotHotkeys", () => {
  it("maps the number keys to equipping that slot", () => {
    expect(slotHotkeys.Digit1).toEqual({ kind: "equip", index: 0 });
    expect(slotHotkeys.Digit8).toEqual({ kind: "equip", index: 7 });
    expect(slotHotkeys.Digit9).toBeUndefined();
  });
});

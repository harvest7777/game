import { describe, expect, it } from "vitest";
import type { Command } from "../input/commands";
import { slotHotkeys } from "../input/commands";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { addHoldings } from "./bundle";
import { inventorySystem } from "./system";

function setup() {
  const world = createWorld(createTiles(1, 1));
  const player = spawn(world);
  world.components.playerControlled.set(player, true);
  world.components.team.set(player, "player");
  addHoldings(world, player, {
    weapon: "apprenticeStaff",
    carrying: ["lance", "cometStaff"],
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
      weapon: { def: "apprenticeStaff" },
      ability: null,
      armor: null,
      ring: null,
    });
    expect(c.inventory.get(player)!.slots).toEqual([
      { def: "lance" },
      { def: "cometStaff" },
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(c.shooter.get(player)!.weapon).toBe("bolt");
  });
});

describe("inventorySystem", () => {
  it("equips from the inventory and switches what the player fires", () => {
    const { player, c, run } = setup();

    run({ kind: "equip", index: 0 });

    expect(c.equipment.get(player)!.weapon).toEqual({ def: "lance" });
    expect(c.inventory.get(player)!.slots[0]).toEqual({
      def: "apprenticeStaff",
    });
    expect(c.shooter.get(player)!.weapon).toBe("lance");
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
    expect(c.shooter.get(player)!.weapon).toBe("bolt");
    expect(c.shooter.get(player)!.cooldown).toBe(0);
  });

  it("applies commands in order", () => {
    const { player, c, run } = setup();
    // Lance in, then the comet staff in, sending the lance back to slot 1.
    run({ kind: "equip", index: 0 }, { kind: "equip", index: 1 });
    expect(c.equipment.get(player)!.weapon).toEqual({ def: "cometStaff" });
    expect(c.inventory.get(player)!.slots.slice(0, 2)).toEqual([
      { def: "apprenticeStaff" },
      { def: "lance" },
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

  it("gives items into the first empty slot", () => {
    const { world, player, c, run } = setup();
    run({ kind: "give", item: "phantomStaff" });
    expect(c.inventory.get(player)!.slots[2]).toEqual({ def: "phantomStaff" });
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
    expect(c.inventory.get(player)!.slots[0]).toEqual({ def: "lance" });
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

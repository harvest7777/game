import { describe, expect, it } from "vitest";
import { testItem } from "../../testing/defs";
import { INVENTORY_SIZE, type Item, type SlotRef } from "./components";
import type { ItemDef } from "./items";
import {
  equipFromInventory,
  fits,
  giveItem,
  moveItem,
  unequip,
  type Holdings,
} from "./slots";

const STAFF = testItem({ name: "Staff" });
const LANCE = testItem({ name: "Lance" });
const BOOMERANG = testItem({ name: "Boomerang" });
const COMET = testItem({ name: "Comet" });

const item = (def: ItemDef): Item => ({ def });
const inv = (index: number): SlotRef => ({ in: "inventory", index });
const worn = (slot: "weapon" | "ability" | "armor" | "ring"): SlotRef => ({
  in: "equipment",
  slot,
});

function holdings(weapon: Item | null, slots: (Item | null)[] = []): Holdings {
  return {
    equipment: { weapon, ability: null, armor: null, ring: null },
    inventory: {
      slots: Array.from({ length: INVENTORY_SIZE }, (_, i) => slots[i] ?? null),
    },
  };
}

describe("fits", () => {
  it("lets anything into the inventory", () => {
    expect(fits(item(LANCE), inv(3))).toBe(true);
  });

  it("only lets an item into the equipment slot for its kind", () => {
    expect(fits(item(LANCE), worn("weapon"))).toBe(true);
    expect(fits(item(LANCE), worn("ring"))).toBe(false);
  });

  it("lets an empty slot go anywhere", () => {
    expect(fits(null, worn("ring"))).toBe(true);
  });
});

describe("moveItem", () => {
  it("moves an item to an empty slot", () => {
    const h = holdings(null, [item(LANCE)]);
    expect(moveItem(h, inv(0), inv(5))).toBe(true);
    expect(h.inventory.slots[0]).toBeNull();
    expect(h.inventory.slots[5]).toEqual(item(LANCE));
  });

  it("swaps with what's already there", () => {
    const h = holdings(null, [item(LANCE), item(BOOMERANG)]);
    moveItem(h, inv(0), inv(1));
    expect(h.inventory.slots.slice(0, 2)).toEqual([
      item(BOOMERANG),
      item(LANCE),
    ]);
  });

  it("equips by moving into the matching equipment slot", () => {
    const h = holdings(item(STAFF), [item(LANCE)]);
    expect(moveItem(h, inv(0), worn("weapon"))).toBe(true);
    expect(h.equipment.weapon).toEqual(item(LANCE));
    expect(h.inventory.slots[0]).toEqual(item(STAFF));
  });

  it("unequips into an empty inventory slot", () => {
    const h = holdings(item(LANCE));
    expect(moveItem(h, worn("weapon"), inv(2))).toBe(true);
    expect(h.equipment.weapon).toBeNull();
    expect(h.inventory.slots[2]).toEqual(item(LANCE));
  });

  it("refuses an item in the wrong kind of equipment slot", () => {
    const h = holdings(null, [item(LANCE)]);
    expect(moveItem(h, inv(0), worn("armor"))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item(LANCE));
    expect(h.equipment.armor).toBeNull();
  });

  it("refuses a swap whose displaced item wouldn't fit where it goes", () => {
    // Only weapons exist so far, so set up an odd state on purpose: a lance
    // in the ring slot. Moving it out is fine on its own, but the boomerang
    // it would swap with can't go into the ring slot.
    const h = holdings(null, [item(BOOMERANG)]);
    h.equipment.ring = item(LANCE);

    expect(moveItem(h, worn("ring"), inv(0))).toBe(false);

    expect(h.equipment.ring).toEqual(item(LANCE));
    expect(h.inventory.slots[0]).toEqual(item(BOOMERANG));
  });

  it("does nothing moving out of an empty slot, or onto itself", () => {
    const h = holdings(null, [item(LANCE)]);
    expect(moveItem(h, inv(4), inv(0))).toBe(false);
    expect(moveItem(h, inv(0), inv(0))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item(LANCE));
  });

  it("does nothing with a slot that doesn't exist", () => {
    const h = holdings(null, [item(LANCE)]);
    expect(moveItem(h, inv(0), inv(99))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item(LANCE));
  });
});

describe("equipFromInventory", () => {
  it("puts the item in the slot for its kind, swapping out what was worn", () => {
    const h = holdings(item(STAFF), [null, null, item(LANCE)]);

    expect(equipFromInventory(h, 2)).toEqual(worn("weapon"));

    expect(h.equipment.weapon).toEqual(item(LANCE));
    expect(h.inventory.slots[2]).toEqual(item(STAFF));
  });

  it("does nothing for an empty slot", () => {
    const h = holdings(item(STAFF));
    expect(equipFromInventory(h, 0)).toBeUndefined();
    expect(h.equipment.weapon).toEqual(item(STAFF));
  });
});

describe("unequip", () => {
  it("moves what's worn into the first empty inventory slot", () => {
    const h = holdings(item(STAFF), [item(LANCE)]);
    expect(unequip(h, "weapon")).toEqual(inv(1));
    expect(h.equipment.weapon).toBeNull();
    expect(h.inventory.slots[1]).toEqual(item(STAFF));
  });

  it("does nothing when the inventory is full or the slot is empty", () => {
    const full = Array.from({ length: INVENTORY_SIZE }, () => item(LANCE));
    const h = holdings(item(STAFF), full);
    expect(unequip(h, "weapon")).toBeUndefined();
    expect(h.equipment.weapon).toEqual(item(STAFF));
    expect(unequip(holdings(null), "weapon")).toBeUndefined();
  });
});

describe("giveItem", () => {
  it("fills the first empty slot", () => {
    const h = holdings(null, [item(LANCE), null, item(BOOMERANG)]);
    expect(giveItem(h, item(COMET))).toBe(1);
    expect(h.inventory.slots[1]).toEqual(item(COMET));
  });

  it("does nothing when the inventory is full", () => {
    const full = Array.from({ length: INVENTORY_SIZE }, () => item(LANCE));
    const h = holdings(null, full);
    expect(giveItem(h, item(COMET))).toBeUndefined();
  });
});

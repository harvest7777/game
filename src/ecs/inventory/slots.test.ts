import { describe, expect, it } from "vitest";
import { INVENTORY_SIZE, type Item, type SlotRef } from "./components";
import type { ItemId } from "./items";
import {
  equipFromInventory,
  fits,
  giveItem,
  moveItem,
  type Holdings,
} from "./slots";

const item = (def: ItemId): Item => ({ def });
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
    expect(fits(item("lance"), inv(3))).toBe(true);
  });

  it("only lets an item into the equipment slot for its kind", () => {
    expect(fits(item("lance"), worn("weapon"))).toBe(true);
    expect(fits(item("lance"), worn("ring"))).toBe(false);
  });

  it("lets an empty slot go anywhere", () => {
    expect(fits(null, worn("ring"))).toBe(true);
  });
});

describe("moveItem", () => {
  it("moves an item to an empty slot", () => {
    const h = holdings(null, [item("lance")]);
    expect(moveItem(h, inv(0), inv(5))).toBe(true);
    expect(h.inventory.slots[0]).toBeNull();
    expect(h.inventory.slots[5]).toEqual(item("lance"));
  });

  it("swaps with what's already there", () => {
    const h = holdings(null, [item("lance"), item("boomerang")]);
    moveItem(h, inv(0), inv(1));
    expect(h.inventory.slots.slice(0, 2)).toEqual([
      item("boomerang"),
      item("lance"),
    ]);
  });

  it("equips by moving into the matching equipment slot", () => {
    const h = holdings(item("apprenticeStaff"), [item("lance")]);
    expect(moveItem(h, inv(0), worn("weapon"))).toBe(true);
    expect(h.equipment.weapon).toEqual(item("lance"));
    expect(h.inventory.slots[0]).toEqual(item("apprenticeStaff"));
  });

  it("unequips into an empty inventory slot", () => {
    const h = holdings(item("lance"));
    expect(moveItem(h, worn("weapon"), inv(2))).toBe(true);
    expect(h.equipment.weapon).toBeNull();
    expect(h.inventory.slots[2]).toEqual(item("lance"));
  });

  it("refuses an item in the wrong kind of equipment slot", () => {
    const h = holdings(null, [item("lance")]);
    expect(moveItem(h, inv(0), worn("armor"))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item("lance"));
    expect(h.equipment.armor).toBeNull();
  });

  it("refuses a swap whose displaced item wouldn't fit where it goes", () => {
    // Only weapons exist so far, so set up an odd state on purpose: a lance
    // in the ring slot. Moving it out is fine on its own, but the boomerang
    // it would swap with can't go into the ring slot.
    const h = holdings(null, [item("boomerang")]);
    h.equipment.ring = item("lance");

    expect(moveItem(h, worn("ring"), inv(0))).toBe(false);

    expect(h.equipment.ring).toEqual(item("lance"));
    expect(h.inventory.slots[0]).toEqual(item("boomerang"));
  });

  it("does nothing moving out of an empty slot, or onto itself", () => {
    const h = holdings(null, [item("lance")]);
    expect(moveItem(h, inv(4), inv(0))).toBe(false);
    expect(moveItem(h, inv(0), inv(0))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item("lance"));
  });

  it("does nothing with a slot that doesn't exist", () => {
    const h = holdings(null, [item("lance")]);
    expect(moveItem(h, inv(0), inv(99))).toBe(false);
    expect(h.inventory.slots[0]).toEqual(item("lance"));
  });
});

describe("equipFromInventory", () => {
  it("puts the item in the slot for its kind, swapping out what was worn", () => {
    const h = holdings(item("apprenticeStaff"), [null, null, item("lance")]);

    expect(equipFromInventory(h, 2)).toEqual(worn("weapon"));

    expect(h.equipment.weapon).toEqual(item("lance"));
    expect(h.inventory.slots[2]).toEqual(item("apprenticeStaff"));
  });

  it("does nothing for an empty slot", () => {
    const h = holdings(item("apprenticeStaff"));
    expect(equipFromInventory(h, 0)).toBeUndefined();
    expect(h.equipment.weapon).toEqual(item("apprenticeStaff"));
  });
});

describe("giveItem", () => {
  it("fills the first empty slot", () => {
    const h = holdings(null, [item("lance"), null, item("boomerang")]);
    expect(giveItem(h, item("cometStaff"))).toBe(1);
    expect(h.inventory.slots[1]).toEqual(item("cometStaff"));
  });

  it("does nothing when the inventory is full", () => {
    const full = Array.from({ length: INVENTORY_SIZE }, () => item("lance"));
    const h = holdings(null, full);
    expect(giveItem(h, item("cometStaff"))).toBeUndefined();
  });
});

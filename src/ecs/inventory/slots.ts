import type { Equipment, Inventory, Item, SlotRef } from "./components";
import { itemDef } from "./items";

// Everything an entity holds, for the rules below.
export type Holdings = { equipment: Equipment; inventory: Inventory };

// The item in a slot, null when it's empty, or undefined when there's no
// such slot.
export function itemAt(h: Holdings, ref: SlotRef): Item | null | undefined {
  if (ref.in === "equipment") return h.equipment[ref.slot];
  return h.inventory.slots[ref.index];
}

function put(h: Holdings, ref: SlotRef, item: Item | null): void {
  if (ref.in === "equipment") h.equipment[ref.slot] = item;
  else h.inventory.slots[ref.index] = item;
}

// Whether `item` may sit in `ref`: anything goes in the inventory, but an
// equipment slot only takes its own kind. Emptiness fits anywhere.
export function fits(item: Item | null, ref: SlotRef): boolean {
  if (!item || ref.in === "inventory") return true;
  return itemDef(item.def).kind === ref.slot;
}

// Moves the item in `from` to `to`, swapping with whatever is there. Both
// items must fit where they end up, or nothing happens. Returns whether
// anything moved.
export function moveItem(h: Holdings, from: SlotRef, to: SlotRef): boolean {
  const moving = itemAt(h, from);
  const displaced = itemAt(h, to);
  if (!moving || displaced === undefined) return false;
  if (sameSlot(from, to)) return false;
  if (!fits(moving, to) || !fits(displaced, from)) return false;
  put(h, to, moving);
  put(h, from, displaced);
  return true;
}

// Equips the item in inventory slot `index` into the slot for its kind,
// swapping out what was worn. Returns where it went, if anywhere.
export function equipFromInventory(
  h: Holdings,
  index: number,
): SlotRef | undefined {
  const item = h.inventory.slots[index];
  if (!item) return undefined;
  const to: SlotRef = { in: "equipment", slot: itemDef(item.def).kind };
  return moveItem(h, { in: "inventory", index }, to) ? to : undefined;
}

// Puts `item` in the first empty inventory slot. Returns which, if any.
export function giveItem(h: Holdings, item: Item): number | undefined {
  const index = h.inventory.slots.indexOf(null);
  if (index === -1) return undefined;
  h.inventory.slots[index] = item;
  return index;
}

function sameSlot(a: SlotRef, b: SlotRef): boolean {
  if (a.in === "equipment" && b.in === "equipment") return a.slot === b.slot;
  if (a.in === "inventory" && b.in === "inventory") return a.index === b.index;
  return false;
}

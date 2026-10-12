import type { ItemId, ItemKind } from "./items";

// One item someone owns. An object rather than a bare id so per-copy data
// (soulbound, enchantments) can be added later without a refactor.
export type Item = { def: ItemId };

export const INVENTORY_SIZE = 8;

// What's worn: one slot per kind of item, each empty or holding one.
export type Equipment = Record<ItemKind, Item | null>;

// General-purpose slots that take any item.
export type Inventory = { slots: (Item | null)[] };

// Names any one slot, so a single kind of move covers equipping,
// unequipping and rearranging.
export type SlotRef =
  { in: "equipment"; slot: ItemKind } | { in: "inventory"; index: number };

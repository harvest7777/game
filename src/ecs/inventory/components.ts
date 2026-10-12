import { ITEM_KINDS, type ItemDef, type ItemKind } from "./items";
import type { Entity } from "../world";

// One item someone owns. An object rather than a bare id so per-copy data
// (soulbound, enchantments) can be added later without a refactor.
export type Item = { def: ItemDef };

export const INVENTORY_SIZE = 8;

// What's worn: one slot per kind of item, each empty or holding one.
export type Equipment = Record<ItemKind, Item | null>;

// Equipment with every slot empty.
export function emptyEquipment(): Equipment {
  return Object.fromEntries(
    ITEM_KINDS.map((kind) => [kind, null]),
  ) as Equipment;
}

// General-purpose slots that take any item.
export type Inventory = { slots: (Item | null)[] };

// Names any one slot, so a single kind of move covers equipping,
// unequipping and rearranging.
export type HoldingSlotRef =
  { in: "equipment"; slot: ItemKind } | { in: "inventory"; index: number };

// World-container refs include the entity so commands remain unambiguous when
// many containers exist. The inventory system still validates current access.
export type ContainerSlotRef = {
  in: "container";
  entity: Entity;
  index: number;
};

export type SlotRef = HoldingSlotRef | ContainerSlotRef;

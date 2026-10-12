import type { Entity, World } from "../world";
import type {
  ContainerSlotRef,
  Equipment,
  HoldingSlotRef,
  Inventory,
  Item,
  SlotRef,
} from "./components";
import { isEquipmentItem, type ItemKind } from "./items";

// Everything an entity holds, for the rules below.
export type Holdings = { equipment: Equipment; inventory: Inventory };

// The item in a slot, null when it's empty, or undefined when there's no
// such slot.
export function itemAt(
  h: Holdings,
  ref: HoldingSlotRef,
): Item | null | undefined {
  if (ref.in === "equipment") return h.equipment[ref.slot];
  return h.inventory.slots[ref.index];
}

function put(h: Holdings, ref: HoldingSlotRef, item: Item | null): void {
  if (ref.in === "equipment") h.equipment[ref.slot] = item;
  else h.inventory.slots[ref.index] = item;
}

// Whether `item` may sit in `ref`: anything goes in the inventory, but an
// equipment slot only takes its own kind. Emptiness fits anywhere.
export function fits(item: Item | null, ref: SlotRef): boolean {
  if (!item || ref.in !== "equipment") return true;
  return isEquipmentItem(item.def) && item.def.kind === ref.slot;
}

// Moves the item in `from` to `to`, swapping with whatever is there. Both
// items must fit where they end up, or nothing happens. Returns whether
// anything moved.
export function moveItem(
  h: Holdings,
  from: HoldingSlotRef,
  to: HoldingSlotRef,
): boolean {
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
): HoldingSlotRef | undefined {
  const item = h.inventory.slots[index];
  if (!item || !isEquipmentItem(item.def)) return undefined;
  const to: HoldingSlotRef = { in: "equipment", slot: item.def.kind };
  return moveItem(h, { in: "inventory", index }, to) ? to : undefined;
}

// Takes off what's worn in `slot`, putting it in the first empty inventory
// slot. Returns where it went, if anywhere.
export function unequip(
  h: Holdings,
  slot: ItemKind,
): HoldingSlotRef | undefined {
  const index = h.inventory.slots.indexOf(null);
  if (index === -1) return undefined;
  const to: HoldingSlotRef = { in: "inventory", index };
  return moveItem(h, { in: "equipment", slot }, to) ? to : undefined;
}

// Puts `item` in the first empty inventory slot. Returns which, if any.
export function giveItem(h: Holdings, item: Item): number | undefined {
  const index = h.inventory.slots.indexOf(null);
  if (index === -1) return undefined;
  h.inventory.slots[index] = item;
  return index;
}

export function sameSlot(a: SlotRef, b: SlotRef): boolean {
  if (a.in === "equipment" && b.in === "equipment") return a.slot === b.slot;
  if (a.in === "inventory" && b.in === "inventory") return a.index === b.index;
  if (a.in === "container" && b.in === "container") {
    return a.entity === b.entity && a.index === b.index;
  }
  return false;
}

// Reads any slot address. Presentation may use this without granting access;
// mutations below separately require the container to be open for the owner.
export function itemAtSlot(
  world: World,
  owner: Entity,
  ref: SlotRef,
): Item | null | undefined {
  if (ref.in === "container") {
    return world.components.container.get(ref.entity)?.slots[ref.index];
  }
  const holdings = holdingsOf(world, owner);
  return holdings ? itemAt(holdings, ref) : undefined;
}

// Moves or swaps across owned and world-container slots. Any referenced
// world container must be the one the owner can currently access.
export function moveBetweenSlots(
  world: World,
  owner: Entity,
  from: SlotRef,
  to: SlotRef,
): boolean {
  if (!canAccess(world, owner, from) || !canAccess(world, owner, to)) {
    return false;
  }
  if (sameSlot(from, to)) return false;
  const moving = itemAtSlot(world, owner, from);
  const displaced = itemAtSlot(world, owner, to);
  if (!moving || displaced === undefined) return false;
  if (!fits(moving, to) || !fits(displaced, from)) return false;
  if (!putAtSlot(world, owner, to, moving)) return false;
  if (!putAtSlot(world, owner, from, displaced)) {
    putAtSlot(world, owner, to, displaced);
    return false;
  }
  return true;
}

// Takes a specific item from the open container into the first empty
// inventory slot. Returns the destination when it succeeds.
export function takeFromContainer(
  world: World,
  owner: Entity,
  from: ContainerSlotRef,
): HoldingSlotRef | undefined {
  const inventory = world.components.inventory.get(owner);
  if (!inventory) return undefined;
  const index = inventory.slots.indexOf(null);
  if (index === -1) return undefined;
  const to: HoldingSlotRef = { in: "inventory", index };
  return moveBetweenSlots(world, owner, from, to) ? to : undefined;
}

function holdingsOf(world: World, entity: Entity): Holdings | undefined {
  const equipment = world.components.equipment.get(entity);
  const inventory = world.components.inventory.get(entity);
  return equipment && inventory ? { equipment, inventory } : undefined;
}

function canAccess(world: World, owner: Entity, ref: SlotRef): boolean {
  return (
    ref.in !== "container" ||
    world.components.containerAccess.get(owner)?.container === ref.entity
  );
}

function putAtSlot(
  world: World,
  owner: Entity,
  ref: SlotRef,
  item: Item | null,
): boolean {
  if (ref.in === "container") {
    const container = world.components.container.get(ref.entity);
    if (!container || container.slots[ref.index] === undefined) return false;
    container.slots[ref.index] = item;
    return true;
  }
  const holdings = holdingsOf(world, owner);
  if (!holdings || itemAt(holdings, ref) === undefined) return false;
  put(holdings, ref, item);
  return true;
}

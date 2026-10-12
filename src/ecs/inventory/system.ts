import { armWithEquippedWeapon } from "../shared/arming";
import { clampResources } from "../stats/runtime";
import type { Entity, World } from "../world";
import type { SlotRef } from "./components";
import { isEquipmentItem } from "./items";
import { applyEffect } from "./use";
import {
  equipFromInventory,
  giveItem,
  moveBetweenSlots,
  takeFromContainer,
  unequip,
  type Holdings,
} from "./slots";

// Applies the player's item commands, in order, recording each move that
// happened as an ItemMoved event. Commands that break the rules do nothing.
// Equipping a consumable uses it instead: it takes effect, is used up and
// makes its sound, unless it would do nothing. Afterwards the shooter
// matches the equipped weapon, and resources are clamped if taking gear off
// lowered their effective capacity.
export function inventorySystem(world: World, _dt: number): void {
  const { commands } = world.input;
  if (commands.length === 0) return;

  for (const [entity] of world.components.playerControlled) {
    const h = holdingsOf(world, entity);
    if (!h) continue;

    for (const command of commands) {
      if (command.kind === "move") {
        if (moveBetweenSlots(world, entity, command.from, command.to)) {
          moved(world, entity, command.to, command.from);
        }
      } else if (command.kind === "take") {
        const to = takeFromContainer(world, entity, command.from);
        if (to) moved(world, entity, to, command.from);
      } else if (command.kind === "equip") {
        const item = h.inventory.slots[command.index];
        if (item && !isEquipmentItem(item.def)) {
          useFromInventory(world, entity, h, command.index);
          continue;
        }
        const to = equipFromInventory(h, command.index);
        if (to)
          moved(world, entity, to, { in: "inventory", index: command.index });
      } else if (command.kind === "unequip") {
        const from: SlotRef = { in: "equipment", slot: command.slot };
        const to = unequip(h, command.slot);
        if (to) moved(world, entity, to, from);
      } else if (command.kind === "give") {
        const index = giveItem(h, { def: command.item });
        if (index !== undefined)
          moved(world, entity, { in: "inventory", index });
      }
    }
    armWithEquippedWeapon(world, entity);
    clampResources(world, entity);
  }
}

function holdingsOf(world: World, entity: Entity): Holdings | undefined {
  const equipment = world.components.equipment.get(entity);
  const inventory = world.components.inventory.get(entity);
  return equipment && inventory ? { equipment, inventory } : undefined;
}

function moved(world: World, entity: Entity, to: SlotRef, from?: SlotRef) {
  world.events.itemsMoved.push({ entity, to, ...(from && { from }) });
}

// Uses the consumable in inventory slot `index`, emptying the slot if it
// took effect.
function useFromInventory(
  world: World,
  entity: Entity,
  h: Holdings,
  index: number,
): void {
  const item = h.inventory.slots[index];
  if (!item || isEquipmentItem(item.def)) return;
  if (!applyEffect(world, entity, item.def.use)) return;
  h.inventory.slots[index] = null;
  const at = world.components.position.get(entity);
  if (at) world.events.soundCues.push({ sound: "drink", at: { ...at } });
}

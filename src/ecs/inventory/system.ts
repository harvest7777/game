import { addShooter } from "../bundles";
import type { Entity, World } from "../world";
import type { SlotRef } from "./components";
import { itemDef } from "./items";
import { equipFromInventory, giveItem, moveItem, type Holdings } from "./slots";

// Applies the player's item commands, in order, recording each move that
// happened as an ItemMoved event. Commands that break the rules do nothing.
// Afterwards the shooter matches the equipped weapon.
export function inventorySystem(world: World, _dt: number): void {
  const { commands } = world.input;
  if (commands.length === 0) return;

  for (const [entity] of world.components.playerControlled) {
    const h = holdingsOf(world, entity);
    if (!h) continue;

    for (const command of commands) {
      if (command.kind === "move") {
        if (moveItem(h, command.from, command.to)) {
          moved(world, entity, command.to, command.from);
        }
      } else if (command.kind === "equip") {
        const to = equipFromInventory(h, command.index);
        if (to)
          moved(world, entity, to, { in: "inventory", index: command.index });
      } else {
        const index = giveItem(h, { def: command.item });
        if (index !== undefined)
          moved(world, entity, { in: "inventory", index });
      }
    }
    armWithEquippedWeapon(world, entity);
  }
}

// Makes the entity's shooter fire its equipped weapon, keeping its cooldown
// so swapping can't skip it; with no weapon equipped it can't shoot.
export function armWithEquippedWeapon(world: World, entity: Entity): void {
  const worn = world.components.equipment.get(entity)?.weapon;
  const weapon = worn ? itemDef(worn.def).weapon : undefined;
  const shooter = world.components.shooter.get(entity);
  if (!weapon) world.components.shooter.delete(entity);
  else if (shooter) shooter.weapon = weapon;
  else {
    const team = world.components.team.get(entity) ?? "player";
    addShooter(world, entity, { weapon, team });
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

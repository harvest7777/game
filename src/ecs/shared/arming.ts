import { addShooter } from "../bundles";
import { phaseOf } from "../enemy/definitions";
import type { Entity, World } from "../world";

// Keeps an entity's Shooter in step with what it should fire.

// Makes the entity's shooter fire its equipped weapon, keeping its cooldown
// so swapping can't skip it; with no weapon equipped it can't shoot.
export function armWithEquippedWeapon(world: World, entity: Entity): void {
  const worn = world.components.equipment.get(entity)?.weapon;
  const weapon = worn?.def.weapon;
  const shooter = world.components.shooter.get(entity);
  if (!weapon) world.components.shooter.delete(entity);
  else if (shooter) shooter.weapon = weapon;
  else addShooter(world, entity, { weapon });
}

// Gives an enemy the weapon its current phase calls for (or its own if the
// phase doesn't say), or takes its weapon away for a phase that holds fire.
// Keeps the cooldown when it already had one, so switching weapons doesn't
// let it fire early.
export function armForPhase(world: World, entity: Entity): void {
  const enemy = world.components.enemy.get(entity);
  if (!enemy) return;
  const { def } = enemy;
  // Authored action timelines fire their weapons from timed cues, never from
  // generic Shooter autofire.
  if (phaseOf(def, enemy.phase?.name)?.rotation) {
    world.components.shooter.delete(entity);
    return;
  }
  const phaseWeapon = phaseOf(def, enemy.phase?.name)?.weapon;
  const weapon = phaseWeapon === undefined ? def.weapon : phaseWeapon;

  const shooter = world.components.shooter.get(entity);
  if (!weapon) world.components.shooter.delete(entity);
  else if (shooter) shooter.weapon = weapon;
  else addShooter(world, entity, { weapon });
}

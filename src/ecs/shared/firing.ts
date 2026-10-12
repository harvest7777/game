import { Action } from "../input/actions";
import { fireProjectile } from "../projectile/spawn";
import { volley, type WeaponDef } from "../projectile/weapons";
import type { Vec2 } from "./physics/math";
import type { Entity, World } from "../world";
import { damageMultiplier } from "../stats/runtime";

export type FireWeaponOptions = {
  entity: Entity;
  weapon: WeaponDef;
  at: Vec2;
  aim: Vec2;
  // Starts every projectile this far along its own direction. Boss rings use
  // this to leave a deliberate safe pocket inside their hitbox.
  offset?: number;
};

// Fires a weapon once. Boss action cues share this path with Shooter autofire
// so patterns, teams, projectile metadata and sound events remain identical.
export function fireWeapon(
  world: World,
  { entity, weapon, at, aim, offset = 0 }: FireWeaponOptions,
): void {
  const team = world.components.team.get(entity);
  if (!team) throw new Error(`entity ${entity} fired without a team`);
  world.events.shotsFired.push({
    weapon,
    owner: entity,
    at: { ...at },
  });
  for (const { fired, direction: toward } of volley(weapon, aim)) {
    fireProjectile(world, {
      def: fired.projectile,
      mirror: fired.mirror,
      owner: entity,
      team,
      at: { x: at.x + toward.x * offset, y: at.y + toward.y * offset },
      toward,
      damageScale: damageMultiplier(world, entity),
    });
  }
}

// Whether a shooter means to fire: the player while autofire is on or the
// Shoot action is held (the left mouse button), and anything else always.
export function wantsToFire(world: World, entity: Entity): boolean {
  if (!world.components.playerControlled.has(entity)) return true;
  return (
    world.components.autoFire.get(entity) === true ||
    world.input.held.has(Action.Shoot)
  );
}

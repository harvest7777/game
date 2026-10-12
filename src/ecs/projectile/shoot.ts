import type { Vec2 } from "../shared/physics/math";
import type { Entity, World } from "../world";
import { fireProjectile } from "./spawn";
import { volley, weaponDef, type WeaponId } from "./weapons";

// Autofire: every shooter fires its weapon at the weapon's rate, from where
// it stands, every projectile of each shot at once.
//
// Each tick it also records where the shooter is aiming, which is the way it
// faces while shooting. The player aims at the cursor; anything else aims at
// its target and only fires while it has one. Failing those (e.g. before the
// cursor has been over the game) it aims the way it's moving, or keeps its
// last aim when standing still.
//
// A rate faster than the tick rate fires several shots in one tick, so the
// rate holds exactly.
export function shootSystem(world: World, dt: number): void {
  const { shooter, position } = world.components;
  for (const [entity, s] of shooter) {
    const at = position.get(entity);
    if (!at) continue;
    const weapon = weaponDef(s.weapon);
    s.aim = aimOf(world, entity, at, s.aim);

    // Only the player fires without a target. Anything else holds fire,
    // ready to shoot the moment it has something to shoot at.
    const player = world.components.playerControlled.has(entity);
    if (player && world.components.autoFire.get(entity) === false) {
      s.cooldown = Math.max(0, s.cooldown - dt);
      continue;
    }
    if (!player && targetPosition(world, entity) === undefined) {
      s.cooldown = Math.max(0, s.cooldown - dt);
      continue;
    }

    s.cooldown -= dt;
    while (s.cooldown <= 0) {
      fireWeapon(world, { entity, weapon: s.weapon, at, aim: s.aim });
      s.cooldown += 1 / weapon.rate;
    }
  }
}

type FireWeaponOptions = {
  entity: Entity;
  weapon: WeaponId;
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
  { entity, weapon: weaponId, at, aim, offset = 0 }: FireWeaponOptions,
): void {
  const weapon = weaponDef(weaponId);
  world.events.shotsFired.push({
    projectile: weapon.projectile,
    owner: entity,
    at: { ...at },
  });
  for (const toward of volley(weapon, aim)) {
    fireProjectile(world, {
      def: weapon.projectile,
      owner: entity,
      team: world.components.team.get(entity) ?? "enemy",
      at: { x: at.x + toward.x * offset, y: at.y + toward.y * offset },
      toward,
    });
  }
}

function aimOf(
  world: World,
  entity: Entity,
  at: Vec2,
  previous: Vec2 | undefined,
): Vec2 {
  const { aim } = world.input;
  if (world.components.playerControlled.has(entity) && aim) {
    const toCursor = unit({ x: aim.x - at.x, y: aim.y - at.y });
    if (toCursor) return toCursor;
  }
  const target = targetPosition(world, entity);
  if (target) {
    const toTarget = unit({ x: target.x - at.x, y: target.y - at.y });
    if (toTarget) return toTarget;
  }
  const moving = unit(world.components.velocity.get(entity));
  return (
    moving ?? previous ?? world.components.facing.get(entity) ?? { x: 1, y: 0 }
  );
}

function targetPosition(world: World, entity: Entity): Vec2 | undefined {
  const target = world.components.target.get(entity);
  return target === undefined
    ? undefined
    : world.components.position.get(target);
}

function unit(v: Vec2 | undefined): Vec2 | undefined {
  if (!v) return undefined;
  const length = Math.hypot(v.x, v.y);
  if (length === 0) return undefined;
  return { x: v.x / length, y: v.y / length };
}

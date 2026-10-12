import type { Vec2 } from "../shared/physics/math";
import type { Entity, World } from "../world";
import type { ProjectileId } from "./definitions";
import { fireProjectile } from "./spawn";
import { volley, weaponDef } from "./weapons";

// Autofire: every shooter fires its weapon at the weapon's rate, from where
// it stands, every projectile of each shot at once.
//
// Each tick it also records where the shooter is aiming, which is the way it
// faces while shooting. The player aims at the cursor. Otherwise (or before
// the cursor has been over the game) it aims the way it's moving, or keeps
// its last aim when standing still.
//
// A rate faster than the tick rate fires several shots in one tick, so the
// rate holds exactly.
export function shootSystem(world: World, dt: number): void {
  const { shooter, position, team } = world.components;
  const shots: {
    owner: Entity;
    projectile: ProjectileId;
    at: Vec2;
    toward: Vec2;
  }[] = [];

  for (const [entity, s] of shooter) {
    const at = position.get(entity);
    if (!at) continue;
    const weapon = weaponDef(s.weapon);
    s.aim = aimOf(world, entity, at, s.aim);

    s.cooldown -= dt;
    while (s.cooldown <= 0) {
      for (const toward of volley(weapon, s.aim)) {
        shots.push({
          owner: entity,
          projectile: weapon.projectile,
          at,
          toward,
        });
      }
      s.cooldown += 1 / weapon.rate;
    }
  }

  // Fired after the loop so new entities aren't added mid-iteration.
  for (const shot of shots) {
    fireProjectile(world, {
      def: shot.projectile,
      owner: shot.owner,
      team: team.get(shot.owner) ?? "enemy",
      at: shot.at,
      toward: shot.toward,
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
  const moving = unit(world.components.velocity.get(entity));
  return (
    moving ?? previous ?? world.components.facing.get(entity) ?? { x: 1, y: 0 }
  );
}

function unit(v: Vec2 | undefined): Vec2 | undefined {
  if (!v) return undefined;
  const length = Math.hypot(v.x, v.y);
  if (length === 0) return undefined;
  return { x: v.x / length, y: v.y / length };
}

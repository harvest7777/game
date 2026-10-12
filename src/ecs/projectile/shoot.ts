import type { Vec2 } from "../shared/physics/math";
import type { Entity, World } from "../world";
import { fireProjectile } from "./spawn";

// Autofire: every shooter fires its projectile at its rate, from where it
// stands. The player aims at the cursor; anything else (or the player before
// the cursor has been over the game) fires the way it's facing.
//
// A rate faster than the tick rate fires several shots in one tick, so the
// rate holds exactly.
export function shootSystem(world: World, dt: number): void {
  const { shooter, position, team } = world.components;
  const shots: { owner: Entity; at: Vec2; toward: Vec2 }[] = [];

  for (const [entity, s] of shooter) {
    const at = position.get(entity);
    if (!at) continue;
    s.cooldown -= dt;
    while (s.cooldown <= 0) {
      shots.push({ owner: entity, at, toward: aimOf(world, entity, at) });
      s.cooldown += 1 / s.rate;
    }
  }

  // Fired after the loop so new entities aren't added mid-iteration.
  for (const shot of shots) {
    fireProjectile(world, {
      def: shooter.get(shot.owner)!.projectile,
      owner: shot.owner,
      team: team.get(shot.owner) ?? "enemy",
      at: shot.at,
      toward: shot.toward,
    });
  }
}

function aimOf(world: World, entity: Entity, at: Vec2): Vec2 {
  const { aim } = world.input;
  if (world.components.playerControlled.has(entity) && aim) {
    const toward = { x: aim.x - at.x, y: aim.y - at.y };
    if (toward.x !== 0 || toward.y !== 0) return toward;
  }
  return world.components.facing.get(entity) ?? { x: 1, y: 0 };
}

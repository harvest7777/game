import { opponents, targetsByTeam } from "../combat/teams";
import type { Team } from "../projectile/components";
import type { Entity, World } from "../world";
import { enemyDef } from "./definitions";

// Picks each enemy's target: the nearest living thing on another team within
// its detection range. With nothing in range it has no target, so it stops
// chasing and shooting until something comes back.
export function aggroSystem(world: World, _dt: number): void {
  const { enemy, position, team, health, target } = world.components;
  const byTeam = targetsByTeam(world);
  const opponentsOf = new Map<Team | undefined, Entity[]>();

  for (const [entity, e] of enemy) {
    const at = position.get(entity);
    if (!at) continue;
    const side = team.get(entity);
    const range = enemyDef(e.def).detectRange;

    let nearest: Entity | undefined;
    let nearestDistance = Infinity;
    if (!opponentsOf.has(side)) opponentsOf.set(side, opponents(byTeam, side));
    for (const other of opponentsOf.get(side)!) {
      const otherAt = position.get(other)!;
      if (health.get(other)!.hp <= 0) continue;
      const distance = Math.hypot(otherAt.x - at.x, otherAt.y - at.y);
      if (distance <= range && distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    if (nearest === undefined) target.delete(entity);
    else target.set(entity, nearest);
  }
}

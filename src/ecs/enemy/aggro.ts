import { opponents, targetsByTeam } from "../shared/teams";
import type { Team } from "../projectile/components";
import { clearLine } from "../tiles";
import type { Entity, World } from "../world";

// Picks each enemy's target: the nearest living thing on another team within
// its detection range that it can see, with no wall or void in between. Once
// it has a target it keeps it while it's in range, seen or not, so ducking
// behind a pillar doesn't shake it. With nothing in range it has no target,
// so it stops chasing and shooting until something comes back.
export function aggroSystem(world: World, _dt: number): void {
  const { enemy, position, team, health, target } = world.components;
  const byTeam = targetsByTeam(world);
  const opponentsOf = new Map<Team | undefined, Entity[]>();

  for (const [entity, e] of enemy) {
    if (world.components.asleep.has(entity)) continue;
    const at = position.get(entity);
    if (!at) continue;
    const side = team.get(entity);
    const range = e.def.detectRange;

    const current = target.get(entity);
    const currentAt = current === undefined ? undefined : position.get(current);
    if (
      current !== undefined &&
      currentAt &&
      (health.get(current)?.value ?? 0) > 0 &&
      team.get(current) !== side &&
      Math.hypot(currentAt.x - at.x, currentAt.y - at.y) <= range
    ) {
      continue;
    }

    let nearest: Entity | undefined;
    let nearestDistance = Infinity;
    if (!opponentsOf.has(side)) opponentsOf.set(side, opponents(byTeam, side));
    for (const other of opponentsOf.get(side)!) {
      const otherAt = position.get(other)!;
      if (health.get(other)!.value <= 0) continue;
      const distance = Math.hypot(otherAt.x - at.x, otherAt.y - at.y);
      if (
        distance <= range &&
        distance < nearestDistance &&
        clearLine(world.tiles, at, otherAt)
      ) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    if (nearest === undefined) target.delete(entity);
    else target.set(entity, nearest);
  }
}

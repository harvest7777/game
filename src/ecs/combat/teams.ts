import type { Team } from "../projectile/components";
import type { Entity, World } from "../world";

// Everything that can be hit or targeted (has health, a team and a
// position), grouped by team. Built once a tick so each attacker only looks
// at the other teams instead of every entity: with thousands of enemies,
// that's the difference between checking one player and checking everyone.
export function targetsByTeam(world: World): Map<Team, Entity[]> {
  const { health, team, position } = world.components;
  const byTeam = new Map<Team, Entity[]>();
  for (const [entity] of health) {
    const side = team.get(entity);
    if (side === undefined || !position.has(entity)) continue;
    let list = byTeam.get(side);
    if (!list) byTeam.set(side, (list = []));
    list.push(entity);
  }
  return byTeam;
}

// Every target not on `side`.
export function opponents(
  byTeam: Map<Team, Entity[]>,
  side: Team | undefined,
): Entity[] {
  const out: Entity[] = [];
  for (const [team, entities] of byTeam) {
    if (team !== side) out.push(...entities);
  }
  return out;
}

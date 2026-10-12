import { projectileDef } from "../projectile/definitions";
import {
  penetrationCircleCircle,
  sweptCircleCircle,
} from "../shared/physics/geometry";
import type { Vec2 } from "../shared/physics/math";
import type { Team } from "../projectile/components";
import type { Entity, World } from "../world";
import { opponents, targetsByTeam } from "./teams";

// Finds projectiles that touched something with health on another team this
// tick, and records each as a Hit. Runs after movement, comparing where both
// moved from and to over the tick, so a fast projectile can't skip through a
// target and a target can't step through one.
//
// A projectile that doesn't pierce hits only the first thing it reached and
// is removed. One that pierces hits everything it touched, each thing once
// over its whole flight.
export function hitSystem(world: World, _dt: number): void {
  const { projectile, position, previousPosition, hitbox } = world.components;

  const byTeam = targetsByTeam(world);
  const opponentsOf = new Map<Team, Entity[]>();

  for (const [shot, p] of projectile) {
    const def = projectileDef(p.def);
    const shotNow = position.get(shot);
    if (!shotNow) continue;
    const shotFrom = previousPosition.get(shot) ?? shotNow;
    const shotCircle = hitbox.get(shot) ?? { r: 0 };

    const touched: { target: Entity; t: number }[] = [];
    if (!opponentsOf.has(p.team)) {
      opponentsOf.set(p.team, opponents(byTeam, p.team));
    }
    for (const target of opponentsOf.get(p.team)!) {
      if (p.struck.includes(target)) continue;
      const targetNow = position.get(target)!;
      const targetFrom = previousPosition.get(target) ?? targetNow;
      const targetCircle = hitbox.get(target) ?? { r: 0 };

      const t = touchTime(
        shotCircle,
        shotFrom,
        shotNow,
        targetCircle,
        targetFrom,
        targetNow,
      );
      if (t !== null) touched.push({ target, t });
    }
    if (touched.length === 0) continue;

    touched.sort((a, b) => a.t - b.t || a.target - b.target);
    const hits = def.pierces ? touched : touched.slice(0, 1);
    for (const { target } of hits) {
      const [min, max] = def.damage;
      world.events.hits.push({
        projectile: shot,
        target,
        owner: p.owner,
        damage: min + Math.floor(world.random() * (max - min + 1)),
        armorPiercing: def.armorPiercing ?? false,
      });
      p.struck.push(target);
    }
    if (!def.pierces) world.events.despawns.push(shot);
  }
}

// When during the tick (0 to 1) two moving circles first touch, or null if
// they don't. Ending the tick overlapping counts as touching at the end.
function touchTime(
  a: { r: number },
  aFrom: Vec2,
  aTo: Vec2,
  b: { r: number },
  bFrom: Vec2,
  bTo: Vec2,
): number | null {
  const aStep = { x: aTo.x - aFrom.x, y: aTo.y - aFrom.y };
  const bStep = { x: bTo.x - bFrom.x, y: bTo.y - bFrom.y };
  const contact = sweptCircleCircle(a, aStep, aFrom, b, bStep, bFrom);
  if (contact && contact.t <= 1) return contact.t;
  if (penetrationCircleCircle(a, aTo, b, bTo)) return 1;
  return null;
}

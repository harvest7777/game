import { despawn, type Entity, type World } from "../world";
import { pathPoint } from "./path";

// Steers projectiles along their paths. Runs before movement: it sets each
// projectile's velocity to cover exactly this tick's stretch of its path, and
// movement does the actual moving, so walls are swept no matter how fast or
// wavy the path is.
//
// Projectiles past their lifetime are removed. Wall impacts are resolved after
// movement by projectileWallHitSystem. Spinning sprites turn by their spin;
// ones that face their path point along this tick's movement.
export function projectileSystem(world: World, dt: number): void {
  const { projectile, velocity, rotation } = world.components;
  const finished: Entity[] = [];

  for (const [entity, p] of projectile) {
    const { def } = p;
    if (p.age >= def.lifetime) {
      finished.push(entity);
      continue;
    }

    const next = Math.min(p.age + dt, def.lifetime);
    const from = pathPoint(def, p.origin, p.direction, p.age, p.mirror);
    const to = pathPoint(def, p.origin, p.direction, next, p.mirror);
    const step = { x: to.x - from.x, y: to.y - from.y };
    velocity.set(entity, { x: step.x / dt, y: step.y / dt });
    p.age += dt;

    const turn = rotation.get(entity);
    if (turn) {
      turn.previous = turn.angle;
      if (def.spin) turn.angle += def.spin * dt;
      else if (step.x !== 0 || step.y !== 0) {
        turn.angle = Math.atan2(step.y, step.x);
      }
    }
  }

  // Removed after the loop so the stores aren't changed mid-iteration.
  for (const entity of finished) despawn(world, entity);
}

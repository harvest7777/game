import type { Vec2 } from "../shared/physics/math";
import { flowField, nextWaypoint, type FlowField } from "../shared/pathing";
import { clearLine, groundSpeedScale } from "../tiles";
import type { Entity, World } from "../world";
import { freshMemory, steer } from "./behaviors";
import { phaseOf } from "./definitions";
import { separation, withSeparation } from "./separation";
import { stageVelocity } from "./stageMovement";
import { bossStage } from "../shared/bossActions";
import { movementSpeed } from "../stats/runtime";

// Moves enemies by their behavior: `aggro` while they have a target, `idle`
// otherwise, taken from their current phase when it sets them. Switching
// starts the new behavior fresh. Enemies that move also ease apart from
// each other so they don't pile up. It only sets velocity, the way player
// input does, so movement handles walls for enemies too. Slow ground, like
// water, slows them as it does the player. A roaming enemy makes wherever
// it loses its target its new home. A moving enemy that can't see its
// target follows the target's flow field around the walls instead of its
// behavior, until it can.
export function brainSystem(world: World, dt: number): void {
  const { enemy, brain, position, target, velocity } = world.components;
  const pushes = separation(world);
  // One flow field per target this tick, made the first time it's needed.
  const fields = new Map<Entity, FlowField>();

  for (const [entity, e] of enemy) {
    const mind = brain.get(entity);
    const at = position.get(entity);
    if (!mind || !at) continue;
    const { def } = e;
    const actionStage = bossStage(world, entity);

    const targetEntity = target.get(entity);
    const targetAt =
      targetEntity === undefined ? undefined : position.get(targetEntity);
    const mode = targetAt ? "aggro" : "idle";
    if (mind.mode !== mode) {
      mind.mode = mode;
      mind.memory = freshMemory();
      // Losing its target, a roamer settles where it is.
      if (mode === "idle" && def.roams) e.origin = { x: at.x, y: at.y };
    }

    const behavior = phaseOf(def, e.phase?.name)?.[mode] ?? def[mode];
    const moveSpeed =
      movementSpeed(world, entity) * groundSpeedScale(world.tiles, at);
    const stageMove =
      actionStage &&
      stageVelocity(actionStage.movement, {
        speed: moveSpeed,
        heading: world.components.bossAction.get(entity)?.heading,
      });
    if (stageMove) {
      velocity.set(entity, stageMove);
      continue;
    }
    const hidden =
      targetEntity !== undefined &&
      targetAt &&
      behavior.kind !== "stationary" &&
      !clearLine(world.tiles, at, targetAt);
    let waypoint: Vec2 | undefined;
    if (hidden) {
      let field = fields.get(targetEntity);
      if (!field) {
        field = flowField(world.tiles, targetAt, PATH_REACH);
        fields.set(targetEntity, field);
      }
      waypoint = nextWaypoint(world.tiles, field, at);
    }
    const steering = waypoint
      ? headFor(at, waypoint, moveSpeed)
      : steer(behavior, mind.memory, {
          at,
          origin: e.origin,
          target: targetAt,
          speed: moveSpeed,
          dt,
          random: world.random,
          quirks: e.quirks,
        });
    velocity.set(
      entity,
      behavior.kind === "stationary"
        ? steering
        : withSeparation(steering, pushes.get(entity), moveSpeed),
    );
  }
}

// How far, in tiles each way, a target's flow field reaches: past any
// enemy's detection range, with room to go around.
export const PATH_REACH = 24;

// Full speed toward `point`.
function headFor(at: Vec2, point: Vec2, speed: number): Vec2 {
  const dx = point.x - at.x;
  const dy = point.y - at.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return { x: 0, y: 0 };
  return { x: (dx / distance) * speed, y: (dy / distance) * speed };
}

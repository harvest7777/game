import type { Vec2 } from "../shared/physics/math";
import { groundSpeedScale } from "../tiles";
import type { World } from "../world";
import { Action } from "./actions";
import { movementSpeed } from "../stats/runtime";

// Fraction of normal speed while Crouch (shift) is held.
export const CROUCH_SPEED = 0.5;

// Applies one-shot autofire toggles before shooting runs later in the tick.
export function autoFireSystem(world: World, _dt: number): void {
  const toggles = world.input.commands.filter(
    (command) => command.kind === "toggleAutoFire",
  ).length;
  if (toggles % 2 === 0) return;

  for (const [entity] of world.components.playerControlled) {
    const enabled = world.components.autoFire.get(entity) ?? false;
    world.components.autoFire.set(entity, !enabled);
  }
}

// Sets the velocity of every player-controlled entity from the held movement
// keys.
//
// Movement keys are screen-relative: Up always moves toward the top of the
// screen, however the camera is rotated. The direction is built in screen
// space (where up is -y), then rotated by camera.angle into world space. See
// ARCHITECTURE.md for the coordinate system.
//
// Diagonals are normalized so they aren't faster than straight movement, and
// with no movement keys held the velocity is zeroed so the entity stops.
// Slow ground, like water, scales the speed.
export function playerInputSystem(world: World, _dt: number): void {
  const { playerControlled, velocity, position } = world.components;
  const { held } = world.input;

  const screen = { x: 0, y: 0 };
  if (held.has(Action.Up)) screen.y -= 1;
  if (held.has(Action.Down)) screen.y += 1;
  if (held.has(Action.Left)) screen.x -= 1;
  if (held.has(Action.Right)) screen.x += 1;

  const direction = rotate(normalize(screen), world.camera.angle);
  const multiplier = held.has(Action.Crouch) ? CROUCH_SPEED : 1;

  for (const [entity] of playerControlled) {
    const at = position.get(entity);
    const ground = at ? groundSpeedScale(world.tiles, at) : 1;
    const tilesPerSecond = movementSpeed(world, entity) * multiplier * ground;
    velocity.set(entity, {
      x: direction.x * tilesPerSecond,
      y: direction.y * tilesPerSecond,
    });
  }
}

function normalize(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

// Positive angles turn clockwise on screen because y points down.
function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

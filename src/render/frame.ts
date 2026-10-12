import type { Vec2 } from "../ecs/shared/physics/math";
import type { World } from "../ecs/world";
import type { Art } from "./art";
import type { QuadBuffer } from "./quads";
import { interpolatedPosition, pushSprites } from "./sprites";
import { pushGround, pushWalls } from "./terrain";
import { createView, type View } from "./view";

// What the camera looks at this frame: the followed entity where it's drawn
// (so it stays exactly at the focus point between ticks), or the middle of
// the map when nothing is followed.
export function cameraCenter(world: World, alpha: number): Vec2 {
  const { target } = world.camera;
  const followed =
    target === undefined
      ? undefined
      : interpolatedPosition(world, target, alpha);
  return followed ?? { x: world.tiles.width / 2, y: world.tiles.height / 2 };
}

// The camera angle to draw this frame, between the previous tick's and the
// latest one like positions are, so turning is smooth at any refresh rate.
// Angles wrap at 2π, so it turns the short way around.
export function cameraAngle(world: World, alpha: number): number {
  const { previousAngle, angle } = world.camera;
  const turn = Math.atan2(
    Math.sin(angle - previousAngle),
    Math.cos(angle - previousAngle),
  );
  return previousAngle + turn * alpha;
}

export function frameView(
  world: World,
  alpha: number,
  width: number,
  height: number,
  devicePixelRatio: number,
): View {
  const center = cameraCenter(world, alpha);
  const camera = { ...world.camera, angle: cameraAngle(world, alpha) };
  return createView(camera, center, width, height, devicePixelRatio);
}

// Every quad for one frame: ground and walls first, then sprites (enemies,
// projectiles, player, in that order). Returns how many quads are terrain;
// the rest are sprites.
//
// Terrain writes depth and sprites only test against it, so a wall hides the
// part of a sprite standing behind it but never one standing in front, while
// sprites still stack by layer among themselves. Only reads the world.
// `alpha` is how far between the previous tick and the latest one to draw
// things; `time` is in seconds and drives animation.
export function buildFrame(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  time: number,
): number {
  out.reset();
  pushGround(out, world.tiles, view, art);
  pushWalls(out, world.tiles, view, art);
  const terrain = out.count;
  pushSprites(out, world, view, art, alpha, time);
  return terrain;
}

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

export function frameView(
  world: World,
  alpha: number,
  width: number,
  height: number,
  devicePixelRatio: number,
): View {
  const center = cameraCenter(world, alpha);
  return createView(world.camera, center, width, height, devicePixelRatio);
}

// Every quad for one frame, bottom to top: ground, walls, then sprites
// (enemies, projectiles, player). Only reads the world. `alpha` is how far
// between the previous tick and the latest one to draw things; `time` is in
// seconds and drives animation.
export function buildFrame(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  time: number,
): void {
  out.reset();
  pushGround(out, world.tiles, view, art);
  pushWalls(out, world.tiles, view, art);
  pushSprites(out, world, view, art, alpha, time);
}

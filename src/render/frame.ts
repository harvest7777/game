import type { Vec2 } from "../ecs/shared/physics/math";
import type { World } from "../ecs/world";
import { lerpAngle } from "./angle";
import type { Art } from "./art";
import { createRenderDebug, pushDebug, type RenderDebug } from "./debug";
import { pushHealthBars } from "./healthBars";
import type { QuadBuffer } from "./quads";
import { pushFloatingText } from "./text";
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
export function cameraAngle(world: World, alpha: number): number {
  return lerpAngle(world.camera.previousAngle, world.camera.angle, alpha);
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

// How many quads of a frame are in each section, in buffer order. Each
// section is drawn with different depth rules.
export type FrameSections = {
  terrain: number;
  sprites: number;
  overlay: number;
  debug: number;
};

// Every quad for one frame: ground and walls, then the sprite section
// (health bars first so every sprite covers them, then enemies, projectiles
// and the player, in that order), then the overlay (floating text, then
// whatever `drawOverlay` adds, like the HUD), then debug renders.
//
// Terrain writes depth and the sprite section only tests against it, so a
// wall hides the part of a sprite or bar behind it but never one in front,
// while sprites still stack by layer among themselves. The overlay and debug
// renders ignore depth and go over everything, walls included. Only reads the world. `alpha` is how far
// between the previous tick and the latest one to draw things; `time` is in
// seconds and drives animation.
export function buildFrame(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  time: number,
  debug: RenderDebug = createRenderDebug(),
  drawOverlay?: (out: QuadBuffer) => void,
): FrameSections {
  out.reset();
  pushGround(out, world.tiles, view, art);
  pushWalls(out, world.tiles, view, art);
  const terrain = out.count;
  pushHealthBars(out, world, view, alpha);
  pushSprites(out, world, view, art, alpha, time);
  const sprites = out.count - terrain;
  pushFloatingText(out, world, view, art, alpha);
  drawOverlay?.(out);
  const overlay = out.count - terrain - sprites;
  pushDebug(out, world, view, art, alpha, debug);
  return {
    terrain,
    sprites,
    overlay,
    debug: out.count - terrain - sprites - overlay,
  };
}

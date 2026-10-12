import type { Camera } from "../ecs/camera/resource";
import type { Vec2 } from "../ecs/shared/physics/math";

// Screen pixels per tile at zoom 1 and a devicePixelRatio of 1. Sprites are
// 8x8, so each sprite pixel is 5 screen pixels.
export const TILE_PIXELS = 40;

// Everything needed to map between world tiles and screen pixels for one
// frame. Screen pixels are device pixels with the origin at the top-left of
// the canvas and y pointing down.
export type View = {
  // World point the camera looks at (usually the followed entity).
  center: Vec2;
  angle: number;
  // Device pixels per world tile, with zoom and devicePixelRatio applied.
  pixelsPerTile: number;
  // Where `center` lands on screen, in device pixels.
  focus: Vec2;
  width: number;
  height: number;
};

export function createView(
  camera: Camera,
  center: Vec2,
  width: number,
  height: number,
  devicePixelRatio = 1,
): View {
  return {
    center,
    angle: camera.angle,
    pixelsPerTile: TILE_PIXELS * camera.zoom * devicePixelRatio,
    focus: {
      x: width / 2 + camera.focusOffset.x * width,
      y: height / 2 + camera.focusOffset.y * height,
    },
    width,
    height,
  };
}

// A world direction seen on screen is rotated by -angle: with angle π/2 the
// top of the screen faces world +x, so world +x points screen-up.
export function worldToScreen(view: View, p: Vec2): Vec2 {
  const dx = p.x - view.center.x;
  const dy = p.y - view.center.y;
  const cos = Math.cos(view.angle);
  const sin = Math.sin(view.angle);
  return {
    x: view.focus.x + (dx * cos + dy * sin) * view.pixelsPerTile,
    y: view.focus.y + (-dx * sin + dy * cos) * view.pixelsPerTile,
  };
}

export function screenToWorld(view: View, s: Vec2): Vec2 {
  const sx = (s.x - view.focus.x) / view.pixelsPerTile;
  const sy = (s.y - view.focus.y) / view.pixelsPerTile;
  const cos = Math.cos(view.angle);
  const sin = Math.sin(view.angle);
  return {
    x: view.center.x + sx * cos - sy * sin,
    y: view.center.y + sx * sin + sy * cos,
  };
}

export type Rect = { minX: number; minY: number; maxX: number; maxY: number };

// Axis-aligned world box containing everything on screen. With the camera
// rotated it's the box around the rotated viewport, so it includes some
// off-screen corners; anything outside it is definitely off screen.
export function visibleWorldRect(view: View): Rect {
  const corners = [
    screenToWorld(view, { x: 0, y: 0 }),
    screenToWorld(view, { x: view.width, y: 0 }),
    screenToWorld(view, { x: 0, y: view.height }),
    screenToWorld(view, { x: view.width, y: view.height }),
  ];
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxX: Math.max(...corners.map((c) => c.x)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

// Depth for something standing at screen height `y`: lower on screen is
// nearer the viewer, so it gets a smaller depth. Covers from 1.5 screens above
// the top to 1.5 screens below the bottom, which includes everything drawn,
// and clamps beyond that.
export function depthOf(view: View, y: number): number {
  const depth = 0.5 - (y - view.height / 2) / (4 * view.height);
  return Math.min(1, Math.max(0, depth));
}

import type { Vec2 } from "../shared/physics/math";
import type { Entity } from "../world";

// How the world is viewed.
//
// - `angle` is the world direction the top of the screen faces, in radians
//   clockwise from world up (-y): 0 means screen up is world up, π/2 means
//   screen up is world right (+x). `turnSpeed` is radians/second.
// - `target` is the entity the camera follows, if any.
// - `zoom` scales how big a tile looks; 1 is the default size, 2 is twice as
//   big (so half as much of the world fits on screen). Not capped.
// - `focusOffset` is where the target sits on screen, as a fraction of the
//   viewport from its center: (0, 0) is dead center, (0, 0.25) puts the
//   target a quarter of the screen height below center.
export type Camera = {
  angle: number;
  turnSpeed: number;
  target?: Entity;
  zoom: number;
  focusOffset: Vec2;
};

export function createCamera(): Camera {
  return {
    angle: 0,
    turnSpeed: Math.PI,
    zoom: 1,
    focusOffset: { x: 0, y: 0 },
  };
}

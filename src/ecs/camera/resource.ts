// The view's rotation. `angle` is the world direction the top of the screen
// faces, in radians clockwise from world up (-y): 0 means screen up is world
// up, π/2 means screen up is world right (+x). `turnSpeed` is radians/second.
export type Camera = { angle: number; turnSpeed: number };

export function createCamera(): Camera {
  return { angle: 0, turnSpeed: Math.PI };
}

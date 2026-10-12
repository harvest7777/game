import { Action } from "../input/actions";
import type { World } from "../world";

const FULL_TURN = 2 * Math.PI;

// Turns the camera while RotateLeft/RotateRight are held. RotateRight turns
// the view clockwise, increasing the angle. Holding both cancels out.
export function cameraSystem(world: World, dt: number): void {
  const { camera, input } = world;
  camera.previousAngle = camera.angle;
  let turn = 0;
  if (input.held.has(Action.RotateRight)) turn += 1;
  if (input.held.has(Action.RotateLeft)) turn -= 1;

  const angle = camera.angle + turn * camera.turnSpeed * dt;
  // Keep the angle in [0, 2π) so it doesn't grow without bound.
  camera.angle = ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

import type { Vec2 } from "./physics/math";
import { clearLine, isWall, type Tiles } from "../tiles";

// How enemies find their way around walls: one map per target of how many
// steps every nearby tile is from it, shared by everything chasing that
// target, so thousands of chasers cost one search.

// Steps from each tile in a square around the goal to the goal, moving to
// any of the 8 neighbours but never cutting a wall's corner. -1 where the
// goal can't be reached within the square.
export type FlowField = {
  left: number;
  top: number;
  size: number;
  steps: Int32Array;
};

const STEPS_8 = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

// The field around `goal`, out to `reach` tiles each way.
export function flowField(tiles: Tiles, goal: Vec2, reach: number): FlowField {
  const size = reach * 2 + 1;
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);
  const field: FlowField = {
    left: gx - reach,
    top: gy - reach,
    size,
    steps: new Int32Array(size * size).fill(-1),
  };
  if (isWall(tiles, gx, gy)) return field;
  const queue = [gx, gy];
  field.steps[indexOf(field, gx, gy)] = 0;
  for (let head = 0; head < queue.length; head += 2) {
    const x = queue[head];
    const y = queue[head + 1];
    const here = field.steps[indexOf(field, x, y)];
    for (const d of STEPS_8) {
      const nx = x + d.x;
      const ny = y + d.y;
      const i = indexOf(field, nx, ny);
      if (i < 0 || field.steps[i] >= 0 || isWall(tiles, nx, ny)) continue;
      // Diagonals only where both sides are open, so nothing clips a corner.
      if (
        d.x &&
        d.y &&
        (isWall(tiles, x + d.x, y) || isWall(tiles, x, y + d.y))
      ) {
        continue;
      }
      field.steps[i] = here + 1;
      queue.push(nx, ny);
    }
  }
  return field;
}

// Steps from tile (x, y) to the goal, or -1 if it can't get there or is
// outside the field.
export function stepsAt(field: FlowField, x: number, y: number): number {
  const i = indexOf(field, x, y);
  return i < 0 ? -1 : field.steps[i];
}

// Where something at `at` should head to get to the field's goal: the
// furthest tile middle down the field, up to `lookahead` steps on, that it
// can walk straight to, so paths cut corners smoothly instead of zigzagging
// tile by tile. Undefined if it's outside the field, can't reach the goal,
// or is already on the goal's tile.
export function nextWaypoint(
  tiles: Tiles,
  field: FlowField,
  at: Vec2,
  lookahead = 6,
): Vec2 | undefined {
  let x = Math.floor(at.x);
  let y = Math.floor(at.y);
  let steps = stepsAt(field, x, y);
  if (steps <= 0) return undefined;
  let waypoint: Vec2 | undefined;
  for (let i = 0; i < lookahead && steps > 0; i++) {
    let best: { x: number; y: number } | undefined;
    for (const d of STEPS_8) {
      const s = stepsAt(field, x + d.x, y + d.y);
      if (s >= 0 && s < steps) {
        steps = s;
        best = { x: x + d.x, y: y + d.y };
      }
    }
    if (!best) break;
    x = best.x;
    y = best.y;
    const middle = { x: x + 0.5, y: y + 0.5 };
    // The first step is always taken; later ones only while still in view.
    if (waypoint && !clearLine(tiles, at, middle)) break;
    waypoint = middle;
  }
  return waypoint;
}

function indexOf(field: FlowField, x: number, y: number): number {
  const lx = x - field.left;
  const ly = y - field.top;
  if (lx < 0 || ly < 0 || lx >= field.size || ly >= field.size) return -1;
  return ly * field.size + lx;
}

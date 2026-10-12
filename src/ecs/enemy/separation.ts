import type { Vec2 } from "../shared/physics/math";
import type { Entity, World } from "../world";

// Enemies keep this many tiles between their hitboxes before they start
// easing apart.
export const SPACING = 0.5;
// How hard the push is next to the steering, at full overlap.
export const STRENGTH = 1.5;

// For each enemy crowding others, which way to ease off: away from every
// enemy closer than their hitboxes plus SPACING, harder the closer it is.
// Unscaled (up to about one per neighbor); the brain weighs it against
// where the enemy wants to go. Enemies are sorted into a grid of cells as
// big as the largest reach, so each only checks the cells around it; flat
// arrays keep that fast with thousands of enemies.
export function separation(world: World): Map<Entity, Vec2> {
  const { enemy, position, hitbox } = world.components;
  const pushes = new Map<Entity, Vec2>();

  const ids: Entity[] = [];
  for (const [entity] of enemy) if (position.has(entity)) ids.push(entity);
  const n = ids.length;
  if (n < 2) return pushes;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const rs = new Float64Array(n);
  let cell = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const at = position.get(ids[i])!;
    xs[i] = at.x;
    ys[i] = at.y;
    rs[i] = hitbox.get(ids[i])?.r ?? 0;
    cell = Math.max(cell, rs[i] * 2 + SPACING);
    minX = Math.min(minX, at.x);
    minY = Math.min(minY, at.y);
    maxX = Math.max(maxX, at.x);
    maxY = Math.max(maxY, at.y);
  }

  // Counting sort into cells: `order` lists enemies cell by cell, and
  // `starts[c]` is where cell c begins in it.
  const columns = Math.floor((maxX - minX) / cell) + 1;
  const rows = Math.floor((maxY - minY) / cell) + 1;
  const cellOf = new Int32Array(n);
  const starts = new Int32Array(columns * rows + 1);
  for (let i = 0; i < n; i++) {
    const c =
      Math.floor((ys[i] - minY) / cell) * columns +
      Math.floor((xs[i] - minX) / cell);
    cellOf[i] = c;
    starts[c + 1]++;
  }
  for (let c = 0; c < columns * rows; c++) starts[c + 1] += starts[c];
  const fill = starts.slice(0, columns * rows);
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[fill[cellOf[i]]++] = i;

  for (let i = 0; i < n; i++) {
    const column = cellOf[i] % columns;
    const row = (cellOf[i] - column) / columns;
    let x = 0;
    let y = 0;
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
      for (
        let c = Math.max(0, column - 1);
        c <= Math.min(columns - 1, column + 1);
        c++
      ) {
        const at = r * columns + c;
        for (let k = starts[at]; k < starts[at + 1]; k++) {
          const j = order[k];
          if (j === i) continue;
          const reach = rs[i] + rs[j] + SPACING;
          const ox = xs[i] - xs[j];
          const oy = ys[i] - ys[j];
          // Squared first: most neighbors in nearby cells aren't close
          // enough, and skipping their square root adds up over thousands.
          const squared = ox * ox + oy * oy;
          if (squared >= reach * reach) continue;
          const distance = Math.sqrt(squared);
          const closeness = 1 - distance / reach;
          if (distance === 0) {
            // Exactly on top of each other: split along a direction set by
            // the pair, opposite for each of them.
            const angle = Math.min(ids[i], ids[j]) * 2.399963;
            const sign = ids[i] < ids[j] ? 1 : -1;
            x += Math.cos(angle) * sign * closeness;
            y += Math.sin(angle) * sign * closeness;
          } else {
            x += (ox / distance) * closeness;
            y += (oy / distance) * closeness;
          }
        }
      }
    }
    if (x !== 0 || y !== 0) pushes.set(ids[i], { x, y });
  }
  return pushes;
}

// Adds a separation push to a steering velocity, without going faster than
// the enemy can move (or than the steering already was, for dashes).
export function withSeparation(
  steering: Vec2,
  push: Vec2 | undefined,
  speed: number,
): Vec2 {
  if (!push) return steering;
  const x = steering.x + push.x * speed * STRENGTH;
  const y = steering.y + push.y * speed * STRENGTH;
  const limit = Math.max(speed, Math.hypot(steering.x, steering.y));
  const length = Math.hypot(x, y);
  if (length <= limit) return { x, y };
  return { x: (x / length) * limit, y: (y / length) * limit };
}

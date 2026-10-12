import type { Circle, Vec2, Rect } from "./math";

// How far a mover overlaps a blocker. `normal` is the unit direction to push
// the mover to separate them; `depth` is how far.
export type Penetration = { depth: number; normal: Vec2 };

// Earliest t >= 0 at which a ray origin + dir * t enters a circle at the
// origin of the given radius. 0 if already inside, Infinity if never.
function rayCircle(origin: Vec2, dir: Vec2, radius: number): number {
  const c = origin.x * origin.x + origin.y * origin.y - radius * radius;
  if (c <= 0) return 0;

  const a = dir.x * dir.x + dir.y * dir.y;
  const b = origin.x * dir.x + origin.y * dir.y;
  if (a === 0 || b >= 0) return Infinity;

  const disc = b * b - a * c;
  if (disc < 0) return Infinity;

  return (-b - Math.sqrt(disc)) / a;
}

// Overlap between mover circle A and blocker circle B, or null if they don't
// touch. Concentric circles are pushed apart along +x.
export function penetrationCircleCircle(
  circleA: Circle,
  positionA: Vec2,
  circleB: Circle,
  positionB: Vec2,
): Penetration | null {
  const dx = positionA.x - positionB.x;
  const dy = positionA.y - positionB.y;
  const dist = Math.hypot(dx, dy);
  const depth = circleA.r + circleB.r - dist;
  if (depth < 0) return null;
  if (dist === 0) return { depth, normal: { x: 1, y: 0 } };
  return { depth, normal: { x: dx / dist, y: dy / dist } };
}

// Overlap between a mover circle and a blocker rect (positioned by its
// center), or null if they don't touch. A circle whose center is inside the
// rect is pushed out through the nearest face.
export function penetrationRectCircle(
  rect: Rect,
  positionRect: Vec2,
  circle: Circle,
  positionCircle: Vec2,
): Penetration | null {
  const px = positionCircle.x - positionRect.x;
  const py = positionCircle.y - positionRect.y;
  const hw = rect.w / 2;
  const hh = rect.h / 2;

  const insideX = hw - Math.abs(px);
  const insideY = hh - Math.abs(py);
  if (insideX >= 0 && insideY >= 0) {
    if (insideX <= insideY) {
      return {
        depth: insideX + circle.r,
        normal: { x: px < 0 ? -1 : 1, y: 0 },
      };
    }
    return { depth: insideY + circle.r, normal: { x: 0, y: py < 0 ? -1 : 1 } };
  }

  const dx = px - Math.max(-hw, Math.min(hw, px));
  const dy = py - Math.max(-hh, Math.min(hh, py));
  const dist = Math.hypot(dx, dy);
  const depth = circle.r - dist;
  if (depth < 0) return null;
  return { depth, normal: { x: dx / dist, y: dy / dist } };
}

// Time of first contact between two moving circles, in the same time unit as
// the velocities. 0 if already overlapping, Infinity if they never touch.
export function sweptCircleCircle(
  circleA: Circle,
  velocityA: Vec2,
  positionA: Vec2,
  circleB: Circle,
  velocityB: Vec2,
  positionB: Vec2,
): number {
  // Treat B as stationary at the origin and sweep A's center as a ray against
  // a circle with the combined radius.
  const relPos = { x: positionA.x - positionB.x, y: positionA.y - positionB.y };
  const relVel = { x: velocityA.x - velocityB.x, y: velocityA.y - velocityB.y };
  return rayCircle(relPos, relVel, circleA.r + circleB.r);
}

// Time of first contact between a moving axis-aligned rect (positioned by its
// center) and a moving circle. 0 if already overlapping, Infinity if never.
export function sweptRectCircle(
  rect: Rect,
  velocityRect: Vec2,
  positionRect: Vec2,
  circle: Circle,
  velocityCircle: Vec2,
  positionCircle: Vec2,
): number {
  // Rect stationary at the origin; circle center is a ray against the rect
  // inflated by the circle radius (a rounded rect).
  const p = {
    x: positionCircle.x - positionRect.x,
    y: positionCircle.y - positionRect.y,
  };
  const v = {
    x: velocityCircle.x - velocityRect.x,
    y: velocityCircle.y - velocityRect.y,
  };
  const hw = rect.w / 2;
  const hh = rect.h / 2;
  const r = circle.r;

  // Already overlapping: closest point on rect is within r of the center.
  const cx = Math.max(-hw, Math.min(hw, p.x));
  const cy = Math.max(-hh, Math.min(hh, p.y));
  if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= r * r) return 0;

  // Slab test against the rect expanded by r on every side.
  const ex = hw + r;
  const ey = hh + r;
  let tEnter = -Infinity;
  let tExit = Infinity;
  for (const [o, d, e] of [
    [p.x, v.x, ex],
    [p.y, v.y, ey],
  ]) {
    if (d === 0) {
      if (o < -e || o > e) return Infinity;
      continue;
    }
    const t1 = (-e - o) / d;
    const t2 = (e - o) / d;
    tEnter = Math.max(tEnter, Math.min(t1, t2));
    tExit = Math.min(tExit, Math.max(t1, t2));
  }
  if (tEnter > tExit || tExit < 0) return Infinity;

  // If the entry point lands in a corner region of the expanded box, the real
  // boundary there is a quarter circle around the rect's corner.
  const hx = p.x + v.x * tEnter;
  const hy = p.y + v.y * tEnter;
  const inCornerX = Math.abs(hx) > hw;
  const inCornerY = Math.abs(hy) > hh;
  if (!(inCornerX && inCornerY)) return tEnter;

  const corner = { x: Math.sign(hx) * hw, y: Math.sign(hy) * hh };
  return rayCircle({ x: p.x - corner.x, y: p.y - corner.y }, v, r);
}

import type { Vec2 } from "../shared/physics/math";
import type { ProjectileDef } from "./definitions";

// How far along its track a projectile is after `t` seconds: `speed`
// changing by `acceleration`, held between `minSpeed` and `maxSpeed`.
export function trackDistance(def: ProjectileDef, t: number): number {
  const min = def.minSpeed ?? -Infinity;
  const max = def.maxSpeed ?? Infinity;
  const start = Math.min(max, Math.max(min, def.speed));
  const a = def.acceleration ?? 0;
  if (a === 0) return start * t;

  // Speed changes until it reaches the bound it's heading for, then holds.
  const bound = a > 0 ? max : min;
  const untilBound = Number.isFinite(bound)
    ? Math.max(0, (bound - start) / a)
    : Infinity;
  if (t <= untilBound) return start * t + (a * t * t) / 2;
  return (
    start * untilBound +
    (a * untilBound * untilBound) / 2 +
    bound * (t - untilBound)
  );
}

// Where a projectile is `age` seconds after being fired, relative to where it
// was fired: x is forward along the firing direction, y is sideways to the
// right of travel (clockwise on screen). Pure, so the same definition and age
// always land in the same place.
export function pathOffset(def: ProjectileDef, age: number): Vec2 {
  // A boomerang runs its path forward for half its life, then backward.
  const t = def.boomerang
    ? Math.max(0, Math.min(age, def.lifetime - age))
    : age;
  const distance = trackDistance(def, t);

  // The track: a straight line, or an arc of fixed curvature when turning.
  let x = distance;
  let y = 0;
  let along = { x: 1, y: 0 };
  if (def.turnRate) {
    const curvature = def.turnRate / def.speed;
    const heading = curvature * distance;
    x = Math.sin(heading) / curvature;
    y = (1 - Math.cos(heading)) / curvature;
    along = { x: Math.cos(heading), y: Math.sin(heading) };
  }

  // The wave weaves across the track, perpendicular to it.
  if (def.wave) {
    const { amplitude, frequency, phase = 0 } = def.wave;
    const side = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
    x += -along.y * side;
    y += along.x * side;
  }

  return { x, y };
}

// The path in world space, for a projectile fired from `origin` toward the
// unit vector `direction`.
export function pathPoint(
  def: ProjectileDef,
  origin: Vec2,
  direction: Vec2,
  age: number,
): Vec2 {
  const { x, y } = pathOffset(def, age);
  // To the right of travel: the direction turned a quarter clockwise.
  const rightX = -direction.y;
  const rightY = direction.x;
  return {
    x: origin.x + x * direction.x + y * rightX,
    y: origin.y + x * direction.y + y * rightY,
  };
}

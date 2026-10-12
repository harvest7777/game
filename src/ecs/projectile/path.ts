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
  let { x, y } = trackPoint(def, t);
  const heading = headingAt(def, t);
  const along = { x: Math.cos(heading), y: Math.sin(heading) };

  // The wave weaves across the track, perpendicular to it.
  if (def.wave) {
    const { amplitude, frequency, phase = 0 } = def.wave;
    const side = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
    x += -along.y * side;
    y += along.x * side;
  }

  return { x, y };
}

// Which way the track points `t` seconds in, in radians from the firing
// direction: the turn rate as a fixed curvature over the distance covered,
// plus however much turnAcceleration has changed it since.
export function headingAt(def: ProjectileDef, t: number): number {
  const curvature = def.turnRate ? def.turnRate / def.speed : 0;
  const changed = ((def.turnAcceleration ?? 0) * t * t) / 2;
  return curvature * trackDistance(def, t) + changed;
}

// Where the track is `t` seconds in, before any wave: a straight line, an
// exact arc when it turns at a fixed rate, or followed step by step when the
// turn rate changes.
function trackPoint(def: ProjectileDef, t: number): Vec2 {
  if (def.turnAcceleration) return integratedTrack(def, t);
  const distance = trackDistance(def, t);
  if (!def.turnRate) return { x: distance, y: 0 };
  const curvature = def.turnRate / def.speed;
  const heading = curvature * distance;
  return {
    x: Math.sin(heading) / curvature,
    y: (1 - Math.cos(heading)) / curvature,
  };
}

// Seconds between the samples a changing-turn track is worked out at.
export const TRACK_STEP = 1 / 240;

// Each definition's track sampled every TRACK_STEP, worked out once and kept,
// so following one costs a lookup and one partial step.
const tracks = new WeakMap<ProjectileDef, Vec2[]>();

function integratedTrack(def: ProjectileDef, t: number): Vec2 {
  let samples = tracks.get(def);
  if (!samples) {
    samples = [{ x: 0, y: 0 }];
    const steps = Math.ceil(def.lifetime / TRACK_STEP);
    for (let i = 0; i < steps; i++) {
      samples.push(trackStep(def, samples[i], i * TRACK_STEP, TRACK_STEP));
    }
    tracks.set(def, samples);
  }
  const i = Math.max(
    0,
    Math.min(samples.length - 1, Math.floor(t / TRACK_STEP)),
  );
  return trackStep(def, samples[i], i * TRACK_STEP, t - i * TRACK_STEP);
}

// Moves along the track from `from` at time `t0` for `dt` seconds, heading
// the way it points halfway through.
function trackStep(
  def: ProjectileDef,
  from: Vec2,
  t0: number,
  dt: number,
): Vec2 {
  if (dt <= 0) return from;
  const covered = trackDistance(def, t0 + dt) - trackDistance(def, t0);
  const heading = headingAt(def, t0 + dt / 2);
  return {
    x: from.x + covered * Math.cos(heading),
    y: from.y + covered * Math.sin(heading),
  };
}

// The path in world space, for a projectile fired from `origin` toward the
// unit vector `direction`. A mirrored path goes to the left of travel
// wherever it would go right.
export function pathPoint(
  def: ProjectileDef,
  origin: Vec2,
  direction: Vec2,
  age: number,
  mirror = false,
): Vec2 {
  const offset = pathOffset(def, age);
  const x = offset.x;
  const y = mirror ? -offset.y : offset.y;
  // To the right of travel: the direction turned a quarter clockwise.
  const rightX = -direction.y;
  const rightY = direction.x;
  return {
    x: origin.x + x * direction.x + y * rightX,
    y: origin.y + x * direction.y + y * rightY,
  };
}

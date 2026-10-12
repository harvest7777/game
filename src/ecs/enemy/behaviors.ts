import type { Vec2 } from "../shared/physics/math";

// How an enemy moves, as data. Enemies use one while they have no target
// (`idle`) and another while they do (`aggro`).
export type Behavior =
  // Doesn't move.
  | { kind: "stationary" }
  // Strolls between random points within `radius` tiles of where it
  // spawned, pausing at each. `speedScale` slows the stroll (default 0.5).
  | { kind: "wander"; radius: number; speedScale?: number }
  // Heads for its target, stopping `stopAt` tiles away.
  | { kind: "chase"; stopAt: number }
  // Circles its target `radius` tiles out; `clockwise` on screen by default.
  | { kind: "orbit"; radius: number; clockwise?: boolean }
  // Winds up for `windup` s, then dashes for `duration` s at `speedScale`×
  // its speed toward where the target was when the windup ended, then rests
  // for `rest` s and repeats.
  | {
      kind: "charge";
      windup: number;
      duration: number;
      speedScale: number;
      rest: number;
    }
  // Walks back to where it spawned and stays there.
  | { kind: "returnHome" };

// What a behavior remembers between ticks. Reset whenever the enemy switches
// behavior, so each behavior starts fresh.
export type BehaviorMemory = {
  // Seconds in the current stage (charge) or since picking the waypoint
  // (wander).
  time: number;
  waypoint?: Vec2;
  // Seconds left to wait before wandering on.
  pause?: number;
  stage?: "windup" | "dash" | "rest";
  // The locked-in dash direction.
  heading?: Vec2;
};

// What makes one enemy move a little differently from others of its kind,
// rolled when it spawns, so a group doesn't move in lockstep: `reach`
// scales how far off it stops or circles, and `flipOrbit` sends it around
// the other way.
export type Quirks = { reach: number; flipOrbit: boolean };

export type SteerContext = {
  at: Vec2;
  origin: Vec2;
  // Where its target is, if it has one.
  target?: Vec2;
  // Tiles per second.
  speed: number;
  dt: number;
  random: () => number;
  quirks?: Quirks;
};

const STILL: Vec2 = { x: 0, y: 0 };
// Close enough to a wander waypoint to count as there, in tiles.
const ARRIVED = 0.1;
// Wanderers that can't reach a waypoint (a wall in the way) give up on it.
const WANDER_GIVE_UP = 4;
const WANDER_PAUSE = { min: 0.5, max: 1.5 };

export function freshMemory(): BehaviorMemory {
  return { time: 0 };
}

// The velocity a behavior wants this tick. Updates `memory` in place.
export function steer(
  behavior: Behavior,
  memory: BehaviorMemory,
  ctx: SteerContext,
): Vec2 {
  switch (behavior.kind) {
    case "stationary":
      return STILL;
    case "wander":
      return wander(behavior, memory, ctx);
    case "chase":
      if (!ctx.target) return STILL;
      return toward(
        ctx.at,
        ctx.target,
        ctx.speed,
        behavior.stopAt * (ctx.quirks?.reach ?? 1),
        ctx.dt,
      );
    case "orbit":
      return orbit(behavior, ctx);
    case "charge":
      return charge(behavior, memory, ctx);
    case "returnHome":
      return toward(ctx.at, ctx.origin, ctx.speed, 0, ctx.dt);
  }
}

// Velocity toward `point` at `speed`, still once within `stopAt` (or as good
// as there). Never steps past the stopping point in one tick, so it arrives
// instead of jittering back and forth across it.
function toward(
  at: Vec2,
  point: Vec2,
  speed: number,
  stopAt: number,
  dt: number,
): Vec2 {
  const dx = point.x - at.x;
  const dy = point.y - at.y;
  const distance = Math.hypot(dx, dy);
  const left = distance - stopAt;
  if (left <= 1e-6) return STILL;
  const step = Math.min(speed, left / dt);
  return { x: (dx / distance) * step, y: (dy / distance) * step };
}

function wander(
  behavior: Extract<Behavior, { kind: "wander" }>,
  memory: BehaviorMemory,
  ctx: SteerContext,
): Vec2 {
  memory.time += ctx.dt;
  if (memory.pause !== undefined && memory.pause > 0) {
    memory.pause -= ctx.dt;
    return STILL;
  }

  const reached =
    memory.waypoint &&
    Math.hypot(memory.waypoint.x - ctx.at.x, memory.waypoint.y - ctx.at.y) <=
      ARRIVED;
  if (!memory.waypoint || reached || memory.time > WANDER_GIVE_UP) {
    if (memory.waypoint) {
      memory.pause = between(ctx.random, WANDER_PAUSE.min, WANDER_PAUSE.max);
      memory.waypoint = undefined;
      return STILL;
    }
    // A uniformly random point in the circle around its origin.
    const angle = ctx.random() * 2 * Math.PI;
    const distance = behavior.radius * Math.sqrt(ctx.random());
    memory.waypoint = {
      x: ctx.origin.x + Math.cos(angle) * distance,
      y: ctx.origin.y + Math.sin(angle) * distance,
    };
    memory.time = 0;
  }

  const speed = ctx.speed * (behavior.speedScale ?? 0.5);
  return toward(ctx.at, memory.waypoint, speed, 0, ctx.dt);
}

function orbit(
  behavior: Extract<Behavior, { kind: "orbit" }>,
  ctx: SteerContext,
): Vec2 {
  if (!ctx.target) return STILL;
  const dx = ctx.at.x - ctx.target.x;
  const dy = ctx.at.y - ctx.target.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: ctx.speed, y: 0 };
  const out = { x: dx / distance, y: dy / distance };
  // Clockwise on screen (y down) is the outward direction turned a quarter
  // clockwise.
  const clockwise = (behavior.clockwise !== false) !== !!ctx.quirks?.flipOrbit;
  const sign = clockwise ? 1 : -1;
  const radius = behavior.radius * (ctx.quirks?.reach ?? 1);
  const around = { x: -out.y * sign, y: out.x * sign };
  // Lean in or out toward the ring, harder the further off it is.
  const off = Math.max(-1, Math.min(1, (radius - distance) / radius));
  const x = around.x + out.x * off * 2;
  const y = around.y + out.y * off * 2;
  const length = Math.hypot(x, y);
  return { x: (x / length) * ctx.speed, y: (y / length) * ctx.speed };
}

function charge(
  behavior: Extract<Behavior, { kind: "charge" }>,
  memory: BehaviorMemory,
  ctx: SteerContext,
): Vec2 {
  memory.stage ??= "windup";
  memory.time += ctx.dt;

  if (memory.stage === "windup" && memory.time >= behavior.windup) {
    // Lock in where the target is now; dodging during the dash works.
    const aim = ctx.target ?? ctx.origin;
    const dx = aim.x - ctx.at.x;
    const dy = aim.y - ctx.at.y;
    const distance = Math.hypot(dx, dy);
    memory.heading =
      distance === 0 ? { x: 1, y: 0 } : { x: dx / distance, y: dy / distance };
    memory.stage = "dash";
    memory.time = 0;
  } else if (memory.stage === "dash" && memory.time >= behavior.duration) {
    memory.stage = "rest";
    memory.time = 0;
  } else if (memory.stage === "rest" && memory.time >= behavior.rest) {
    memory.stage = "windup";
    memory.time = 0;
  }

  if (memory.stage !== "dash" || !memory.heading) return STILL;
  const speed = ctx.speed * behavior.speedScale;
  return { x: memory.heading.x * speed, y: memory.heading.y * speed };
}

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

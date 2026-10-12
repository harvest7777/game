import {
  penetrationCircleCircle,
  penetrationRectCircle,
  sweptCircleCircle,
  sweptRectCircle,
  type Contact,
  type Penetration,
} from "../shared/physics/geometry";
import type { Circle, Vec2 } from "../shared/physics/math";
import { isWall, wallsInBox, type Tiles } from "../tiles";
import type { Entity, World } from "../world";

// Gap left between a mover and whatever it stops against, so the next step
// doesn't start out touching it.
const SKIN = 1e-4;
// Slides per step. Enough to hit a wall, slide into a second one in a corner,
// and stop.
const MAX_SLIDES = 3;
// Push-outs per step when starting inside walls or solids.
const MAX_PUSHES = 4;
// How far to search for open ground when a mover's center is inside a wall.
const MAX_ESCAPE_TILES = 16;

const TILE = { w: 1, h: 1 };
const POINT: Circle = { r: 0 };
const STILL: Vec2 = { x: 0, y: 0 };

// Moves every entity with a position and velocity by velocity * dt. Movers
// with a wall response are swept against wall tiles and solid entities so
// they can't pass through them at any speed.
export function movementSystem(world: World, dt: number): void {
  const { position, velocity, solid, blocked } = world.components;
  blocked.clear();

  // Solids move first so other movers sweep against where they end up.
  const solids: Entity[] = [];
  const others: Entity[] = [];
  for (const [entity] of velocity) {
    if (!position.has(entity) || world.components.asleep.has(entity)) continue;
    (solid.has(entity) ? solids : others).push(entity);
  }
  for (const entity of solids) move(world, entity, dt);
  for (const entity of others) move(world, entity, dt);
}

function move(world: World, entity: Entity, dt: number): void {
  const { position, velocity, hitbox, previousPosition, wallResponse } =
    world.components;
  const pos = position.get(entity)!;
  const vel = velocity.get(entity)!;
  previousPosition.set(entity, { x: pos.x, y: pos.y });

  const response = wallResponse.get(entity);
  if (!response) {
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    return;
  }

  const circle = hitbox.get(entity) ?? POINT;
  escapeWallTile(world.tiles, pos);
  pushOut(world, entity, pos, circle);

  // Displacement left to cover this step. Sweeping with it as the velocity
  // makes contact times fractions of the step, so t > 1 means no hit.
  let step = { x: vel.x * dt, y: vel.y * dt };
  let elapsed = 0;
  for (let i = 0; i < MAX_SLIDES; i++) {
    if (step.x === 0 && step.y === 0) return;

    const contact = firstContact(world, entity, pos, circle, step);
    if (!contact || contact.t > 1) {
      pos.x += step.x;
      pos.y += step.y;
      return;
    }

    pos.x += step.x * contact.t + contact.normal.x * SKIN;
    pos.y += step.y * contact.t + contact.normal.y * SKIN;
    elapsed += (1 - elapsed) * contact.t;

    if (response === "stop") {
      world.components.blocked.set(entity, {
        t: elapsed * dt,
        normal: contact.normal,
      });
      return;
    }

    // Slide: keep what's left of the step minus the part going into the
    // surface.
    const rest = {
      x: step.x * (1 - contact.t),
      y: step.y * (1 - contact.t),
    };
    const into = Math.min(0, dot(rest, contact.normal));
    step = {
      x: rest.x - into * contact.normal.x,
      y: rest.y - into * contact.normal.y,
    };
  }
}

// Earliest contact against wall tiles near the path and every other solid.
function firstContact(
  world: World,
  entity: Entity,
  pos: Vec2,
  circle: Circle,
  step: Vec2,
): Contact | null {
  const { position, hitbox, solid } = world.components;
  let first: Contact | null = null;

  const r = circle.r;
  const walls = wallsInBox(
    world.tiles,
    Math.min(pos.x, pos.x + step.x) - r,
    Math.min(pos.y, pos.y + step.y) - r,
    Math.max(pos.x, pos.x + step.x) + r,
    Math.max(pos.y, pos.y + step.y) + r,
  );
  for (const wall of walls) {
    const c = sweptRectCircle(TILE, STILL, tileCenter(wall), circle, step, pos);
    if (c && (!first || c.t < first.t)) first = c;
  }

  for (const [other] of solid) {
    const otherPos = position.get(other);
    if (other === entity || !otherPos) continue;
    const otherCircle = hitbox.get(other) ?? POINT;
    const c = sweptCircleCircle(
      circle,
      step,
      pos,
      otherCircle,
      STILL,
      otherPos,
    );
    if (c && (!first || c.t < first.t)) first = c;
  }

  return first;
}

// Pushes the mover out of whatever it overlaps, deepest overlap first.
function pushOut(
  world: World,
  entity: Entity,
  pos: Vec2,
  circle: Circle,
): void {
  const { position, hitbox, solid } = world.components;
  for (let i = 0; i < MAX_PUSHES; i++) {
    let deepest: Penetration | null = null;

    const r = circle.r;
    const walls = wallsInBox(
      world.tiles,
      pos.x - r,
      pos.y - r,
      pos.x + r,
      pos.y + r,
    );
    for (const wall of walls) {
      const p = penetrationRectCircle(TILE, tileCenter(wall), circle, pos);
      if (p && p.depth > 0 && (!deepest || p.depth > deepest.depth))
        deepest = p;
    }
    for (const [other] of solid) {
      const otherPos = position.get(other);
      if (other === entity || !otherPos) continue;
      const otherCircle = hitbox.get(other) ?? POINT;
      const p = penetrationCircleCircle(circle, pos, otherCircle, otherPos);
      if (p && p.depth > 0 && (!deepest || p.depth > deepest.depth))
        deepest = p;
    }

    if (!deepest) return;
    pos.x += deepest.normal.x * (deepest.depth + SKIN);
    pos.y += deepest.normal.y * (deepest.depth + SKIN);
  }
}

// If the mover's center is inside a wall tile, pushing out through the
// nearest face can land it in the next wall over. Instead, move the center to
// the closest point on the nearest open tile, then let pushOut handle the
// radius.
function escapeWallTile(tiles: Tiles, pos: Vec2): void {
  const tx = Math.floor(pos.x);
  const ty = Math.floor(pos.y);
  if (!isWall(tiles, tx, ty)) return;

  // A diagonal tile in ring k can be farther than a straight one in ring
  // k + 1, so check one ring past the first that has open ground.
  let best: Vec2 | null = null;
  let bestDist = Infinity;
  let lastRing = MAX_ESCAPE_TILES;
  for (let ring = 1; ring <= lastRing; ring++) {
    if (best) lastRing = Math.min(lastRing, ring);
    for (let y = ty - ring; y <= ty + ring; y++) {
      for (let x = tx - ring; x <= tx + ring; x++) {
        const onRing = Math.max(Math.abs(x - tx), Math.abs(y - ty)) === ring;
        if (!onRing || isWall(tiles, x, y)) continue;
        const spot = {
          x: clamp(pos.x, x + SKIN, x + 1 - SKIN),
          y: clamp(pos.y, y + SKIN, y + 1 - SKIN),
        };
        const dist = Math.hypot(spot.x - pos.x, spot.y - pos.y);
        if (dist < bestDist) {
          best = spot;
          bestDist = dist;
        }
      }
    }
  }
  if (!best) return;
  pos.x = best.x;
  pos.y = best.y;
}

function tileCenter(tile: Vec2): Vec2 {
  return { x: tile.x + 0.5, y: tile.y + 0.5 };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

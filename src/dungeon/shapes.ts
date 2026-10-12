import {
  createMask,
  isOn,
  largestRegion,
  NEIGHBORS_8,
  setOn,
  type Mask,
} from "./mask";
import { float, int, type Range, type Rng } from "./rng";

// Stage 2: each room's floor. A shape is a function from an Rng and its
// spec to a mask, cropped to fit and all one connected piece, or null when
// it couldn't make one. Adding a kind of shape is one entry in SHAPES.

export type ShapeSpec =
  // A plain rectangle, `w` by `h` tiles.
  | { kind: "rect"; w: Range; h: Range }
  // An ellipse filling a `w` by `h` box.
  | { kind: "ellipse"; w: Range; h: Range }
  // A rough cave in a `w` by `h` box, grown by cellular automata: `fill` is
  // the share of floor it starts with (0.6 if unset) and `smoothing` how
  // many rounds it's smoothed (4 if unset).
  | { kind: "cave"; w: Range; h: Range; fill?: number; smoothing?: number };

export type ShapeKind = ShapeSpec["kind"];

type ShapeFn<S> = (rng: Rng, spec: S) => Mask | null;

export const SHAPES: {
  [K in ShapeKind]: ShapeFn<Extract<ShapeSpec, { kind: K }>>;
} = {
  rect: (rng, { w, h }) => {
    const mask = createMask(int(rng, w), int(rng, h));
    mask.cells.fill(1);
    return mask;
  },

  ellipse: (rng, { w, h }) => {
    const width = int(rng, w);
    const height = int(rng, h);
    const mask = createMask(width, height);
    const rx = width / 2;
    const ry = height / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Each cell's center, from the middle, in radii.
        const dx = (x + 0.5 - rx) / rx;
        const dy = (y + 0.5 - ry) / ry;
        setOn(mask, x, y, dx * dx + dy * dy <= 1);
      }
    }
    return largestRegion(mask);
  },

  cave: (rng, { w, h, fill = 0.6, smoothing = 4 }) => {
    const width = int(rng, w);
    const height = int(rng, h);
    let mask = createMask(width, height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        setOn(mask, x, y, float(rng, [0, 1]) < fill);
      }
    }
    for (let round = 0; round < smoothing; round++) mask = smooth(mask);
    const cave = largestRegion(mask);
    // Too little left to be a room: a third of the box at least.
    return cave && onCount(cave) >= (width * height) / 3 ? cave : null;
  },
};

// Tries at a shape before giving up on it.
const SHAPE_TRIES = 10;

// A room floor of the given shape, trying again when a try comes out
// unusable, or null if none did.
export function makeShape(rng: Rng, spec: ShapeSpec): Mask | null {
  const shape = SHAPES[spec.kind] as ShapeFn<ShapeSpec>;
  for (let i = 0; i < SHAPE_TRIES; i++) {
    const mask = shape(rng, spec);
    if (mask) return mask;
  }
  return null;
}

// One round of cave smoothing: a cell becomes floor with 5 or more floor
// neighbors and rock with 3 or fewer, keeping the box's rim as rock.
function smooth(mask: Mask): Mask {
  const next = createMask(mask.width, mask.height);
  for (let y = 1; y < mask.height - 1; y++) {
    for (let x = 1; x < mask.width - 1; x++) {
      const around = NEIGHBORS_8.filter((d) =>
        isOn(mask, x + d.x, y + d.y),
      ).length;
      setOn(next, x, y, around >= 5 || (around === 4 && isOn(mask, x, y)));
    }
  }
  return next;
}

function onCount(mask: Mask): number {
  return mask.cells.reduce((sum, cell) => sum + cell, 0);
}

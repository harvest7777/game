import type { Color } from "../sprite/components";

import type { Entity } from "../world";

// Text that floats up from something and fades, like damage numbers. Its
// entity's Position is what it floats above: kept on the entity it
// `follows` while that's alive, and left where it last was after. The
// renderer raises it on screen as it ages, whichever way the camera faces.
export type FloatingText = {
  text: string;
  color: Color;
  // Seconds alive, and the same at the start of the last tick so the
  // renderer can rise smoothly between ticks.
  age: number;
  previousAge: number;
  lifetime: number;
  // Tiles it rises on screen over its lifetime. It eases out: fast at first,
  // settling at the end, so a stream of numbers separates instead of
  // piling up.
  rise: number;
  // Tiles it starts raised by, so several at once don't overlap.
  lift: number;
  follows?: Entity;
};

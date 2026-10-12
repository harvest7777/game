// Angle partway from `from` to `to` (radians), turning the short way around
// so going from just under 2π to just over 0 doesn't spin the long way.
export function lerpAngle(from: number, to: number, alpha: number): number {
  const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + turn * alpha;
}

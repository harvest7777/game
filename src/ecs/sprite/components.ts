import type { Vec2 } from "../shared/physics/math";

// Which band an entity is drawn in. The renderer owns the actual order
// (player on top of projectiles on top of enemies, all above the ground and
// below walls).
export type SpriteLayer = "enemy" | "projectile" | "player";

// RGBA, each channel 0..1.
export type Color = [number, number, number, number];

export type Glow = {
  // How far the glow reaches past the sprite, in sprite pixels.
  radius: number;
  // Pulses per second; 0 for a steady glow.
  pulseHz: number;
};

export type Outline = { color: Color; glow?: Glow };

// How an entity looks. `name` is a sprite id from the renderer's asset
// manifest, which decides whether it's a single frame or a walk cycle. Pure
// data: only the renderer reads it.
export type Sprite = {
  name: string;
  layer: SpriteLayer;
  outline?: Outline;
};

// The world direction the entity last moved in, as a unit vector. Kept when
// it stops so it keeps facing the same way.
export type Facing = Vec2;

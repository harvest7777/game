import type { Vec2 } from "../shared/physics/math";
import type { SpriteArt } from "./art";

// Which band an entity is drawn in. The renderer owns the actual order
// (player on top of projectiles on top of enemies on top of things lying on
// the ground, like gravestones and loot bags, on top of things set into the
// floor itself, like portals, all above the floor tiles and below walls).
export type SpriteLayer =
  "floor" | "ground" | "enemy" | "projectile" | "player";

// RGBA, each channel 0..1.
export type Color = [number, number, number, number];

export type Glow = {
  // How far the glow reaches past the sprite, in sprite pixels.
  radius: number;
  // Pulses per second; 0 for a steady glow.
  pulseHz: number;
};

export type Outline = { color: Color; glow?: Glow };

// How an entity looks. `art` decides whether it's a single frame, a walk
// cycle or a set of animation clips. Pure data: only the renderer reads it.
export type Sprite = {
  art: SpriteArt;
  layer: SpriteLayer;
  outline?: Outline;
  // How big the art is drawn: 1 is one sprite pixel per 1/8 tile. Only
  // changes the look, never the hitbox.
  scale?: number;
};

// A named clip and its simulation time. The action system owns this for
// bosses; the renderer only samples it between ticks.
export type Animation = {
  clip: string;
  time: number;
  previousTime: number;
  duration: number;
};

// The world direction the entity last moved in, as a unit vector. Kept when
// it stops so it keeps facing the same way.
export type Facing = Vec2;

// Turns the sprite, for things like projectiles that point where they're
// going. `angle` is a world direction in radians, measured from world +x
// toward +y (clockwise on screen when the camera isn't rotated). Art meant to
// be rotated points right. `previous` is the angle at the start of the last
// tick, so the sprite turns smoothly between ticks.
export type Rotation = { angle: number; previous: number };

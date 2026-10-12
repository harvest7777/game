import type { Contact } from "../shared/physics/geometry";
import type { Circle, Vec2 } from "../shared/physics/math";

export type Position = Vec2;
export type Velocity = Vec2;
export type Hitbox = Circle;

// Where the entity was at the start of the last movement step.
export type PreviousPosition = Vec2;

// Blocks movers the same way a wall tile does.
export type Solid = true;

// How a mover reacts to walls and solids. Entities without one pass through.
// "slide" keeps moving along the surface; "stop" ends the step at contact.
export type WallResponse = "slide" | "stop";

// Set on a "stop" mover when it hit something during the last movement step.
// `t` is seconds into the step.
export type Blocked = Contact;

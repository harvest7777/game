// Marks the entity steered by the keyboard.
export type PlayerControlled = true;

// Whether a player-controlled shooter keeps firing while it has a weapon,
// without the Shoot action held.
export type AutoFire = boolean;

// How fast the entity moves when it steers itself, in tiles per second.
// Systems that set velocity (input, AI) read it; movement never does.
export type Speed = number;

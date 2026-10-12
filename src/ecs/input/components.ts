// Marks the entity steered by the keyboard.
export type PlayerControlled = true;

// Whether a player-controlled shooter keeps firing while it has a weapon,
// without the Shoot action held.
export type AutoFire = boolean;

// Authored movement speed in tiles per second for entities without a Speed
// stat, currently enemies. Player movement is derived from its Speed stat.
export type Speed = number;
export type MoveSpeed = Speed;

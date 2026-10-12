/**
 * Following ECS, every object is actually just sumb data storage.
 * These should never be responsible for handling behavior or updates.
 */

export type Position = {
  x: number;
  y: number;
};

export type State = {
  hitpoints: number;
  manapoints: number;
};

export type Stats = {
  health: number;
  mana: number;
  speed: number;
  defense: number;
  vitality: number;
  wisdom: number;
  attack: number;
  dexterity: number;
};

export type Velocity = {
  tilesPerSecond: number;
};

/**
 * Following ECS, every object is actually just sumb data storage.
 * These should never be responsible for handling behavior or updates.
 */

type Position = {
  x: number;
  y: number;
}

type State = {
  hitpoints: number;
  manapoints: number;
}

type Stats = {
  health: number;
  mana: number;
  speed: number;
  defense: number;
  vitality: number;
  wisdom: number;
  attack: number;
  dexterity: number;
}

type Velocity = {
  tilesPerSecond: number;
}

type Entity = {
  position: Position;
  stats: Stats;
  state: State;
  velocity: Velocity;
}

type Player = {
  position: Position;
  stats: Stats;
  state: State;
  velocity: Velocity;
}

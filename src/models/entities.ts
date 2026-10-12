import type { Position, Velocity, State, Stats } from "./components";

export type Entity = {
  position: Position;
  stats: Stats;
  state: State;
  velocity: Velocity;
};

export type Player = {
  position: Position;
  stats: Stats;
  state: State;
  velocity: Velocity;
};

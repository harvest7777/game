import type { LootBagDef } from "./definitions";

export type LootBag = {
  def: LootBagDef;
  previousAge: number;
  age: number;
};

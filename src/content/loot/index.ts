import { createLootRuntime } from "../../ecs/loot/runtime";
import { enemies } from "../enemies";
import { items } from "../items";
import { lootBags } from "./bags";

export const gameLoot = createLootRuntime({
  items: Object.values(items),
  tables: Object.values(enemies).flatMap((enemy) =>
    enemy.loot ? [enemy.loot] : [],
  ),
  bags: lootBags,
});

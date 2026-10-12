import type { EnemyDef } from "../../ecs/enemy/definitions";
import { dummy } from "./dummy";
import { slime } from "./slime";
import { archer } from "./archer";
import { boar } from "./boar";
import { slimeKing } from "./slimeKing";

// Every kind of enemy, by id.
export const enemies = {
  dummy,
  slime,
  archer,
  boar,
  slimeKing,
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof enemies;

export const enemyIds = Object.keys(enemies) as EnemyId[];

import { defineEnemy } from "../../ecs/enemy/definitions";
import { archerVolley } from "../weapons/archerVolley";
import { OUTLINED } from "./shared";

export const archer = defineEnemy({
  sprite: {
    art: { kind: "static", file: "enemies/archer" },
    outline: OUTLINED,
  },
  hitbox: { r: 0.35 },
  health: 100,
  speed: 3,
  weapon: archerVolley,
  detectRange: 9,
  idle: { kind: "wander", radius: 3 },
  // Keeps its distance, circling while it shoots.
  aggro: { kind: "orbit", radius: 5 },
  deathSound: "enemyDeath",
});

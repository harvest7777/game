import type { CharacterDef } from "../../ecs/character/definitions";
import { wizard } from "./wizard";

// Every playable class, in character list order.
export const characters = {
  wizard,
} satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof characters;

export const characterIds = Object.keys(characters) as CharacterId[];

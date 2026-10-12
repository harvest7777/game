import type { Speed } from "../input/components";
import type { ItemDef } from "../inventory/items";
import type { Hitbox } from "../movement/components";
import type { Sprite } from "../sprite/components";

// What a playable character is: a class to pick from the character list.
// Each is its own file under src/content/characters. Fields reuse the
// component types they end up in.
export type CharacterDef = {
  name: string;
  sprite: Pick<Sprite, "art" | "outline" | "scale">;
  hitbox: Hitbox;
  // Starting and maximum health.
  health: number;
  // Tiles per second.
  speed: Speed;
  // Worn from the start.
  startingWeapon?: ItemDef;
};

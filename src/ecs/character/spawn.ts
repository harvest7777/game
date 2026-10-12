import { addControllable, addMovable, addSprite } from "../bundles";
import { addHoldings } from "../inventory/bundle";
import type { Vec2 } from "../shared/physics/math";
import { spawn, type Entity, type World } from "../world";
import { addStats, fillResources } from "../stats/runtime";
import type { CharacterDef } from "./definitions";

// Creates a player-controlled character from its class at `at`: on the
// player team, at full effective health and mana, wearing its starting
// equipment with an empty inventory. Everything taken from the definition is
// copied, so characters never share objects with it.
export function spawnCharacter(
  world: World,
  def: CharacterDef,
  at: Vec2,
): Entity {
  const entity = spawn(world);
  const { components } = world;

  components.character.set(entity, { def });
  addMovable(world, entity, { at, hitbox: def.hitbox });
  addControllable(world, entity);
  addSprite(world, entity, {
    art: def.sprite.art,
    layer: "player",
    ...(def.sprite.scale !== undefined && { scale: def.sprite.scale }),
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });
  components.team.set(entity, "player");
  addStats(world, entity, def.stats);
  addHoldings(world, entity, { equipment: def.startingEquipment });
  // A newly spawned character starts full, including capacity from gear it
  // begins with. Equipping that same gear later does not heal it.
  fillResources(world, entity);
  return entity;
}

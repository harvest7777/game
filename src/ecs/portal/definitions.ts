import type { Outline } from "../sprite/components";
import type { SpriteArt } from "../sprite/art";

// A kind of portal: what it says, how it looks and where it goes. `to`
// names a destination the game resolves outside the simulation, like
// "nexus" or a dungeon id, so the ECS never builds levels itself.
export type PortalDef = {
  label: string;
  to: string;
  sprite: { art: SpriteArt; outline?: Outline };
  // How close, in tiles, a character has to stand to enter. 1 if unset.
  radius?: number;
};

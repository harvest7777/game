import type { PortalDef } from "../../ecs/portal/definitions";
import { BLACK_OUTLINE } from "../../ecs/sprite/components";

// Into a fresh Abyss of Demons, from the nexus.
export const abyssPortal: PortalDef = {
  label: "Abyss of Demons",
  to: "abyss",
  sprite: {
    art: { kind: "static", file: "portals/abyss" },
    outline: BLACK_OUTLINE,
  },
};

import type { PortalDef } from "../../ecs/portal/definitions";
import { BLACK_OUTLINE } from "../../ecs/sprite/components";

// The way home, opened where a dungeon's boss falls.
export const nexusPortal: PortalDef = {
  label: "Nexus",
  to: "nexus",
  sprite: {
    art: { kind: "static", file: "portals/nexus" },
    outline: BLACK_OUTLINE,
  },
};

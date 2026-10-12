import type { PortalDef } from "../../ecs/portal/definitions";
import { BLACK_OUTLINE } from "../../ecs/sprite/components";

// Into a fresh Test Caves, from the nexus.
export const testCavesPortal: PortalDef = {
  label: "Test Caves",
  to: "testCaves",
  sprite: {
    art: { kind: "static", file: "portals/caves" },
    outline: BLACK_OUTLINE,
  },
};

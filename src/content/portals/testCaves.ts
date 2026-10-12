import type { PortalDef } from "../../ecs/portal/definitions";

// Into a fresh Test Caves, from the nexus.
export const testCavesPortal: PortalDef = {
  label: "Test Caves",
  to: "testCaves",
  sprite: {
    art: { kind: "static", file: "portals/abyss" },
    outline: { color: [1, 0.55, 0.2, 1], glow: { radius: 2, pulseHz: 0.8 } },
  },
};

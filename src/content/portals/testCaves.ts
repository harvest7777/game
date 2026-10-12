import type { PortalDef } from "../../ecs/portal/definitions";

// Into a fresh Test Caves, from the nexus.
export const testCavesPortal: PortalDef = {
  label: "Test Caves",
  to: "testCaves",
  sprite: {
    art: { kind: "static", file: "portals/caves" },
    outline: { color: [0.5, 1, 0.55, 1], glow: { radius: 2, pulseHz: 0.8 } },
  },
};

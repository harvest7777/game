import type { PortalDef } from "../../ecs/portal/definitions";

// The way home, opened where a dungeon's boss falls.
export const nexusPortal: PortalDef = {
  label: "Nexus",
  to: "nexus",
  sprite: {
    art: { kind: "static", file: "portals/nexus" },
    outline: { color: [0.6, 0.85, 1, 1], glow: { radius: 2, pulseHz: 0.8 } },
  },
};

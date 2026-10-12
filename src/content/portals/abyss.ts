import type { PortalDef } from "../../ecs/portal/definitions";

// Into a fresh Abyss of Demons, from the nexus.
export const abyssPortal: PortalDef = {
  label: "Abyss of Demons",
  to: "abyss",
  sprite: {
    art: { kind: "static", file: "portals/abyss" },
    outline: { color: [1, 0.25, 0.1, 1], glow: { radius: 2, pulseHz: 0.8 } },
  },
};

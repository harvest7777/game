import { describe, expect, it } from "vitest";
import { testItem } from "../testing/defs";
import type { SlotRef } from "../ecs/inventory/components";
import { addHoldings } from "../ecs/inventory/bundle";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import { layoutHud } from "./draw";
import {
  DOUBLE_CLICK,
  hitTest,
  hudPointer,
  type PlacedPanel,
  type PointerEvent,
} from "./input";
import { SLOT } from "./layout";
import { createHudState, type HudState } from "./state";

const SCREEN = { w: 300, h: 200 };

// The real HUD: a staff worn, a lance and a comet staff carried.
function setup() {
  const world = createWorld(createTiles(1, 1));
  const player = spawn(world);
  addHoldings(world, player, {
    equipment: { weapon: testItem({ name: "Staff" }) },
    carrying: [testItem({ name: "Lance" }), testItem({ name: "Comet" })],
  });
  const state = createHudState();
  const panels = () => layoutHud(world, player, state, SCREEN, 0);
  return { state, panels };
}

// The middle of a slot, in UI pixels on screen.
function centerOf(panels: PlacedPanel[], ref: SlotRef) {
  for (const panel of panels) {
    for (const e of panel.layout.elements) {
      if (e.kind !== "slot") continue;
      const same =
        e.ref.in === ref.in &&
        (e.ref.in === "equipment"
          ? ref.in === "equipment" && e.ref.slot === ref.slot
          : e.ref.in === "inventory"
            ? ref.in === "inventory" && e.ref.index === ref.index
            : ref.in === "container" &&
              e.ref.entity === ref.entity &&
              e.ref.index === ref.index);
      if (same) {
        return {
          x: panel.x + e.rect.x + e.rect.w / 2,
          y: panel.y + e.rect.y + e.rect.h / 2,
        };
      }
    }
  }
  throw new Error("no such slot");
}

const inv = (index: number): SlotRef => ({ in: "inventory", index });
const worn: SlotRef = { in: "equipment", slot: "weapon" };
const bagSlot = (entity: number, index: number): SlotRef => ({
  in: "container",
  entity,
  index,
});

function send(
  state: HudState,
  panels: PlacedPanel[],
  ...events: PointerEvent[]
) {
  const commands = [];
  let used = false;
  for (const event of events) {
    const result = hudPointer(state, event, panels, SCREEN);
    commands.push(...result.commands);
    used = result.used;
  }
  return { commands, used };
}

describe("hitTest", () => {
  it("finds the slot under a point and whether it holds an item", () => {
    const { panels } = setup();
    const p = panels();
    expect(hitTest(p, centerOf(p, inv(0)))).toEqual({
      panel: "inventory",
      slot: inv(0),
      hasItem: true,
    });
    expect(hitTest(p, centerOf(p, inv(5)))).toEqual({
      panel: "inventory",
      slot: inv(5),
      hasItem: false,
    });
  });

  it("finds the panel but no slot in the gap between slots", () => {
    const { panels } = setup();
    const p = panels();
    const equipment = p.find((x) => x.id === "equipment")!;
    expect(
      hitTest(p, { x: equipment.x + SLOT + 1, y: equipment.y + 1 }),
    ).toEqual({ panel: "equipment", hasItem: false });
  });

  it("picks the panel on top where panels overlap", () => {
    const { state, panels } = setup();
    // Put the inventory (drawn last, so on top) right over the equipment.
    state.panels.inventory = { to: "equipment", side: "right", gap: -54 };
    const p = panels();
    const equipment = p.find((x) => x.id === "equipment")!;
    expect(hitTest(p, { x: equipment.x + 1, y: equipment.y + 1 })?.panel).toBe(
      "inventory",
    );
  });

  it("finds nothing off the HUD", () => {
    const { panels } = setup();
    expect(hitTest(panels(), { x: 5, y: 5 })).toBeUndefined();
  });
});

describe("hudPointer", () => {
  describe("hover", () => {
    it("tracks the slot under the pointer", () => {
      const { state, panels } = setup();
      const p = panels();
      send(state, p, { kind: "move", ...centerOf(p, inv(3)) });
      expect(state.hover).toEqual(inv(3));
      send(state, p, { kind: "move", x: 5, y: 5 });
      expect(state.hover).toBeUndefined();
    });

    it("forgets the pointer when it leaves the game", () => {
      const { state, panels } = setup();
      const p = panels();
      send(
        state,
        p,
        { kind: "move", ...centerOf(p, inv(3)) },
        { kind: "leave" },
      );
      expect(state.pointer).toBeUndefined();
      expect(state.hover).toBeUndefined();
    });
  });

  describe("dragging items", () => {
    it("moves an item to the slot it's dropped on", () => {
      const { state, panels } = setup();
      const p = panels();
      const { commands } = send(
        state,
        p,
        { kind: "down", ...centerOf(p, inv(0)), time: 0 },
        { kind: "move", ...centerOf(p, inv(6)) },
        { kind: "up", ...centerOf(p, inv(6)), time: 0.5 },
      );
      expect(commands).toEqual([{ kind: "move", from: inv(0), to: inv(6) }]);
    });

    it("equips by dropping onto an equipment slot", () => {
      const { state, panels } = setup();
      const p = panels();
      const { commands } = send(
        state,
        p,
        { kind: "down", ...centerOf(p, inv(1)), time: 0 },
        { kind: "move", ...centerOf(p, worn) },
        { kind: "up", ...centerOf(p, worn), time: 0.5 },
      );
      expect(commands).toEqual([{ kind: "move", from: inv(1), to: worn }]);
    });

    it("does nothing when dropped off any slot or back where it was", () => {
      const { state, panels } = setup();
      const p = panels();
      const away = send(
        state,
        p,
        { kind: "down", ...centerOf(p, inv(0)), time: 0 },
        { kind: "move", x: 5, y: 5 },
        { kind: "up", x: 5, y: 5, time: 0.5 },
      );
      const back = send(
        state,
        p,
        { kind: "down", ...centerOf(p, inv(0)), time: 1 },
        { kind: "move", x: 5, y: 5 },
        { kind: "move", ...centerOf(p, inv(0)) },
        { kind: "up", ...centerOf(p, inv(0)), time: 1.5 },
      );
      expect(away.commands).toEqual([]);
      expect(back.commands).toEqual([]);
    });

    it("doesn't start a drag from an empty slot", () => {
      const { state, panels } = setup();
      const p = panels();
      send(state, p, { kind: "down", ...centerOf(p, inv(5)), time: 0 });
      expect(state.press?.item).toBeUndefined();
    });

    it("counts as a drag only once the pointer has moved a little", () => {
      const { state, panels } = setup();
      const p = panels();
      const at = centerOf(p, inv(0));
      send(state, p, { kind: "down", ...at, time: 0 });
      send(state, p, { kind: "move", x: at.x + 1, y: at.y });
      expect(state.press!.dragging).toBe(false);
      send(state, p, { kind: "move", x: at.x + 3, y: at.y });
      expect(state.press!.dragging).toBe(true);
    });
  });

  describe("double-click", () => {
    function doubleClick(ref: SlotRef, gap = 0.2) {
      const { state, panels } = setup();
      const p = panels();
      const at = centerOf(p, ref);
      return send(
        state,
        p,
        { kind: "down", ...at, time: 0 },
        { kind: "up", ...at, time: 0.05 },
        { kind: "down", ...at, time: gap },
        { kind: "up", ...at, time: gap + 0.05 },
      );
    }

    it("equips an inventory item, like its number key", () => {
      expect(doubleClick(inv(1)).commands).toEqual([
        { kind: "equip", index: 1 },
      ]);
    });

    it("takes a worn item off", () => {
      expect(doubleClick(worn).commands).toEqual([
        { kind: "unequip", slot: "weapon" },
      ]);
    });

    it("takes an item from a world container", () => {
      const ref = bagSlot(42, 0);
      const panel: PlacedPanel = {
        id: "container",
        x: 0,
        y: 0,
        layout: {
          w: 12,
          h: 12,
          elements: [
            {
              kind: "slot",
              rect: { x: 0, y: 0, w: 12, h: 12 },
              ref,
            },
            {
              kind: "icon",
              rect: { x: 2, y: 2, w: 8, h: 8 },
              file: "items/lance",
              ref,
            },
          ],
        },
      };
      const state = createHudState();
      const at = centerOf([panel], ref);

      const { commands } = send(
        state,
        [panel],
        { kind: "down", ...at, time: 0 },
        { kind: "up", ...at, time: 0.05 },
        { kind: "down", ...at, time: 0.2 },
        { kind: "up", ...at, time: 0.25 },
      );

      expect(commands).toEqual([{ kind: "take", from: ref }]);
    });

    it("needs both clicks close together", () => {
      expect(doubleClick(inv(1), DOUBLE_CLICK + 0.1).commands).toEqual([]);
    });

    it("needs both clicks on the same slot", () => {
      const { state, panels } = setup();
      const p = panels();
      const { commands } = send(
        state,
        p,
        { kind: "down", ...centerOf(p, inv(0)), time: 0 },
        { kind: "up", ...centerOf(p, inv(0)), time: 0.05 },
        { kind: "down", ...centerOf(p, inv(1)), time: 0.1 },
        { kind: "up", ...centerOf(p, inv(1)), time: 0.15 },
      );
      expect(commands).toEqual([]);
    });
  });

  describe("moving panels in edit mode", () => {
    it("doesn't move panels outside edit mode", () => {
      const { state, panels } = setup();
      const p = panels();
      const equipment = p.find((x) => x.id === "equipment")!;
      const grab = { x: equipment.x + SLOT + 1, y: equipment.y + 1 };
      const before = { ...state.panels.equipment };

      send(
        state,
        p,
        { kind: "down", ...grab, time: 0 },
        { kind: "move", x: 20, y: 20 },
        { kind: "up", x: 20, y: 20, time: 1 },
      );

      expect(state.panels.equipment).toEqual(before);
    });

    it("grabs the whole panel even when pressing on an item", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      send(state, p, { kind: "down", ...centerOf(p, worn), time: 0 });
      expect(state.press?.panel?.id).toBe("equipment");
      expect(state.press?.item).toBeUndefined();
    });

    it("grabs a panel's whole group by the panel it hangs off", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      send(state, p, { kind: "down", ...centerOf(p, inv(0)), time: 0 });
      expect(state.press?.panel?.id).toBe("equipment");
    });

    it("drags a panel by its frame so the grabbed point follows", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      const equipment = p.find((x) => x.id === "equipment")!;
      const grab = { x: equipment.x + SLOT + 1, y: equipment.y + 1 };

      send(
        state,
        p,
        { kind: "down", ...grab, time: 0 },
        { kind: "move", x: grab.x - 100, y: grab.y - 50 },
      );

      const moved = panels().find((x) => x.id === "equipment")!;
      expect(moved.x).toBe(equipment.x - 100);
      expect(moved.y).toBe(equipment.y - 50);
    });

    it("keeps a dragged panel on whole UI pixels", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      const equipment = p.find((x) => x.id === "equipment")!;
      const grab = { x: equipment.x + SLOT + 1, y: equipment.y + 1 };

      send(
        state,
        p,
        { kind: "down", ...grab, time: 0 },
        { kind: "move", x: grab.x - 40.3, y: grab.y - 20.6 },
        { kind: "up", x: grab.x - 40.3, y: grab.y - 20.6, time: 1 },
      );

      const { x, y } = state.panels.equipment;
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
    });

    it("keeps a dragged panel on screen", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      const equipment = p.find((x) => x.id === "equipment")!;
      const grab = { x: equipment.x + SLOT + 1, y: equipment.y + 1 };

      send(
        state,
        p,
        { kind: "down", ...grab, time: 0 },
        { kind: "move", x: 2000, y: 2000 },
      );

      const moved = panels().find((x) => x.id === "equipment")!;
      expect(moved.x + moved.layout.w).toBe(SCREEN.w);
      expect(moved.y + moved.layout.h).toBe(SCREEN.h);
    });

    it("attaches a dropped panel to its nearest corner", () => {
      const { state, panels } = setup();
      state.editMode = true;
      const p = panels();
      const equipment = p.find((x) => x.id === "equipment")!;
      const grab = { x: equipment.x + SLOT + 1, y: equipment.y + 1 };

      send(
        state,
        p,
        { kind: "down", ...grab, time: 0 },
        { kind: "move", x: 30, y: 20 },
        { kind: "up", x: 30, y: 20, time: 1 },
      );

      expect(state.panels.equipment.corner).toBe("topLeft");
      // Grabbed 13 across and 1 down, dropped at (30, 20).
      expect(state.panels.equipment).toEqual({
        corner: "topLeft",
        x: 17,
        y: 19,
      });
    });
  });

  it("says when it used an event, so the game can ignore it", () => {
    const { state, panels } = setup();
    const p = panels();
    expect(
      send(state, p, { kind: "down", ...centerOf(p, inv(0)), time: 0 }).used,
    ).toBe(true);
    expect(send(state, p, { kind: "up", x: 5, y: 5, time: 0.1 }).used).toBe(
      true,
    );
    expect(send(state, p, { kind: "down", x: 5, y: 5, time: 1 }).used).toBe(
      false,
    );
  });
});

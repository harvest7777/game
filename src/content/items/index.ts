import {
  consumableItemDef,
  equipmentItemDef,
  type ItemDef,
} from "../../ecs/inventory/items";
import { weapons } from "../weapons";
import { SPECIAL, STAT_POTION } from "./loot";
import apprenticeStaff from "./apprenticeStaff.json";
import hasteStaff from "./hasteStaff.json";
import serpentStaff from "./serpentStaff.json";
import currentStaff from "./currentStaff.json";
import cometStaff from "./cometStaff.json";
import mireStaff from "./mireStaff.json";
import spiralStaff from "./spiralStaff.json";
import phantomStaff from "./phantomStaff.json";
import prejudiceStaff from "./prejudiceStaff.json";
import boomerang from "./boomerang.json";
import lance from "./lance.json";
import helixStaff from "./helixStaff.json";
import leafStaff from "./leafStaff.json";
import forkStaff from "./forkStaff.json";
import bloomStaff from "./bloomStaff.json";
import demonfireStaff from "./demonfireStaff.json";
import healthPotion from "./healthPotion.json";
import apprenticeRobe from "./apprenticeRobe.json";
import goldenRing from "./goldenRing.json";

// Every item, by id.
const registries = {
  weapons,
  tags: { special: SPECIAL, statPotion: STAT_POTION },
};

export const items = {
  apprenticeStaff: equipmentItemDef(apprenticeStaff, registries),
  hasteStaff: equipmentItemDef(hasteStaff, registries),
  serpentStaff: equipmentItemDef(serpentStaff, registries),
  currentStaff: equipmentItemDef(currentStaff, registries),
  cometStaff: equipmentItemDef(cometStaff, registries),
  mireStaff: equipmentItemDef(mireStaff, registries),
  spiralStaff: equipmentItemDef(spiralStaff, registries),
  phantomStaff: equipmentItemDef(phantomStaff, registries),
  prejudiceStaff: equipmentItemDef(prejudiceStaff, registries),
  boomerang: equipmentItemDef(boomerang, registries),
  lance: equipmentItemDef(lance, registries),
  helixStaff: equipmentItemDef(helixStaff, registries),
  leafStaff: equipmentItemDef(leafStaff, registries),
  forkStaff: equipmentItemDef(forkStaff, registries),
  bloomStaff: equipmentItemDef(bloomStaff, registries),
  demonfireStaff: equipmentItemDef(demonfireStaff, registries),
  healthPotion: consumableItemDef(healthPotion, registries),
  apprenticeRobe: equipmentItemDef(apprenticeRobe, registries),
  goldenRing: equipmentItemDef(goldenRing, registries),
} satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof items;

export const itemIds = Object.keys(items) as ItemId[];

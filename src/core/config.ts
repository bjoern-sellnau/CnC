/** Central tuning values. Unit/building data lives in core/factions.ts. */

export const TILE_SIZE = 24;
export const MAP_WIDTH = 64; // tiles
export const MAP_HEIGHT = 64; // tiles

/** Resource (Tiberium-like) value carried by a full harvester load. */
export const HARVESTER_CAPACITY = 700;
export const RESOURCE_PER_TILE = 1000; // how much a resource tile holds
export const STARTING_CREDITS = 5000;

// Re-export the data tables & types so existing imports keep working.
export type {
  UnitStats,
  BuildingStats,
  DefenseStats,
  SuperweaponDef,
  ArmyDef,
} from "./factions";
export {
  UNIT_STATS,
  BUILDING_STATS,
  ARMIES,
  ARMY_IDS,
  armyBuilding,
  armyUnit,
  armyBuildOrder,
  armyUnitOrder,
  unitRole,
  buildingRole,
} from "./factions";

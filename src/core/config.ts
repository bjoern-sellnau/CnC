/** Central tuning values and static data tables for the game. */

import type { BuildingType, UnitType } from "./types";

export const TILE_SIZE = 24;
export const MAP_WIDTH = 64; // tiles
export const MAP_HEIGHT = 64; // tiles

/** Resource (Tiberium-like) value carried by a full harvester load. */
export const HARVESTER_CAPACITY = 700;
export const RESOURCE_PER_TILE = 1000; // how much a resource tile holds
export const STARTING_CREDITS = 5000;

export interface UnitStats {
  name: string;
  cost: number;
  hp: number;
  speed: number; // pixels per second
  damage: number;
  range: number; // pixels
  attackCooldown: number; // seconds between attacks
  sightRadius: number; // pixels
  buildTime: number; // seconds
  /** Which building must exist to produce this unit. */
  producedBy: BuildingType;
  color: string;
  radius: number; // pixels, for drawing & collision
  /** Flying units ignore terrain and pathfinding (straight-line movement). */
  flying?: boolean;
  /** Area-of-effect radius in pixels for splash damage (0 = single target). */
  splashRadius?: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  soldier: {
    name: "Soldat",
    cost: 100,
    hp: 60,
    speed: 55,
    damage: 8,
    range: 70,
    attackCooldown: 0.6,
    sightRadius: 150,
    buildTime: 3,
    producedBy: "barracks",
    color: "#9ad06b",
    radius: 6,
  },
  rocket_soldier: {
    name: "Raketensoldat",
    cost: 300,
    hp: 70,
    speed: 48,
    damage: 28,
    range: 140,
    attackCooldown: 1.3,
    sightRadius: 180,
    buildTime: 5,
    producedBy: "barracks",
    color: "#c97b5a",
    radius: 6,
  },
  tank: {
    name: "Panzer",
    cost: 600,
    hp: 320,
    speed: 45,
    damage: 35,
    range: 120,
    attackCooldown: 1.4,
    sightRadius: 190,
    buildTime: 8,
    producedBy: "war_factory",
    color: "#c8b95a",
    radius: 10,
  },
  artillery: {
    name: "Artillerie",
    cost: 900,
    hp: 160,
    speed: 32,
    damage: 70,
    range: 230,
    attackCooldown: 3,
    sightRadius: 220,
    buildTime: 11,
    producedBy: "war_factory",
    color: "#b08040",
    radius: 10,
    splashRadius: 45,
  },
  aircraft: {
    name: "Kampfhubschrauber",
    cost: 1200,
    hp: 150,
    speed: 115,
    damage: 22,
    range: 110,
    attackCooldown: 0.45,
    sightRadius: 250,
    buildTime: 12,
    producedBy: "war_factory",
    color: "#7a8a9a",
    radius: 9,
    flying: true,
  },
  harvester: {
    name: "Sammler",
    cost: 1100,
    hp: 400,
    speed: 40,
    damage: 0,
    range: 0,
    attackCooldown: 0,
    sightRadius: 130,
    buildTime: 10,
    producedBy: "war_factory",
    color: "#8a9bb0",
    radius: 11,
  },
};

export interface DefenseStats {
  damage: number;
  range: number; // pixels
  attackCooldown: number; // seconds
  sightRadius: number; // pixels
}

export interface BuildingStats {
  name: string;
  cost: number;
  hp: number;
  /** Footprint in tiles. */
  width: number;
  height: number;
  buildTime: number; // seconds
  power: number; // positive = produces, negative = consumes
  color: string;
  /** Building that must exist before this one can be built (tech tree). */
  requires?: BuildingType;
  /** Whether this building can produce things (shown as production target). */
  producesUnits?: UnitType[];
  /** If present, the building automatically fires at nearby enemies. */
  defense?: DefenseStats;
}

export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  construction_yard: {
    name: "Bauhof",
    cost: 0,
    hp: 1500,
    width: 3,
    height: 3,
    buildTime: 0,
    power: 0,
    color: "#7a6a4a",
  },
  power_plant: {
    name: "Kraftwerk",
    cost: 300,
    hp: 500,
    width: 2,
    height: 2,
    buildTime: 4,
    power: 100,
    color: "#4a6a8a",
  },
  refinery: {
    name: "Raffinerie",
    cost: 2000,
    hp: 900,
    width: 3,
    height: 2,
    buildTime: 10,
    power: -40,
    color: "#8a7a4a",
    requires: "power_plant",
  },
  barracks: {
    name: "Kaserne",
    cost: 400,
    hp: 600,
    width: 2,
    height: 2,
    buildTime: 6,
    power: -20,
    color: "#6a8a5a",
    requires: "power_plant",
    producesUnits: ["soldier"],
  },
  war_factory: {
    name: "Waffenfabrik",
    cost: 2000,
    hp: 1000,
    width: 3,
    height: 3,
    buildTime: 12,
    power: -50,
    color: "#8a5a5a",
    requires: "refinery",
    producesUnits: ["tank", "artillery", "aircraft", "harvester"],
  },
  guard_tower: {
    name: "Geschützturm",
    cost: 600,
    hp: 700,
    width: 1,
    height: 1,
    buildTime: 5,
    power: -30,
    color: "#6a6a7a",
    requires: "barracks",
    defense: { damage: 26, range: 165, attackCooldown: 0.9, sightRadius: 190 },
  },
  wall: {
    name: "Mauer",
    cost: 25,
    hp: 500,
    width: 1,
    height: 1,
    buildTime: 1,
    power: 0,
    color: "#5a5a52",
  },
};

/** Order buildings appear in the sidebar. */
export const BUILD_ORDER: BuildingType[] = [
  "power_plant",
  "refinery",
  "barracks",
  "war_factory",
  "guard_tower",
  "wall",
];

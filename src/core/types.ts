/** Shared types used across the game. */

export type Faction = "player" | "enemy";

export interface Vec2 {
  x: number;
  y: number;
}

export type TerrainType = "grass" | "sand" | "rock" | "water";

/** A unit kind that can be produced and commanded. */
export type UnitType = "soldier" | "tank" | "harvester";

/** A building kind that can be constructed. */
export type BuildingType =
  | "construction_yard"
  | "power_plant"
  | "refinery"
  | "barracks"
  | "war_factory";

/** Anything the build sidebar can produce. */
export type ProducibleType = UnitType | BuildingType;

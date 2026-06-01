/** Shared types used across the game. */

export type Faction = "player" | "enemy";

/** The three playable sides, each with its own roster and tech tree. */
export type ArmyId = "alliance" | "legion" | "syndicate";

export interface Vec2 {
  x: number;
  y: number;
}

export type TerrainType = "grass" | "sand" | "rock" | "water";

/**
 * Functional role of a building. The engine reasons about roles (e.g. "the
 * refinery", "the vehicle factory") so each army can use its own building ids.
 */
export type BuildingRole =
  | "hq" // construction yard / base
  | "power"
  | "refinery"
  | "infantry" // produces infantry
  | "vehicle" // produces vehicles & aircraft
  | "defense" // auto-firing turret
  | "wall"
  | "super"; // superweapon

/** Functional role of a unit. */
export type UnitRole =
  | "harvester"
  | "infantry"
  | "anti_armor"
  | "tank"
  | "artillery"
  | "air"
  | "special";

/** Unit and building ids are army-specific strings (see core/factions.ts). */
export type UnitType = string;
export type BuildingType = string;

/** Anything the build sidebar can produce. */
export type ProducibleType = UnitType | BuildingType;

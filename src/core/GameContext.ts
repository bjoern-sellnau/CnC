import type { Faction, Vec2 } from "./types";
import type { GameMap } from "../world/GameMap";
import type { Entity } from "../entities/Entity";
import type { Unit } from "../entities/Unit";
import type { Building } from "../entities/Building";

/**
 * The slice of the game that entities and systems are allowed to touch.
 * Keeps entities decoupled from the concrete Game class (avoids import cycles).
 */
export interface GameContext {
  readonly map: GameMap;
  readonly units: Unit[];
  readonly buildings: Building[];

  /** When true, units record their A* search for the debug overlay. */
  readonly debug: boolean;

  /** Add credits to a faction's account. */
  addCredits(faction: Faction, amount: number): void;

  /**
   * Spawn a visual projectile/tracer from -> to dealing damage on arrival.
   * If `splashRadius` > 0 the damage is applied to all enemies in that radius.
   */
  spawnProjectile(
    from: Vec2,
    to: Vec2,
    damage: number,
    target: Entity,
    splashRadius?: number
  ): void;

  /** Find the nearest live enemy entity within `range` pixels of `pos`. */
  findNearestEnemy(faction: Faction, pos: Vec2, range: number): Entity | null;

  /** Nearest refinery belonging to `faction`, or null. */
  findNearestRefinery(faction: Faction, pos: Vec2): Building | null;

  /** Spawn a small explosion effect. */
  spawnExplosion(pos: Vec2, size: number): void;
}

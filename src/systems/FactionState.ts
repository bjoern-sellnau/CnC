import type { BuildingType, Faction, ProducibleType, UnitType } from "../core/types";
import { BUILDING_STATS, UNIT_STATS } from "../core/config";

export interface ProductionItem {
  what: ProducibleType;
  category: "unit" | "building";
  total: number; // seconds
  remaining: number; // seconds
  ready: boolean; // building finished, awaiting placement
}

/** Maximum number of units that may sit in the production queue at once. */
export const MAX_UNIT_QUEUE = 20;

/**
 * Per-faction bookkeeping: credits, power balance, and production.
 * Units use a multi-slot queue — how many build in parallel depends on the
 * number of producing buildings (handled by the Game). Buildings stay single
 * slot (one construction yard at a time).
 */
export class FactionState {
  readonly faction: Faction;
  credits: number;

  powerProduced = 0;
  powerConsumed = 0;

  unitQueue: ProductionItem[] = [];
  buildingQueue: ProductionItem | null = null;

  constructor(faction: Faction, startingCredits: number) {
    this.faction = faction;
    this.credits = startingCredits;
  }

  get power(): number {
    return this.powerProduced - this.powerConsumed;
  }

  /** Low power slows production (classic C&C behaviour). */
  get productionSpeedFactor(): number {
    return this.power < 0 ? 0.4 : 1;
  }

  canAfford(amount: number): boolean {
    return this.credits >= amount;
  }

  /** Number of queued units of a given type. */
  queuedUnitCount(type: UnitType): number {
    return this.unitQueue.reduce((n, i) => (i.what === type ? n + 1 : n), 0);
  }

  /** Try to queue a unit. Returns false if the queue is full or unaffordable. */
  queueUnit(type: UnitType): boolean {
    if (this.unitQueue.length >= MAX_UNIT_QUEUE) return false;
    const cost = UNIT_STATS[type].cost;
    if (!this.canAfford(cost)) return false;
    this.credits -= cost;
    this.unitQueue.push({
      what: type,
      category: "unit",
      total: UNIT_STATS[type].buildTime,
      remaining: UNIT_STATS[type].buildTime,
      ready: false,
    });
    return true;
  }

  /** Try to queue a building. Returns false if busy or unaffordable. */
  queueBuilding(type: BuildingType): boolean {
    if (this.buildingQueue) return false;
    const cost = BUILDING_STATS[type].cost;
    if (!this.canAfford(cost)) return false;
    this.credits -= cost;
    this.buildingQueue = {
      what: type,
      category: "building",
      total: BUILDING_STATS[type].buildTime,
      remaining: BUILDING_STATS[type].buildTime,
      ready: false,
    };
    return true;
  }

  refund(item: ProductionItem): void {
    const cost =
      item.category === "unit"
        ? UNIT_STATS[item.what as UnitType].cost
        : BUILDING_STATS[item.what as BuildingType].cost;
    this.credits += cost;
  }
}

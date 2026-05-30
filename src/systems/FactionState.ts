import type { BuildingType, Faction, ProducibleType, UnitType } from "../core/types";
import { BUILDING_STATS, UNIT_STATS } from "../core/config";

export interface ProductionItem {
  what: ProducibleType;
  category: "unit" | "building";
  total: number; // seconds
  remaining: number; // seconds
  ready: boolean; // building finished, awaiting placement
}

/**
 * Per-faction bookkeeping: credits, power balance, and the (single-slot)
 * unit and building production queues.
 */
export class FactionState {
  readonly faction: Faction;
  credits: number;

  powerProduced = 0;
  powerConsumed = 0;

  unitQueue: ProductionItem | null = null;
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

  /** Try to queue a unit. Returns false if busy or unaffordable. */
  queueUnit(type: UnitType): boolean {
    if (this.unitQueue) return false;
    const cost = UNIT_STATS[type].cost;
    if (!this.canAfford(cost)) return false;
    this.credits -= cost;
    this.unitQueue = {
      what: type,
      category: "unit",
      total: UNIT_STATS[type].buildTime,
      remaining: UNIT_STATS[type].buildTime,
      ready: false,
    };
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

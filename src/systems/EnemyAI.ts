import type { Game } from "../core/Game";
import type { Unit } from "../entities/Unit";
import { armyBuilding, ARMIES } from "../core/factions";
import type { UnitRole } from "../core/types";

/**
 * A deliberately simple opponent: it keeps its harvester working, trains a
 * mix of infantry and vehicles from its own army's roster, fortifies its base,
 * fires its superweapon when charged, and sends escalating waves at the player.
 */
export class EnemyAI {
  private decisionTimer = 0;
  private waveTimer = 0;

  constructor(
    private readonly game: Game,
    private waveThreshold: number,
    private readonly waveInterval: number
  ) {}

  /** Pick an enemy unit id of a role, or null if the army lacks it. */
  private unitOf(role: UnitRole): string | null {
    const u = ARMIES[this.game.enemyArmy].units.find((x) => x.role === role);
    return u ? u.id : null;
  }

  update(dt: number): void {
    this.decisionTimer -= dt;
    this.waveTimer -= dt;

    this.maybeFireSuperweapon();

    if (this.decisionTimer > 0) return;
    this.decisionTimer = 1.5;

    const g = this.game;
    const fs = g.enemy;
    const hasVehicle = g.hasBuildingRole("enemy", "vehicle");
    const hasInfantry = g.hasBuildingRole("enemy", "infantry");

    // Keep production busy; exploit parallel production (one per producer).
    const producers =
      g.countBuildingsByRole("enemy", "infantry") + g.countBuildingsByRole("enemy", "vehicle");
    if (fs.unitQueue.length < Math.max(1, producers)) {
      const roll = Math.random();
      let pick: string | null = null;
      if (hasVehicle && fs.credits > 1400 && roll < 0.25) pick = this.unitOf("tank");
      else if (hasVehicle && fs.credits > 1600 && roll < 0.4) pick = this.unitOf("artillery");
      else if (hasVehicle && fs.credits > 1500 && roll < 0.5) pick = this.unitOf("special");
      else if (hasInfantry && roll < 0.75) pick = this.unitOf(roll < 0.5 ? "infantry" : "anti_armor");
      else if (hasInfantry) pick = this.unitOf("infantry");
      if (pick) fs.queueUnit(pick);
    }

    // Ensure a harvester is gathering.
    const harvesters = g.units.filter((u) => u.faction === "enemy" && u.isHarvester);
    if (harvesters.length === 0 && hasVehicle && fs.credits > 1100) {
      const h = this.unitOf("harvester");
      if (h) fs.queueUnit(h);
    }

    // Build a superweapon once well-established, else occasionally a turret.
    if (!fs.buildingQueue && hasVehicle) {
      if (!g.hasBuildingRole("enemy", "super") && fs.credits > 6000 && Math.random() < 0.3) {
        fs.queueBuilding(armyBuilding(g.enemyArmy, "super"));
      } else if (fs.credits > 2500 && Math.random() < 0.15) {
        fs.queueBuilding(armyBuilding(g.enemyArmy, "defense"));
      }
    }

    this.maybeLaunchWave();
  }

  private maybeFireSuperweapon(): void {
    if (!this.game.superReady.enemy) return;
    const target = this.game.findAttackTarget("player");
    if (target) this.game.fireSuperweapon("enemy", { x: target.pos.x, y: target.pos.y });
  }

  private maybeLaunchWave(): void {
    if (this.waveTimer > 0) return;

    const army = this.game.units.filter(
      (u) => u.faction === "enemy" && !u.isHarvester && !u.attackTarget && !u.isMoving
    );
    if (army.length < this.waveThreshold) return;

    const target = this.game.findAttackTarget("player");
    if (!target) return;

    for (const u of army as Unit[]) {
      u.orderAttack(this.game.ctx, target);
    }
    this.waveTimer = this.waveInterval;
    this.waveThreshold = Math.min(12, this.waveThreshold + 1); // escalate
  }
}

import type { Game } from "../core/Game";
import type { Unit } from "../entities/Unit";

/**
 * A deliberately simple opponent: it keeps its harvester working, trains a
 * mix of infantry and vehicles, occasionally reinforces its base with a
 * guard tower, and once it has gathered a small army it sends everything at
 * the player's base. Re-attacks in escalating waves.
 */
export class EnemyAI {
  private decisionTimer = 0;
  private waveTimer = 0;

  constructor(
    private readonly game: Game,
    private waveThreshold: number,
    private readonly waveInterval: number
  ) {}

  update(dt: number): void {
    this.decisionTimer -= dt;
    this.waveTimer -= dt;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = 1.5;

    const fs = this.game.enemy;

    // Keep the production lines busy — the AI exploits parallel production too:
    // it may keep one unit queued per producing building it owns.
    const producerCount =
      this.game.countBuildings("enemy", "barracks") +
      this.game.countBuildings("enemy", "war_factory");
    if (fs.unitQueue.length < Math.max(1, producerCount)) {
      const hasFactory = this.game.hasBuilding("enemy", "war_factory");
      const hasBarracks = this.game.hasBuilding("enemy", "barracks");
      const roll = Math.random();
      if (hasFactory && fs.credits > 1400 && roll < 0.3) {
        fs.queueUnit("tank");
      } else if (hasFactory && fs.credits > 1600 && roll < 0.45) {
        fs.queueUnit("artillery");
      } else if (hasBarracks && roll < 0.7) {
        fs.queueUnit(roll < 0.5 ? "soldier" : "rocket_soldier");
      } else if (hasBarracks) {
        fs.queueUnit("soldier");
      }
    }

    // Make sure at least one harvester is gathering.
    const harvesters = this.game.units.filter(
      (u) => u.faction === "enemy" && u.isHarvester
    );
    if (
      harvesters.length === 0 &&
      this.game.hasBuilding("enemy", "war_factory") &&
      fs.credits > 1100
    ) {
      fs.queueUnit("harvester");
    }

    // Occasionally fortify the base with a guard tower.
    if (
      !fs.buildingQueue &&
      fs.credits > 2500 &&
      this.game.hasBuilding("enemy", "barracks") &&
      Math.random() < 0.15
    ) {
      fs.queueBuilding("guard_tower");
    }

    this.maybeLaunchWave();
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

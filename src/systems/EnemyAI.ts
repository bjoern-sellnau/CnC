import type { Game } from "../core/Game";
import type { Unit } from "../entities/Unit";

/**
 * A deliberately simple opponent: it keeps its harvester working, trains a
 * mix of soldiers and tanks, and once it has gathered a small army it sends
 * everything at the player's base. Re-attacks in waves.
 */
export class EnemyAI {
  private decisionTimer = 0;
  private waveTimer = 0;
  private waveThreshold = 4;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    this.decisionTimer -= dt;
    this.waveTimer -= dt;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = 1.5;

    const fs = this.game.enemy;

    // Keep the production lines busy.
    if (!fs.unitQueue) {
      const hasFactory = this.game.hasBuilding("enemy", "war_factory");
      const hasBarracks = this.game.hasBuilding("enemy", "barracks");
      // Favour cheap soldiers, occasionally a tank if affordable.
      if (hasFactory && fs.credits > 1200 && Math.random() < 0.5) {
        fs.queueUnit("tank");
      } else if (hasBarracks) {
        fs.queueUnit("soldier");
      }
    }

    // Make sure at least one harvester is gathering.
    const harvesters = this.game.units.filter(
      (u) => u.faction === "enemy" && u.isHarvester
    );
    if (harvesters.length === 0 && this.game.hasBuilding("enemy", "war_factory") && fs.credits > 1100) {
      if (!fs.unitQueue) fs.queueUnit("harvester");
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
    this.waveTimer = 25; // cooldown between waves
    this.waveThreshold = Math.min(10, this.waveThreshold + 1); // escalate
  }
}

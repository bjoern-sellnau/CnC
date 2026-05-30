/* Headless simulation smoke test — runs the Game without any DOM/rendering. */
import { Game } from "../src/core/Game";

const game = new Game();
game.camera.setViewport(1280, 720);
game.rebuildButtons();

const startUnits = game.units.length;
const startBuildings = game.buildings.length;
console.log(`init: units=${startUnits} buildings=${startBuildings} credits=${game.player.credits}`);

// Queue a power plant for the player, then a barracks once requirements allow.
console.log("queue power_plant:", game.player.queueBuilding("power_plant"));

let placedBuilding = false;
let producedSoldier = false;
const dt = 1 / 60;
let combatHappened = false;

for (let frame = 0; frame < 60 * 120; frame++) {
  game.update(dt);

  // Place the player's power plant as soon as it is ready.
  const bq = game.player.buildingQueue;
  if (bq && bq.ready && !placedBuilding) {
    // Find a valid spot near the construction yard.
    const yard = game.buildings.find((b) => b.faction === "player" && b.type === "construction_yard")!;
    game.placement = { type: "power_plant", tx: yard.tileX, ty: yard.tileY + 4, valid: false };
    game.updatePlacementHover(game.map.tileToWorldCenter(yard.tileX + 1, yard.tileY + 5));
    if (game.confirmPlacement()) {
      placedBuilding = true;
      console.log(`frame ${frame}: placed power plant, power=${game.player.power}`);
    }
  }

  // Once we have a barracks-capable economy, try queuing a soldier.
  if (placedBuilding && game.hasBuilding("player", "barracks") && !game.player.unitQueue && !producedSoldier) {
    if (game.player.queueUnit("soldier")) {
      console.log(`frame ${frame}: queued soldier`);
    }
  }

  if (game.units.some((u) => u.faction === "player" && u.type === "soldier" && u.id > startUnits)) {
    producedSoldier = true;
  }

  if (game.projectiles.length > 0) combatHappened = true;

  if (game.gameOver) {
    console.log(`frame ${frame}: GAME OVER victory=${game.victory}`);
    break;
  }
}

const enemyUnits = game.units.filter((u) => u.faction === "enemy").length;
const playerCredits = Math.floor(game.player.credits);
console.log(`after sim: units=${game.units.length} (enemy ${enemyUnits}) buildings=${game.buildings.length}`);
console.log(`player credits=${playerCredits} power=${game.player.power}`);
console.log(`flags: placedBuilding=${placedBuilding} producedSoldier=${producedSoldier} combat=${combatHappened}`);

// Basic sanity assertions.
const ok =
  game.units.length > 0 &&
  game.buildings.length > 0 &&
  placedBuilding &&
  game.player.power > 0;
console.log(ok ? "SMOKE TEST: PASS" : "SMOKE TEST: FAIL");
process.exit(ok ? 0 : 1);

/* Headless simulation smoke test — runs the Game without any DOM/rendering. */
import { Game } from "../src/core/Game";
import { MISSIONS } from "../src/core/missions";
import { FOG_VISIBLE } from "../src/world/FogOfWar";

const dt = 1 / 60;
const checks: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

// ---------------------------------------------------------------------------
// 1. Economy + production loop (build placement via the real validation path).
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[0]);
  game.camera.setViewport(1280, 720);

  // Give the player a refinery via the real placement flow.
  const yard = game.buildings.find((b) => b.faction === "player" && b.type === "construction_yard")!;
  game.player.queueBuilding("refinery");
  game.player.buildingQueue!.remaining = 0; // finish instantly
  game.update(dt); // marks it ready
  game.placement = { type: "refinery", tx: yard.tileX, ty: yard.tileY + 4, valid: false };
  game.updatePlacementHover(game.map.tileToWorldCenter(yard.tileX + 1, yard.tileY + 5));
  const placed = game.confirmPlacement();
  check("refinery placement via validation", placed);

  const before = game.player.credits;
  for (const u of game.units) if (u.faction === "player" && u.isHarvester) u.orderHarvest(game.ctx);
  for (let i = 0; i < 60 * 90; i++) game.update(dt);
  check("harvester earns credits", game.player.credits > before);

  // Fog: the player's base must be currently visible.
  const t = game.map.worldToTile(yard.pos.x, yard.pos.y);
  check("fog reveals player base", game.fog.get(t.tx, t.ty) === FOG_VISIBLE);
  // Fog: far corner stays hidden at start of a fresh game.
  const fresh = new Game(MISSIONS[0]);
  check("fog hides distant tiles", fresh.fog.get(60, 60) !== FOG_VISIBLE);
}

// ---------------------------------------------------------------------------
// 2. Guard tower automatically fires at a nearby enemy.
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[0]);
  game.camera.setViewport(1280, 720);
  const tower = game.placeBuilding("player", "guard_tower", 20, 20);
  const enemy = game.spawnUnitAt("enemy", "soldier", {
    x: tower.pos.x + 40,
    y: tower.pos.y,
  });
  const hpBefore = enemy.hp;
  let fired = false;
  for (let i = 0; i < 60 * 3; i++) {
    game.update(dt);
    if (game.projectiles.length > 0) fired = true;
    if (enemy.dead) break;
  }
  check("guard tower fires at enemy", fired);
  check("guard tower damages enemy", enemy.hp < hpBefore || enemy.dead);
}

// ---------------------------------------------------------------------------
// 3. Artillery deals splash damage to a cluster of enemies.
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[0]);
  game.camera.setViewport(1280, 720);
  const art = game.spawnUnitAt("player", "artillery", game.map.tileToWorldCenter(20, 20));
  // Two enemies standing close together, within artillery range.
  const e1 = game.spawnUnitAt("enemy", "soldier", { x: art.pos.x + 120, y: art.pos.y });
  const e2 = game.spawnUnitAt("enemy", "soldier", { x: art.pos.x + 130, y: art.pos.y + 10 });
  art.orderAttack(game.ctx, e1);
  const hp2Before = e2.hp;
  let splash = false;
  for (let i = 0; i < 60 * 6; i++) {
    game.update(dt);
    if (game.projectiles.some((p) => p.splashRadius > 0)) splash = true;
    if (e1.dead && e2.dead) break;
  }
  check("artillery emits splash projectile", splash);
  check("splash damages the secondary target", e2.hp < hp2Before || e2.dead);
}

// ---------------------------------------------------------------------------
// 3b. A manual move order is obeyed by every unit type, incl. harvesters
//     (regression: harvesters used to instantly re-route to tiberium).
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[0]);
  game.camera.setViewport(1280, 720);
  // Move across empty, resource-free, unoccupied tiles inside the player base.
  const goal = game.map.tileToWorldCenter(10, 10);
  for (const type of ["soldier", "tank", "harvester", "aircraft"] as const) {
    const u = game.spawnUnitAt("player", type, game.map.tileToWorldCenter(5, 10));
    u.orderMove(game.ctx, goal);
    for (let i = 0; i < 60 * 10; i++) game.update(dt);
    const d = Math.hypot(goal.x - u.pos.x, goal.y - u.pos.y);
    check(`${type} obeys manual move order`, d < 40);
  }
}

// ---------------------------------------------------------------------------
// 4. Aircraft flies over impassable terrain (straight-line movement).
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[1]);
  game.camera.setViewport(1280, 720);
  const heli = game.spawnUnitAt("player", "aircraft", game.map.tileToWorldCenter(30, 30));
  const goal = game.map.tileToWorldCenter(40, 40);
  heli.orderMove(game.ctx, goal);
  const startDist = Math.hypot(goal.x - heli.pos.x, goal.y - heli.pos.y);
  for (let i = 0; i < 60 * 12; i++) game.update(dt);
  const endDist = Math.hypot(goal.x - heli.pos.x, goal.y - heli.pos.y);
  check("aircraft moves toward distant goal", endDist < startDist - 50);
}

// ---------------------------------------------------------------------------
// 5. Full mission runs for a while without throwing and the AI stays active.
// ---------------------------------------------------------------------------
{
  const game = new Game(MISSIONS[2]); // hardest mission, enemy has defences
  game.camera.setViewport(1280, 720);
  const enemyStart = game.units.filter((u) => u.faction === "enemy").length;
  let towers = 0;
  for (let i = 0; i < 60 * 120; i++) {
    game.update(dt);
    if (game.gameOver) break;
  }
  towers = game.buildings.filter((b) => b.faction === "enemy" && b.type === "guard_tower").length;
  check("enemy started with guard towers (mission 3)", towers >= 1);
  check("enemy AI produced units", game.units.filter((u) => u.faction === "enemy").length >= enemyStart);
  check("simulation ran without crashing", true);
}

// ---------------------------------------------------------------------------
// 6. Parallel production: more producing buildings => more units at once.
// ---------------------------------------------------------------------------
{
  // Two barracks build two soldiers simultaneously.
  const g = new Game(MISSIONS[0]);
  g.camera.setViewport(1280, 720);
  g.placeBuilding("player", "barracks", 20, 20);
  g.placeBuilding("player", "barracks", 24, 20);
  g.player.credits = 10000;
  g.player.queueUnit("soldier");
  g.player.queueUnit("soldier");
  g.update(dt);
  const bothProgressing =
    g.player.unitQueue.length === 2 && g.player.unitQueue.every((i) => i.remaining < i.total);
  check("two barracks build two soldiers in parallel", bothProgressing);

  // A single barracks builds them one at a time.
  const g2 = new Game(MISSIONS[0]);
  g2.camera.setViewport(1280, 720);
  g2.placeBuilding("player", "barracks", 20, 20);
  g2.player.credits = 10000;
  g2.player.queueUnit("soldier");
  g2.player.queueUnit("soldier");
  g2.update(dt);
  const first = g2.player.unitQueue[0].remaining < g2.player.unitQueue[0].total;
  const second = g2.player.unitQueue[1].remaining < g2.player.unitQueue[1].total;
  check("single barracks builds serially", first && !second);

  // Infantry and vehicles use independent production lines.
  const g3 = new Game(MISSIONS[0]);
  g3.camera.setViewport(1280, 720);
  g3.placeBuilding("player", "barracks", 20, 20);
  g3.placeBuilding("player", "war_factory", 24, 20);
  g3.player.credits = 10000;
  g3.player.queueUnit("soldier");
  g3.player.queueUnit("tank");
  g3.update(dt);
  check("infantry and vehicles build concurrently", g3.player.unitQueue.every((i) => i.remaining < i.total));
}

// ---------------------------------------------------------------------------
// 7. Particle system: hits and deaths emit particles; infantry bleed red.
// ---------------------------------------------------------------------------
{
  const RED = new Set(["#c01818", "#e23a2a", "#8a0f0f", "#5a0a0a"]);
  const game = new Game(MISSIONS[0]);
  game.camera.setViewport(1280, 720);
  const tower = game.placeBuilding("player", "guard_tower", 20, 20);
  const enemy = game.spawnUnitAt("enemy", "soldier", { x: tower.pos.x + 40, y: tower.pos.y });
  let sawParticles = false;
  let sawRed = false;
  for (let i = 0; i < 60 * 5; i++) {
    game.update(dt);
    if (game.particles.length > 0) sawParticles = true;
    if (game.particles.some((p) => RED.has(p.color))) sawRed = true;
    if (enemy.dead && sawRed) break;
  }
  check("hits/deaths emit particles", sawParticles);
  check("infantry produce red particles", sawRed);

  // Particles expire (no unbounded growth).
  for (let i = 0; i < 60 * 4; i++) game.update(dt);
  check("particles expire over time", game.particles.length < 400);
}

// ---------------------------------------------------------------------------
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
const allOk = checks.every((c) => c.ok);
console.log(allOk ? "\nSMOKE TEST: PASS" : "\nSMOKE TEST: FAIL");
process.exit(allOk ? 0 : 1);

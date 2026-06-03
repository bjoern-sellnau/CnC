/* Headless simulation smoke test — runs the Game without any DOM/rendering. */
import { Game } from "../src/core/Game";
import { MISSIONS } from "../src/core/missions";
import { FOG_VISIBLE } from "../src/world/FogOfWar";
import { ARMIES, ARMY_IDS, armyBuilding, armyUnit } from "../src/core/factions";
import { Debriefing } from "../src/ui/Debriefing";
import { Menu } from "../src/ui/Menu";
import { Intro } from "../src/ui/Intro";
import { TitleMenu } from "../src/ui/TitleMenu";
import { Options } from "../src/ui/Options";

const dt = 1 / 60;
const checks: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

/** Minimal 2D-context stub so UI screens can be rendered headlessly. */
function makeCtx(): any {
  const grad = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get: (_t, p) => {
        if (p === "measureText") return () => ({ width: 60 });
        if (p === "createLinearGradient" || p === "createRadialGradient") return () => grad;
        if (p === "createPattern") return () => ({});
        return () => {};
      },
      set: () => true,
    }
  );
}

// Convenience: ids for the default player army (alliance) and enemy (legion).
const pB = (role: Parameters<typeof armyBuilding>[1]) => armyBuilding("alliance", role);
const pU = (role: Parameters<typeof armyUnit>[1]) => armyUnit("alliance", role);

// ---------------------------------------------------------------------------
// 1. Economy + production loop (build placement via the real validation path).
// ---------------------------------------------------------------------------
{
  const game = new Game({ mission: MISSIONS[0] });
  game.camera.setViewport(1280, 720);
  const yard = game.buildings.find((b) => b.faction === "player" && b.stats.role === "hq")!;
  game.player.queueBuilding(pB("refinery"));
  game.player.buildingQueue!.remaining = 0;
  game.update(dt);
  game.placement = { type: pB("refinery"), tx: yard.tileX, ty: yard.tileY + 4, valid: false };
  game.updatePlacementHover(game.map.tileToWorldCenter(yard.tileX + 1, yard.tileY + 5));
  check("refinery placement via validation", game.confirmPlacement());

  const before = game.player.credits;
  for (const u of game.units) if (u.faction === "player" && u.isHarvester) u.orderHarvest(game.ctx);
  for (let i = 0; i < 60 * 90; i++) game.update(dt);
  check("harvester earns credits", game.player.credits > before);

  const t = game.map.worldToTile(yard.pos.x, yard.pos.y);
  check("fog reveals player base", game.fog.get(t.tx, t.ty) === FOG_VISIBLE);
  check("fog hides distant tiles", new Game().fog.get(60, 60) !== FOG_VISIBLE);
}

// ---------------------------------------------------------------------------
// 2. Defensive building auto-fires at a nearby enemy.
// ---------------------------------------------------------------------------
{
  const game = new Game();
  game.camera.setViewport(1280, 720);
  const tower = game.placeBuilding("player", pB("defense"), 20, 20);
  const enemy = game.spawnUnitAt("enemy", armyUnit("legion", "infantry"), { x: tower.pos.x + 40, y: tower.pos.y });
  const hp0 = enemy.hp;
  let fired = false;
  for (let i = 0; i < 60 * 3; i++) {
    game.update(dt);
    if (game.projectiles.length > 0) fired = true;
    if (enemy.dead) break;
  }
  check("defense building fires at enemy", fired);
  check("defense building damages enemy", enemy.hp < hp0 || enemy.dead);
}

// ---------------------------------------------------------------------------
// 3. Artillery splash damage.
// ---------------------------------------------------------------------------
{
  const game = new Game();
  game.camera.setViewport(1280, 720);
  const art = game.spawnUnitAt("player", pU("artillery"), game.map.tileToWorldCenter(20, 20));
  const e1 = game.spawnUnitAt("enemy", armyUnit("legion", "infantry"), { x: art.pos.x + 120, y: art.pos.y });
  const e2 = game.spawnUnitAt("enemy", armyUnit("legion", "infantry"), { x: art.pos.x + 130, y: art.pos.y + 10 });
  art.orderAttack(game.ctx, e1);
  const hp2 = e2.hp;
  let splash = false;
  for (let i = 0; i < 60 * 6; i++) {
    game.update(dt);
    if (game.projectiles.some((p) => p.splashRadius > 0)) splash = true;
    if (e1.dead && e2.dead) break;
  }
  check("artillery emits splash projectile", splash);
  check("splash damages the secondary target", e2.hp < hp2 || e2.dead);
}

// ---------------------------------------------------------------------------
// 3b. Manual move order is obeyed by every unit role (incl. harvester).
// ---------------------------------------------------------------------------
{
  const game = new Game();
  game.camera.setViewport(1280, 720);
  const goal = game.map.tileToWorldCenter(10, 10);
  for (const role of ["infantry", "tank", "harvester", "air"] as const) {
    const u = game.spawnUnitAt("player", pU(role), game.map.tileToWorldCenter(5, 10));
    u.orderMove(game.ctx, goal);
    for (let i = 0; i < 60 * 10; i++) game.update(dt);
    const d = Math.hypot(goal.x - u.pos.x, goal.y - u.pos.y);
    check(`${role} obeys manual move order`, d < 40);
  }
}

// ---------------------------------------------------------------------------
// 4. Aircraft flies over impassable terrain.
// ---------------------------------------------------------------------------
{
  const game = new Game({ mission: MISSIONS[1] });
  game.camera.setViewport(1280, 720);
  const heli = game.spawnUnitAt("player", pU("air"), game.map.tileToWorldCenter(30, 30));
  const goal = game.map.tileToWorldCenter(40, 40);
  heli.orderMove(game.ctx, goal);
  const d0 = Math.hypot(goal.x - heli.pos.x, goal.y - heli.pos.y);
  for (let i = 0; i < 60 * 12; i++) game.update(dt);
  check("aircraft moves toward distant goal", Math.hypot(goal.x - heli.pos.x, goal.y - heli.pos.y) < d0 - 50);
}

// ---------------------------------------------------------------------------
// 5. Three distinct factions with their own rosters & tech trees.
// ---------------------------------------------------------------------------
{
  check("three armies defined", ARMY_IDS.length === 3);
  let allDistinct = true;
  let allComplete = true;
  const ids = new Set<string>();
  for (const a of ARMY_IDS) {
    const army = ARMIES[a];
    if (army.units.length !== 7 || army.buildings.length !== 8) allComplete = false;
    for (const u of army.units) {
      if (ids.has(u.id)) allDistinct = false;
      ids.add(u.id);
    }
  }
  check("each army has a full roster (7 units, 8 buildings)", allComplete);
  check("unit ids are unique across armies", allDistinct);
  check("same role differs per army", armyUnit("alliance", "tank") !== armyUnit("legion", "tank"));
  // A game with chosen armies wires them through.
  const g = new Game({ playerArmy: "syndicate", enemyArmy: "legion" });
  check("game uses selected armies", g.playerArmy === "syndicate" && g.enemyArmy === "legion");
  check("player starts with own army's units", g.units.some((u) => u.faction === "player" && u.type.startsWith("syn_")));
}

// ---------------------------------------------------------------------------
// 6. Superweapons: charge, fire, area damage; EMP stuns.
// ---------------------------------------------------------------------------
{
  // Alliance orbital laser kills a clustered enemy.
  const g = new Game({ playerArmy: "alliance", enemyArmy: "legion" });
  g.camera.setViewport(1280, 720);
  g.placeBuilding("player", armyBuilding("alliance", "super"), 20, 20);
  g.update(dt); // initialise charge timer
  g.superTimer.player = 0;
  g.update(dt); // becomes ready
  check("superweapon charges to ready", g.superReady.player);
  const at = g.map.tileToWorldCenter(40, 40);
  const victim = g.spawnUnitAt("enemy", armyUnit("legion", "infantry"), at);
  const fired = g.fireSuperweapon("player", at);
  check("superweapon fires when ready", fired);
  check("superweapon damages target", victim.dead || victim.hp < victim.maxHp);
  check("superweapon recharges after firing", !g.superReady.player && g.superTimer.player > 0);

  // Syndicate EMP stuns without necessarily killing.
  const g2 = new Game({ playerArmy: "syndicate", enemyArmy: "alliance" });
  g2.camera.setViewport(1280, 720);
  g2.placeBuilding("player", armyBuilding("syndicate", "super"), 20, 20);
  g2.update(dt);
  g2.superTimer.player = 0;
  g2.update(dt);
  const at2 = g2.map.tileToWorldCenter(40, 40);
  const tank = g2.spawnUnitAt("enemy", armyUnit("alliance", "tank"), at2);
  g2.fireSuperweapon("player", at2);
  check("EMP stuns enemy units", tank.stunnedFor > 0);
}

// ---------------------------------------------------------------------------
// 7. Difficulty scales the enemy economy.
// ---------------------------------------------------------------------------
{
  const easy = new Game({ mission: MISSIONS[1], difficulty: "easy" });
  const hard = new Game({ mission: MISSIONS[1], difficulty: "hard" });
  check("harder difficulty richer enemy", hard.enemy.credits > easy.enemy.credits);
}

// ---------------------------------------------------------------------------
// 8. Parallel production scales with producing buildings.
// ---------------------------------------------------------------------------
{
  const g = new Game();
  g.camera.setViewport(1280, 720);
  g.placeBuilding("player", pB("infantry"), 20, 20);
  g.placeBuilding("player", pB("infantry"), 24, 20);
  g.player.credits = 10000;
  g.player.queueUnit(pU("infantry"));
  g.player.queueUnit(pU("infantry"));
  g.update(dt);
  check("two infantry buildings build in parallel", g.player.unitQueue.length === 2 && g.player.unitQueue.every((i) => i.remaining < i.total));

  const g2 = new Game();
  g2.placeBuilding("player", pB("infantry"), 20, 20);
  g2.player.credits = 10000;
  g2.player.queueUnit(pU("infantry"));
  g2.player.queueUnit(pU("infantry"));
  g2.update(dt);
  check("single building builds serially", g2.player.unitQueue[0].remaining < g2.player.unitQueue[0].total && g2.player.unitQueue[1].remaining === g2.player.unitQueue[1].total);

  const g3 = new Game();
  g3.placeBuilding("player", pB("infantry"), 20, 20);
  g3.placeBuilding("player", pB("vehicle"), 24, 20);
  g3.player.credits = 10000;
  g3.player.queueUnit(pU("infantry"));
  g3.player.queueUnit(pU("tank"));
  g3.update(dt);
  check("infantry and vehicles build concurrently", g3.player.unitQueue.every((i) => i.remaining < i.total));
}

// ---------------------------------------------------------------------------
// 9. Particles: hits/deaths emit; infantry bleed red; debug trace on/off.
// ---------------------------------------------------------------------------
{
  const RED = new Set(["#c01818", "#e23a2a", "#8a0f0f", "#5a0a0a"]);
  const game = new Game();
  game.camera.setViewport(1280, 720);
  const tower = game.placeBuilding("player", pB("defense"), 20, 20);
  const enemy = game.spawnUnitAt("enemy", armyUnit("legion", "infantry"), { x: tower.pos.x + 40, y: tower.pos.y });
  let particles = false;
  let red = false;
  for (let i = 0; i < 60 * 5; i++) {
    game.update(dt);
    if (game.particles.length > 0) particles = true;
    if (game.particles.some((p) => RED.has(p.color))) red = true;
    if (enemy.dead && red) break;
  }
  check("hits/deaths emit particles", particles);
  check("infantry produce red particles", red);

  const g = new Game();
  g.debug = true;
  const u = g.spawnUnitAt("player", pU("infantry"), g.map.tileToWorldCenter(20, 20));
  u.orderMove(g.ctx, g.map.tileToWorldCenter(30, 24));
  check("debug records A* search trace", u.debugVisited.length > 0);
  g.debug = false;
  u.orderMove(g.ctx, g.map.tileToWorldCenter(20, 20));
  check("no search trace when debug off", u.debugVisited.length === 0);
}

// ---------------------------------------------------------------------------
// 10. Full hard mission runs a while without crashing.
// ---------------------------------------------------------------------------
{
  const game = new Game({ mission: MISSIONS[2], difficulty: "hard", playerArmy: "legion", enemyArmy: "syndicate" });
  game.camera.setViewport(1280, 720);
  for (let i = 0; i < 60 * 120 && !game.gameOver; i++) game.update(dt);
  check("enemy AI produced units", game.units.some((u) => u.faction === "enemy"));
  check("simulation ran without crashing", true);
}

// ---------------------------------------------------------------------------
// 11. Debriefing screen renders without errors and its button hit-tests.
// ---------------------------------------------------------------------------
{
  const ctxStub = makeCtx();
  const game = new Game();
  game.stats.unitsBuilt = 12;
  game.stats.enemiesDestroyed = 9;
  game.stats.elapsed = 184;
  let threw = false;
  const debrief = new Debriefing();
  for (const win of [true, false]) {
    (game as any).gameOver = true;
    (game as any).victory = win;
    try {
      debrief.render(ctxStub, 1280, 720, game);
    } catch {
      threw = true;
    }
  }
  check("debriefing renders without throwing", !threw);
  // Button is centred near the bottom of the panel; verify a hit there.
  const py = (720 - 430) / 2;
  check("debriefing continue button hit-tests", debrief.click(640, py + 430 - 60 + 22));
  check("debriefing click misses elsewhere", !debrief.click(10, 10));
}

// ---------------------------------------------------------------------------
// 12. Base management: smarter harvesters, primary buildings, sell, power, cancel.
// ---------------------------------------------------------------------------
{
  // Harvesters spread out: claiming a tile yields a different nearest tile.
  const g = new Game();
  const c = g.map.tileToWorldCenter(32, 32);
  const t1 = g.map.findNearestResource(c);
  let spread = false;
  if (t1) {
    const claimed = new Set([t1.ty * g.map.width + t1.tx]);
    const t2 = g.map.findNearestResource(c, 40, claimed);
    spread = !!t2 && (t2.tx !== t1.tx || t2.ty !== t1.ty);
  }
  check("harvesters pick distinct tiles when claimed", spread);
}
{
  // A harvester returns to its assigned refinery, not the nearest one.
  const g = new Game();
  g.camera.setViewport(1280, 720);
  g.map.clearArea(20, 20, 22, 22);
  g.placeBuilding("player", pB("refinery"), 22, 22); // near
  const far = g.placeBuilding("player", pB("refinery"), 36, 36);
  const h = g.spawnUnitAt("player", pU("harvester"), g.map.tileToWorldCenter(24, 24));
  h.cargo = 700;
  h.assignedRefinery = far;
  h.orderHarvest(g.ctx);
  const d0 = Math.hypot(far.pos.x - h.pos.x, far.pos.y - h.pos.y);
  for (let i = 0; i < 60 * 30; i++) g.update(dt);
  check("harvester returns to assigned refinery", Math.hypot(far.pos.x - h.pos.x, far.pos.y - h.pos.y) < d0 - 60);
}
{
  // Primary production building: produced units spawn there.
  const g = new Game();
  g.camera.setViewport(1280, 720);
  g.map.clearArea(18, 18, 20, 20);
  const b1 = g.placeBuilding("player", pB("infantry"), 20, 20);
  const b2 = g.placeBuilding("player", pB("infantry"), 34, 34);
  g.setPrimary(b2);
  check("primary building is recorded", g.getPrimary("infantry") === b2);
  g.player.credits = 10000;
  const known = new Set(g.units.map((u) => u.id));
  g.player.queueUnit(pU("infantry"));
  for (let i = 0; i < 60 * 8; i++) g.update(dt);
  const fresh = g.units.find((u) => u.faction === "player" && !u.isHarvester && !known.has(u.id));
  const ok = !!fresh && Math.hypot(fresh.pos.x - b2.pos.x, fresh.pos.y - b2.pos.y) < Math.hypot(fresh.pos.x - b1.pos.x, fresh.pos.y - b1.pos.y);
  check("units spawn at the primary building", ok);
}
{
  // Powering a building off frees its consumption and halts its production.
  const g = new Game();
  g.update(dt);
  const p0 = g.player.power;
  const veh = g.placeBuilding("player", pB("vehicle"), 20, 20);
  g.update(dt);
  const p1 = g.player.power;
  veh.poweredOff = true;
  g.update(dt);
  check("consumer reduces power", p1 < p0);
  check("powering off restores power", g.player.power === p0);

  const g2 = new Game();
  const inf = g2.placeBuilding("player", pB("infantry"), 20, 20);
  g2.player.credits = 10000;
  g2.player.queueUnit(pU("infantry"));
  inf.poweredOff = true;
  g2.update(dt);
  check("powered-off building does not produce", g2.player.unitQueue[0].remaining === g2.player.unitQueue[0].total);
}
{
  // Selling a building refunds half its cost and is not counted as a loss.
  const g = new Game();
  g.update(dt);
  const before = g.player.credits;
  const b = g.placeBuilding("player", pB("power"), 20, 20);
  const sold = g.sellBuilding(b);
  g.update(dt);
  check("selling refunds half the cost", sold && Math.abs(g.player.credits - (before + 150)) < 1);
  check("sold building is removed", !g.buildings.includes(b));
  check("selling is not a building loss", g.stats.buildingsLost === 0);
}
{
  // Cancelling production refunds the queued item.
  const g = new Game();
  g.placeBuilding("player", pB("infantry"), 20, 20);
  g.player.credits = 1000;
  g.player.queueUnit(pU("infantry"));
  check("queuing deducts cost", g.player.credits === 900);
  g.cancelProduction(pU("infantry"));
  check("cancelling refunds and clears", g.player.credits === 1000 && g.player.unitQueue.length === 0);
}

// ---------------------------------------------------------------------------
// 13. Front-end screens (intro/menu/options) render headlessly & hit-test.
// ---------------------------------------------------------------------------
{
  const c = makeCtx();
  const { settings } = await import("../src/core/settings");
  let threw = false;
  try {
    const intro = new Intro();
    intro.render(c, 1280, 720); // boot-button phase
    check("intro boot button hit-tests", intro.click(640, 720 * 0.72 + 20) === "boot");
    intro.begin();
    for (let i = 0; i < 60 * 5; i++) {
      intro.update(dt);
      intro.render(c, 1280, 720);
    }
    check("intro completes to the menu", intro.phase === "done");

    const title = new TitleMenu();
    title.update(dt);
    title.render(c, 1280, 720);
    title.move(1);
    check("title menu Enter activates an item", title.activate() !== undefined);

    const menu = new Menu();
    menu.render(c, 1280, 720);
    check("menu enemy army differs from player", menu.enemyArmy !== menu.army);
    check("menu options button hit-tests", menu.click(1180, 33) === "options");

    const opt = new Options();
    opt.render(c, 1280, 720);
    const crt0 = settings.crt;
    opt.click(820, 277); // CRT toggle
    check("options toggles the CRT setting", settings.crt !== crt0);
    check("options back button closes", opt.click(640, (720 - 360) / 2 + 360 - 54 + 18) === "back");
  } catch (e) {
    threw = true;
    console.log("render error:", (e as Error).message);
  }
  check("front-end screens render without throwing", !threw);
}

// ---------------------------------------------------------------------------
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
const allOk = checks.every((c) => c.ok);
console.log(allOk ? "\nSMOKE TEST: PASS" : "\nSMOKE TEST: FAIL");
process.exit(allOk ? 0 : 1);

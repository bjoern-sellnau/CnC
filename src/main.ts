import "./style.css";
import { Game } from "./core/Game";
import { InputController } from "./core/Input";
import { Renderer } from "./render/Renderer";
import { Menu } from "./ui/Menu";
import { Debriefing } from "./ui/Debriefing";
import { sound } from "./systems/Sound";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

type AppState = "menu" | "playing";
let state: AppState = "menu";

const menu = new Menu();
const debrief = new Debriefing();
let debriefShown = false;
let game: Game | null = null;
let renderer: Renderer | null = null;
let input: InputController | null = null;

let viewW = window.innerWidth;
let viewH = window.innerHeight;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game) {
    game.camera.setViewport(viewW, viewH);
    game.rebuildButtons();
  }
}

window.addEventListener("resize", resize);
resize();

function startMission(): void {
  game = new Game({
    mission: menu.mission,
    playerArmy: menu.army,
    enemyArmy: menu.enemyArmy,
    difficulty: menu.difficulty,
  });
  game.camera.setViewport(viewW, viewH);
  game.rebuildButtons();
  renderer = new Renderer(ctx, game);
  if (input) {
    input.setGame(game);
    input.enabled = true;
  } else {
    input = new InputController(canvas, game);
  }
  if (menu.musicOn) sound.startMusic();
  debriefShown = false;
  state = "playing";
}

function returnToMenu(): void {
  state = "menu";
  if (input) input.enabled = false;
  sound.stopMusic();
  game = null;
  renderer = null;
}

// Menu interaction (separate from the in-game InputController).
canvas.addEventListener("mousedown", (e) => {
  sound.unlock();
  if (state === "menu") {
    const result = menu.click(e.offsetX, e.offsetY);
    if (result === "sound") {
      menu.soundOn = sound.toggle();
    } else if (result === "music") {
      menu.musicOn = sound.toggleMusic();
    } else if (result === "start") {
      startMission();
    }
  } else if (game && game.gameOver) {
    // On the debriefing screen, the button returns to the mission menu.
    if (debrief.click(e.offsetX, e.offsetY)) returnToMenu();
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (state === "menu") menu.setHover(e.offsetX, e.offsetY);
  else if (game && game.gameOver) debrief.setHover(e.offsetX, e.offsetY);
});

let last = performance.now();
let buttonRefresh = 0;

function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;

  if (state === "menu") {
    menu.render(ctx, viewW, viewH);
  } else if (game && renderer && input) {
    input.update(dt);
    game.update(dt);

    buttonRefresh -= dt;
    if (buttonRefresh <= 0) {
      game.rebuildButtons();
      buttonRefresh = 0.25;
    }

    renderer.render();

    if (game.gameOver) {
      if (!debriefShown) {
        debriefShown = true;
        sound.stopMusic();
        sound.play(game.victory ? "ready" : "boom");
      }
      debrief.render(ctx, viewW, viewH, game);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

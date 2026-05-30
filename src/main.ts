import "./style.css";
import { Game } from "./core/Game";
import { InputController } from "./core/Input";
import { Renderer } from "./render/Renderer";
import { Menu } from "./ui/Menu";
import { sound } from "./systems/Sound";
import type { MissionConfig } from "./core/missions";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

type AppState = "menu" | "playing";
let state: AppState = "menu";

const menu = new Menu();
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

function startMission(mission: MissionConfig): void {
  game = new Game(mission);
  game.camera.setViewport(viewW, viewH);
  game.rebuildButtons();
  renderer = new Renderer(ctx, game);
  if (input) {
    input.setGame(game);
    input.enabled = true;
  } else {
    input = new InputController(canvas, game);
  }
  state = "playing";
}

function returnToMenu(): void {
  state = "menu";
  if (input) input.enabled = false;
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
    } else if (result) {
      startMission(result);
    }
  } else if (game && game.gameOver) {
    // Click on the end screen returns to the mission menu.
    returnToMenu();
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (state === "menu") menu.hover(e.offsetX, e.offsetY);
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
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

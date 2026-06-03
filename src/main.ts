import "./style.css";
import { Game } from "./core/Game";
import { InputController } from "./core/Input";
import { Renderer } from "./render/Renderer";
import { Menu } from "./ui/Menu";
import { Options } from "./ui/Options";
import { Intro } from "./ui/Intro";
import { Debriefing } from "./ui/Debriefing";
import { sound } from "./systems/Sound";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

type AppState = "intro" | "menu" | "playing";
let state: AppState = "intro";
let optionsOpen = false;

const intro = new Intro();
const menu = new Menu();
const options = new Options();
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
  game = null;
  renderer = null;
}

canvas.addEventListener("mousedown", (e) => {
  const mx = e.offsetX;
  const my = e.offsetY;

  if (state === "intro") {
    if (intro.click(mx, my) === "boot") {
      // The boot button is the user gesture that unlocks audio.
      sound.unlock();
      if (menu.musicOn) sound.startMusic();
      sound.play("ready");
      intro.begin();
    }
    return;
  }

  if (state === "menu") {
    sound.unlock();
    if (optionsOpen) {
      if (options.click(mx, my) === "back") optionsOpen = false;
      return;
    }
    const result = menu.click(mx, my);
    if (result === "sound") menu.soundOn = sound.toggle();
    else if (result === "music") menu.musicOn = sound.toggleMusic();
    else if (result === "options") optionsOpen = true;
    else if (result === "start") startMission();
    return;
  }

  if (game && game.gameOver) {
    if (debrief.click(mx, my)) returnToMenu();
  }
});

canvas.addEventListener("mousemove", (e) => {
  const mx = e.offsetX;
  const my = e.offsetY;
  if (state === "intro") intro.setHover(mx, my);
  else if (state === "menu") (optionsOpen ? options : menu).setHover(mx, my);
  else if (game && game.gameOver) debrief.setHover(mx, my);
});

window.addEventListener("keydown", () => {
  // Any key skips the intro sequence (but not the boot button).
  if (state === "intro" && intro.phase !== "button") intro.skip();
});

let last = performance.now();
let buttonRefresh = 0;

function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;

  if (state === "intro") {
    intro.update(dt);
    intro.render(ctx, viewW, viewH);
    if (intro.phase === "done") state = "menu";
  } else if (state === "menu") {
    menu.render(ctx, viewW, viewH);
    if (optionsOpen) options.render(ctx, viewW, viewH);
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

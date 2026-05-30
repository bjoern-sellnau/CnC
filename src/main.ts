import "./style.css";
import { Game } from "./core/Game";
import { InputController } from "./core/Input";
import { Renderer } from "./render/Renderer";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const game = new Game();
const renderer = new Renderer(ctx, game);
const input = new InputController(canvas, game);

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.camera.setViewport(w, h);
  game.rebuildButtons();
}

window.addEventListener("resize", resize);
resize();

let last = performance.now();
let buttonRefresh = 0;

function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  // Guard against huge dt after tab switches.
  if (dt > 0.1) dt = 0.1;

  input.update(dt);
  game.update(dt);

  // Sidebar options depend on which buildings exist; refresh a few times/sec.
  buttonRefresh -= dt;
  if (buttonRefresh <= 0) {
    game.rebuildButtons();
    buttonRefresh = 0.25;
  }

  renderer.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

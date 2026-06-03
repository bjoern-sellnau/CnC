import { THEME, drawCRT } from "./theme";
import { settings } from "../core/settings";
import { VERSION_LABEL } from "../version";

const BOOT_LINES = [
  "> initializing battle network",
  "> calibrating crystal sensors",
  "> loading sector KARELIAN BASIN",
  "> establishing command uplink",
  "> deploying construction yard",
  "> ALL SYSTEMS NOMINAL.",
];

type Phase = "button" | "running" | "welcome" | "done";

/**
 * EVE boot intro: a [BOOT UP EVE] button (the audio-unlock gesture), then a
 * Command & Conquer-style terminal boot sequence that ends on
 * "WELCOME, COMMANDER" before the main menu appears.
 */
export class Intro {
  phase: Phase = "button";
  private t = 0;
  private scroll = 0;
  private bootBtn = { x: 0, y: 0, w: 0, h: 0 };
  private hover = { x: -1, y: -1 };

  private readonly lineInterval = 0.32;
  private readonly welcomeAt = BOOT_LINES.length * 0.32 + 0.6;
  private readonly doneAt = BOOT_LINES.length * 0.32 + 2.4;

  begin(): void {
    this.phase = "running";
    this.t = 0;
  }

  /** Skip the running sequence to the welcome/done. */
  skip(): void {
    if (this.phase === "running") {
      this.t = this.welcomeAt;
      this.phase = "welcome";
    } else if (this.phase === "welcome") {
      this.phase = "done";
    }
  }

  update(dt: number): void {
    this.scroll = (this.scroll + dt * 26) % 64;
    if (this.phase !== "running" && this.phase !== "welcome") return;
    this.t += dt;
    if (this.t >= this.doneAt) this.phase = "done";
    else if (this.t >= this.welcomeAt) this.phase = "welcome";
  }

  setHover(x: number, y: number): void {
    this.hover = { x, y };
  }

  /** Returns "boot" when the boot button is pressed; otherwise null. */
  click(x: number, y: number): "boot" | null {
    if (this.phase === "button") {
      const b = this.bootBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return "boot";
      return null;
    }
    this.skip();
    return null;
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.fillStyle = "#02060a";
    ctx.fillRect(0, 0, vw, vh);
    this.drawFloor(ctx, vw, vh);

    // Header.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText("EVE TACTICAL OS · v3.7.2", 28, 28);
    ctx.textAlign = "right";
    ctx.fillStyle = THEME.phos;
    ctx.fillText("● BATTLE NETWORK ONLINE", vw - 28, 28);

    if (this.phase === "running") {
      this.drawSequence(ctx, vw, vh);
    } else {
      this.drawWordmark(ctx, vw, vh);
      if (this.phase === "button") this.drawBootButton(ctx, vw, vh);
      else this.drawWelcome(ctx, vw, vh);
    }

    if (settings.crt) drawCRT(ctx, vw, vh);
  }

  // ---- pieces -------------------------------------------------------------

  private drawFloor(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.save();
    const horizon = vh * 0.55;
    ctx.strokeStyle = "rgba(70,255,106,0.13)";
    ctx.lineWidth = 1;
    // Receding horizontal lines.
    for (let i = 0; i < 18; i++) {
      const p = (i * 64 + this.scroll) / (18 * 64);
      const y = horizon + p * p * (vh - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y);
      ctx.stroke();
    }
    // Converging verticals.
    const cx = vw / 2;
    for (let i = -16; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 26, horizon);
      ctx.lineTo(cx + i * 180, vh);
      ctx.stroke();
    }
    // glow at horizon
    const g = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 60);
    g.addColorStop(0, "rgba(70,255,106,0)");
    g.addColorStop(0.5, "rgba(70,255,106,0.08)");
    g.addColorStop(1, "rgba(70,255,106,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 60, vw, 120);
    ctx.restore();
  }

  private drawWordmark(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "700 15px 'Oxanium', monospace";
    ctx.fillText("A   C R Y S T A L   W A R S   S I M U L A T I O N", vw / 2, vh * 0.26);

    const y = vh * 0.4;
    ctx.font = "800 84px 'Oxanium', monospace";
    ctx.fillStyle = "#dffce7";
    ctx.shadowColor = "rgba(70,255,106,0.4)";
    ctx.shadowBlur = 8;
    ctx.fillText("COMMAND", vw / 2, y);
    // "& CONQUEST" with green ampersand.
    const conquest = " CONQUEST";
    ctx.font = "800 84px 'Oxanium', monospace";
    const ampW = ctx.measureText("&").width;
    const cqW = ctx.measureText(conquest).width;
    const startX = vw / 2 - (ampW + cqW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.phos;
    ctx.shadowColor = THEME.phos;
    ctx.shadowBlur = 24;
    ctx.fillText("&", startX, y + 92);
    ctx.fillStyle = "#dffce7";
    ctx.shadowColor = "rgba(70,255,106,0.4)";
    ctx.shadowBlur = 8;
    ctx.fillText(conquest, startX + ampW, y + 92);
    ctx.shadowBlur = 0;

    ctx.textAlign = "center";
    ctx.fillStyle = THEME.ink;
    ctx.font = "16px 'Share Tech Mono', monospace";
    ctx.fillText("HARVEST · BUILD · DOMINATE", vw / 2, y + 132);
  }

  private drawBootButton(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    const w = 300;
    const h = 56;
    const x = vw / 2 - w / 2;
    const y = vh * 0.72;
    this.bootBtn = { x, y, w, h };
    const hot = this.hover.x >= x && this.hover.x <= x + w && this.hover.y >= y && this.hover.y <= y + h;
    ctx.fillStyle = hot ? "rgba(70,255,106,0.16)" : "rgba(14,58,28,0.5)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.phos;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // corner brackets
    ctx.lineWidth = 2;
    const c = 12;
    for (const [bx, by, sx, sy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(bx, by + sy * c);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + sx * c, by);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.phos;
    ctx.shadowColor = THEME.phos;
    ctx.shadowBlur = hot ? 16 : 8;
    ctx.font = "800 22px 'Oxanium', monospace";
    ctx.fillText("BOOT UP EVE ▸", vw / 2, y + 36);
    ctx.shadowBlur = 0;
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText("aktiviert Sound & Musik", vw / 2, y + h + 22);
  }

  private drawSequence(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.textAlign = "left";
    ctx.font = "17px 'Share Tech Mono', monospace";
    const x = vw * 0.5 - 320;
    let y = vh * 0.32;
    ctx.fillStyle = THEME.ink;
    ctx.font = "800 26px 'Oxanium', monospace";
    ctx.fillText("EVE TACTICAL OS", x, y);
    y += 40;
    ctx.font = "17px 'Share Tech Mono', monospace";
    const visible = Math.min(BOOT_LINES.length, Math.floor(this.t / this.lineInterval) + 1);
    for (let i = 0; i < visible; i++) {
      const line = BOOT_LINES[i];
      ctx.fillStyle = i === BOOT_LINES.length - 1 ? THEME.phos : THEME.ink;
      ctx.fillText(line, x, y);
      if (i < BOOT_LINES.length - 1) {
        ctx.fillStyle = THEME.inkDim;
        ctx.fillText("...... ", x + 320, y);
        ctx.fillStyle = THEME.phos;
        ctx.fillText("[OK]", x + 384, y);
      }
      y += 32;
    }
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "13px 'Share Tech Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("CLICK / ANY KEY TO SKIP ▸", vw - 40, vh - 40);
  }

  private drawWelcome(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.phos;
    ctx.shadowColor = THEME.phos;
    ctx.shadowBlur = 24;
    ctx.font = "800 40px 'Oxanium', monospace";
    ctx.fillText("WELCOME, COMMANDER", vw / 2, vh * 0.72);
    ctx.shadowBlur = 0;
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText(VERSION_LABEL, vw / 2, vh - 24);
  }
}

import { settings } from "../core/settings";
import { THEME, drawCRT } from "./theme";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Options overlay: CRT effect and world view mode. */
export class Options {
  private hover = { x: -1, y: -1 };
  private crtRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private topRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private isoRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private backRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.fillStyle = "rgba(2,6,4,0.86)";
    ctx.fillRect(0, 0, vw, vh);

    const w = Math.min(520, vw - 60);
    const h = 360;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    ctx.fillStyle = "#0a140d";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.phos;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = THEME.phos;
    ctx.font = "800 24px 'Oxanium', monospace";
    ctx.fillText("OPTIONEN", vw / 2, y + 44);

    // CRT toggle.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.ink;
    ctx.font = "14px 'Share Tech Mono', monospace";
    ctx.fillText("CRT-Effekt (Scanlines)", x + 30, y + 100);
    this.crtRect = { x: x + w - 130, y: y + 84, w: 100, h: 26 };
    this.toggle(ctx, this.crtRect, settings.crt ? "AN" : "AUS", settings.crt);

    // View mode.
    ctx.fillStyle = THEME.ink;
    ctx.font = "14px 'Share Tech Mono', monospace";
    ctx.fillText("Ansicht", x + 30, y + 156);
    this.topRect = { x: x + 30, y: y + 170, w: 130, h: 30 };
    this.isoRect = { x: x + 172, y: y + 170, w: 180, h: 30 };
    this.toggle(ctx, this.topRect, "TOP-DOWN", settings.view === "topdown");
    this.toggle(ctx, this.isoRect, "ISOMETRISCH (bald)", settings.view === "iso");

    ctx.fillStyle = THEME.inkDim;
    ctx.font = "11px 'Share Tech Mono', monospace";
    this.wrap(
      ctx,
      "Die isometrische Ansicht ist in Arbeit — Top-Down bleibt vorerst aktiv.",
      x + 30,
      y + 222,
      w - 60,
      15
    );

    // Back.
    this.backRect = { x: vw / 2 - 90, y: y + h - 54, w: 180, h: 36 };
    const b = this.backRect;
    ctx.fillStyle = this.isHover(b) ? "rgba(70,255,106,0.16)" : "rgba(14,58,28,0.5)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = THEME.phos;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.phos;
    ctx.font = "700 16px 'Oxanium', monospace";
    ctx.fillText("◂ ZURÜCK", vw / 2, b.y + 24);

    if (settings.crt) drawCRT(ctx, vw, vh);
  }

  /** Returns "back" to close, or null. Applies toggles immediately. */
  click(mx: number, my: number): "back" | null {
    if (this.inside(this.crtRect, mx, my)) {
      settings.crt = !settings.crt;
      return null;
    }
    if (this.inside(this.topRect, mx, my)) {
      settings.view = "topdown";
      return null;
    }
    if (this.inside(this.isoRect, mx, my)) {
      // Isometric mode is not wired up yet; keep top-down.
      return null;
    }
    if (this.inside(this.backRect, mx, my)) return "back";
    return null;
  }

  setHover(mx: number, my: number): void {
    this.hover = { x: mx, y: my };
  }

  private toggle(ctx: CanvasRenderingContext2D, r: Rect, label: string, on: boolean): void {
    ctx.fillStyle = on ? "rgba(70,255,106,0.16)" : "rgba(10,20,13,0.9)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? THEME.phos : this.isHover(r) ? THEME.edgeHot : THEME.edge;
    ctx.lineWidth = on ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = "center";
    ctx.fillStyle = on ? THEME.phos : THEME.inkDim;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 4);
  }

  private isHover(r: Rect): boolean {
    return this.inside(r, this.hover.x, this.hover.y);
  }

  private inside(r: Rect, mx: number, my: number): boolean {
    return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): void {
    const words = text.split(" ");
    let line = "";
    let cy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w;
        cy += lh;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, cy);
  }
}

import { MISSIONS, type MissionConfig } from "../core/missions";

interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  mission: MissionConfig;
}

/** The start screen: title and a list of selectable missions. */
export class Menu {
  private cards: CardRect[] = [];
  hovered: MissionConfig | null = null;
  soundOn = true;
  private soundRect = { x: 0, y: 0, w: 0, h: 0 };

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    // Background.
    ctx.fillStyle = "#0c0f0a";
    ctx.fillRect(0, 0, vw, vh);

    // Subtle grid for a tactical feel.
    ctx.strokeStyle = "rgba(120,180,90,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < vw; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
      ctx.stroke();
    }
    for (let y = 0; y < vh; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y);
      ctx.stroke();
    }

    // Title.
    ctx.textAlign = "center";
    ctx.fillStyle = "#9ad06b";
    ctx.font = "bold 56px monospace";
    ctx.fillText("COMMAND & CONQUEST", vw / 2, vh * 0.18);
    ctx.fillStyle = "#7a8a6a";
    ctx.font = "16px monospace";
    ctx.fillText("Wähle eine Mission, Kommandant", vw / 2, vh * 0.18 + 34);

    // Mission cards.
    const cardW = Math.min(620, vw - 80);
    const cardH = 86;
    const gap = 16;
    let y = vh * 0.3;
    const x = (vw - cardW) / 2;
    this.cards = [];

    for (const m of MISSIONS) {
      const hover = this.hovered === m;
      ctx.fillStyle = hover ? "#26331c" : "#181d12";
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = hover ? "#9ad06b" : "#3a4a2a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardW, cardH);

      ctx.textAlign = "left";
      ctx.fillStyle = "#d8e8c0";
      ctx.font = "bold 20px monospace";
      ctx.fillText(m.name, x + 20, y + 30);

      ctx.fillStyle = "#9aaa88";
      ctx.font = "13px monospace";
      this.wrapText(ctx, m.description, x + 20, y + 52, cardW - 40, 17);

      this.cards.push({ x, y, w: cardW, h: cardH, mission: m });
      y += cardH + gap;
    }

    // Sound toggle.
    const sw = 150;
    const sh = 30;
    const sx = vw / 2 - sw / 2;
    const sy = Math.min(y + 10, vh - 80);
    this.soundRect = { x: sx, y: sy, w: sw, h: sh };
    ctx.fillStyle = "#181d12";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = "#3a4a2a";
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.textAlign = "center";
    ctx.fillStyle = "#9ad06b";
    ctx.font = "13px monospace";
    ctx.fillText(`Sound: ${this.soundOn ? "AN" : "AUS"}`, vw / 2, sy + 20);

    // Footer hint.
    ctx.fillStyle = "#55663f";
    ctx.font = "12px monospace";
    ctx.fillText("Steuerung: WASD/Maus = Kamera · Links = Auswahl · Rechts = Befehl", vw / 2, vh - 30);
  }

  /** Returns a mission if a card was clicked, "sound" to toggle, or null. */
  click(mx: number, my: number): MissionConfig | "sound" | null {
    if (
      mx >= this.soundRect.x &&
      mx <= this.soundRect.x + this.soundRect.w &&
      my >= this.soundRect.y &&
      my <= this.soundRect.y + this.soundRect.h
    ) {
      return "sound";
    }
    for (const c of this.cards) {
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return c.mission;
    }
    return null;
  }

  hover(mx: number, my: number): void {
    this.hovered = null;
    for (const c of this.cards) {
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        this.hovered = c.mission;
        return;
      }
    }
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(" ");
    let line = "";
    let cy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = w;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }
}

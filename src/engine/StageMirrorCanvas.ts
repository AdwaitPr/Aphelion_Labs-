/**
 * Synchronized offscreen 2D specimen canvas uploaded to Three.js as uStageTex.
 * Mirrors exact getBoundingClientRect() coordinates of [data-lens-mirror] display
 * headlines alongside Swiss architectural schematics, vernier rules, and calibration
 * rings—redrawn strictly on resize, scroll, or explicit layout changes via RAF throttle.
 */
export class StageMirrorCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private dirty = true;
  private rafScheduled = false;
  private onUploadCallback: (() => void) | null = null;

  constructor(dpr: number) {
    this.dpr = dpr;
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d', { alpha: true });
    if (!context) {
      throw new Error('Unable to initialize 2D context for StageMirrorCanvas.');
    }
    this.ctx = context;
    this.resize(window.innerWidth, window.innerHeight, dpr);
  }

  setOnUpload(cb: () => void): void {
    this.onUploadCallback = cb;
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.dpr = Math.max(1, Math.min(dpr, 2));
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.invalidate();
  }

  invalidate(): void {
    this.dirty = true;
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      if (!this.dirty) return;
      this.redrawNow();
    });
  }

  redrawNow(): void {
    this.dirty = false;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const scrollY = window.scrollY || 0;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // 1. Swiss Architectural Modular Grid & Vernier Coordinate Rules
    this.drawArchitecturalGrid(ctx, w, h, scrollY);

    // 2. Hero Concentric Calibration Rings & Optical Axis Reticle
    this.drawHeroOpticalSchematic(ctx, w, h, scrollY);

    // 3. Bento & Section Background Wireframe Schematics
    this.drawSectionSchematics(ctx, w, h, scrollY);

    // 4. Mirror exact [data-lens-mirror] display typography & baseline rules
    this.drawMirroredTypography(ctx, w, h);

    ctx.restore();
    this.onUploadCallback?.();
  }

  private drawArchitecturalGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scrollY: number,
  ): void {
    const colCount = w >= 1024 ? 12 : w >= 640 ? 6 : 4;
    const marginX = w >= 1280 ? Math.max(48, (w - 1280) * 0.5) : 24;
    const innerW = Math.max(w - marginX * 2, 100);
    const colStep = innerW / colCount;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.lineWidth = 1;

    // Vertical Swiss grid tracks
    for (let i = 0; i <= colCount; i++) {
      const x = Math.round(marginX + i * colStep) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal modular baseline intervals scrolling with document
    const rowStep = 120;
    const startY = -(scrollY % rowStep);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.036)';
    for (let y = startY; y <= h; y += rowStep) {
      const py = Math.round(y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Precision vernier ticks along left & right outer datum rails
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    const tickStep = 24;
    const tickStart = -(scrollY % tickStep);
    const leftRail = Math.round(marginX) + 0.5;
    const rightRail = Math.round(w - marginX) + 0.5;
    for (let y = tickStart, idx = Math.floor(scrollY / tickStep); y <= h; y += tickStep, idx++) {
      const py = Math.round(y) + 0.5;
      const major = idx % 5 === 0;
      const len = major ? 9 : 4;
      ctx.beginPath();
      ctx.moveTo(leftRail, py);
      ctx.lineTo(leftRail + len, py);
      ctx.moveTo(rightRail, py);
      ctx.lineTo(rightRail - len, py);
      ctx.stroke();
    }
  }

  private drawHeroOpticalSchematic(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scrollY: number,
  ): void {
    const centerX = w < 640 ? w * 0.54 : w * 0.68;
    const centerY = (w < 640 ? Math.min(h * 0.34, 300) : Math.min(h * 0.44, 410)) - scrollY * 0.45;
    if (centerY < -500 || centerY > h + 500) return;

    const baseRadius = Math.min(w, h) * 0.24;

    // Concentric optical aperture calibration rings
    const radii = [baseRadius * 0.48, baseRadius * 0.82, baseRadius * 1.15, baseRadius * 1.52];
    radii.forEach((radius, idx) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 1 ? 'rgba(200, 217, 240, 0.14)' : 'rgba(255, 255, 255, 0.065)';
      ctx.lineWidth = 1;
      if (idx === 2) {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Optical axis crosshair and radial degree ticks around primary calibration ring
    const ringR = baseRadius * 1.15;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const inner = ringR - (isCardinal ? 14 : 6);
      const outer = ringR + (isCardinal ? 14 : 4);
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(rad) * inner, centerY + Math.sin(rad) * inner);
      ctx.lineTo(centerX + Math.cos(rad) * outer, centerY + Math.sin(rad) * outer);
      ctx.stroke();
    }

    // Horizontal & vertical collimation hairlines intersecting hero stage
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(centerY) + 0.5);
    ctx.lineTo(w, Math.round(centerY) + 0.5);
    ctx.moveTo(Math.round(centerX) + 0.5, Math.max(0, centerY - baseRadius * 1.8));
    ctx.lineTo(Math.round(centerX) + 0.5, Math.min(h, centerY + baseRadius * 1.8));
    ctx.stroke();
  }

  private drawSectionSchematics(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scrollY: number,
  ): void {
    // Secondary parabolic optical ray wireframe behind mid/lower sections
    const bandY = 1040 - scrollY;
    if (bandY > -420 && bandY < h + 420) {
      ctx.strokeStyle = 'rgba(200, 217, 240, 0.07)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        const offset = i * 44;
        ctx.beginPath();
        ctx.moveTo(0, bandY + offset);
        ctx.quadraticCurveTo(w * 0.5, bandY + offset * 0.25, w, bandY + offset);
        ctx.stroke();
      }
    }

    // Lower archive datum ellipses
    const lowerY = 1980 - scrollY;
    if (lowerY > -450 && lowerY < h + 450) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(w * 0.22, lowerY, w * 0.28, 120, -0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.22, lowerY, w * 0.18, 76, -0.14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawMirroredTypography(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const mirrorNodes = document.querySelectorAll<HTMLElement>('[data-lens-mirror]');
    if (mirrorNodes.length === 0) return;

    mirrorNodes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > h + 40 || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize) || 56;
      const fontWeight = style.fontWeight || '600';
      const fontFamily = style.fontFamily || '"Inter Tight", sans-serif';
      const letterSpacing = parseFloat(style.letterSpacing) || 0;
      const mirrorColor = el.dataset.lensColor || '#F4F5F7';

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = mirrorColor;
      ctx.textBaseline = 'alphabetic';

      // Extract exact visual lines using Range bounding boxes so wrapped lines match DOM 1:1
      const lines = this.extractVisualLines(el);

      lines.forEach((line) => {
        const baselineY = line.top + line.height * 0.805;

        // Subtle Swiss typographic baseline rule directly underneath each hero line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.max(24, line.left - 18), Math.round(baselineY + 8) + 0.5);
        ctx.lineTo(Math.min(w - 24, line.right + 42), Math.round(baselineY + 8) + 0.5);
        ctx.stroke();

        this.fillTextWithTracking(ctx, line.text, line.left, baselineY, letterSpacing);
      });

      ctx.restore();
    });
  }

  private extractVisualLines(el: HTMLElement): Array<{
    text: string;
    left: number;
    right: number;
    top: number;
    height: number;
  }> {
    const textNode = Array.from(el.childNodes).find(
      (n): n is Text => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim().length ?? 0) > 0,
    );

    if (!textNode || !textNode.textContent) {
      const fallbackText = el.textContent?.trim() ?? '';
      if (!fallbackText) return [];
      const rect = el.getBoundingClientRect();
      return [
        {
          text: fallbackText,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          height: rect.height,
        },
      ];
    }

    const raw = textNode.textContent;
    const range = document.createRange();
    const lines: Array<{
      text: string;
      left: number;
      right: number;
      top: number;
      height: number;
    }> = [];

    let currentLineTop: number | null = null;
    let currentLineHeight = 0;
    let currentLeft = Infinity;
    let currentRight = -Infinity;
    let currentStart = 0;

    // Walk word boundaries for fast, exact visual line extraction
    const tokenRegex = /\S+\s*/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(raw)) !== null) {
      const start = match.index;
      const end = start + match[0].trimEnd().length;
      if (end <= start) continue;

      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;

      if (currentLineTop === null) {
        currentLineTop = r.top;
        currentLineHeight = r.height;
        currentLeft = r.left;
        currentRight = r.right;
        currentStart = start;
      } else if (Math.abs(r.top - currentLineTop) > Math.max(8, currentLineHeight * 0.45)) {
        const lineText = raw.slice(currentStart, start).trim();
        if (lineText) {
          lines.push({
            text: lineText,
            left: currentLeft,
            right: currentRight,
            top: currentLineTop,
            height: currentLineHeight,
          });
        }
        currentLineTop = r.top;
        currentLineHeight = r.height;
        currentLeft = r.left;
        currentRight = r.right;
        currentStart = start;
      } else {
        currentLeft = Math.min(currentLeft, r.left);
        currentRight = Math.max(currentRight, r.right);
        currentLineHeight = Math.max(currentLineHeight, r.height);
      }
    }

    if (currentLineTop !== null) {
      const trailing = raw.slice(currentStart).trim();
      if (trailing) {
        lines.push({
          text: trailing,
          left: currentLeft,
          right: currentRight,
          top: currentLineTop,
          height: currentLineHeight,
        });
      }
    }

    return lines;
  }

  private fillTextWithTracking(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    tracking: number,
  ): void {
    if (Math.abs(tracking) < 0.05) {
      ctx.fillText(text, x, y);
      return;
    }
    let cursorX = x;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      ctx.fillText(ch, cursorX, y);
      cursorX += ctx.measureText(ch).width + tracking;
    }
  }
}

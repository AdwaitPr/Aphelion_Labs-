import { computeFoilAngles } from './opticalMath';

const MAX_FOIL_SURFACES = 6;

interface TrackedSurface {
  el: HTMLElement;
  rect: DOMRect;
}

/**
 * Imperative RAF manager syncing up to 6 [data-foil-surface] DOM elements with
 * analytical cursor-normal thin-film iridescence (--foil-angle, --foil-x, --foil-y)
 * using zero React re-renders.
 */
export class FoilSyncManager {
  private surfaces: TrackedSurface[] = [];
  private pointerX = window.innerWidth * 0.55;
  private pointerY = window.innerHeight * 0.35;
  private rafPending = false;
  private rectsDirty = true;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly reducedMotion: boolean;

  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scan();
    this.attach();
    this.scheduleUpdate();
  }

  scan(): void {
    const found = Array.from(
      document.querySelectorAll<HTMLElement>('[data-foil-surface]'),
    ).slice(0, MAX_FOIL_SURFACES);

    this.surfaces = found.map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
    }));
    this.rectsDirty = false;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.surfaces.forEach((s) => this.resizeObserver?.observe(s.el));
    }
    this.scheduleUpdate();
  }

  private attach(): void {
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('scroll', this.handleLayoutShift, { passive: true });
    window.addEventListener('resize', this.handleLayoutShift, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleLayoutShift);
      this.surfaces.forEach((s) => this.resizeObserver?.observe(s.el));
    }
  }

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (this.reducedMotion) return;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.scheduleUpdate();
  };

  private readonly handleLayoutShift = (): void => {
    this.rectsDirty = true;
    this.scheduleUpdate();
  };

  private scheduleUpdate(): void {
    if (this.disposed || this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      if (this.disposed) return;

      if (this.rectsDirty) {
        for (const item of this.surfaces) {
          item.rect = item.el.getBoundingClientRect();
        }
        this.rectsDirty = false;
      }

      for (const item of this.surfaces) {
        const { angleDeg, localXPct, localYPct, intensity } = computeFoilAngles(
          item.rect,
          this.pointerX,
          this.pointerY,
        );
        item.el.style.setProperty('--foil-angle', `${angleDeg}deg`);
        item.el.style.setProperty('--foil-x', `${localXPct}%`);
        item.el.style.setProperty('--foil-y', `${localYPct}%`);
        item.el.style.setProperty('--foil-intensity', String(intensity));
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('scroll', this.handleLayoutShift);
    window.removeEventListener('resize', this.handleLayoutShift);
    this.resizeObserver?.disconnect();
    this.surfaces = [];
  }
}

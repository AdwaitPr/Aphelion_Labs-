import * as THREE from 'three';
import type { OpticalParams } from '../types/calibration';
import { clamp, DEFAULT_OPTICAL_PARAMS, stepSpring } from './opticalMath';
import { StageMirrorCanvas } from './StageMirrorCanvas';
import { writeTelemetry } from './telemetryBridge';
import opticalVert from './shaders/optical.vert.glsl?raw';
import opticalFrag from './shaders/optical.frag.glsl?raw';

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

interface SpringScalar {
  value: number;
  velocity: number;
  target: number;
}

function makeSpring(initial: number): SpringScalar {
  return { value: initial, velocity: 0, target: initial };
}

export interface OpticalEngineStatus {
  webglSupported: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

/**
 * Imperative WebGL2 Optical Stage Engine completely decoupled from React reconciliation.
 * Runs a single full-screen orthographic pass using GLSL 300 es, critically damped
 * relativistic lens springs, and software-WebGL fence pacing.
 */
export class OpticalStageEngine {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer | null = null;
  private readonly scene: THREE.Scene | null = null;
  private readonly camera: THREE.OrthographicCamera | null = null;
  private readonly material: THREE.ShaderMaterial | null = null;
  private readonly geometry: THREE.PlaneGeometry | null = null;
  private readonly stageMirror: StageMirrorCanvas | null = null;
  private stageTexture: THREE.CanvasTexture | null = null;
  private lastTexWidth = 0;
  private lastTexHeight = 0;

  private readonly isSoftwareGl: boolean;
  private readonly webglSupported: boolean;
  private reducedMotion: boolean;

  private disposed = false;
  private paused = false;
  private rafId = 0;
  private timeoutId = 0;
  private lastTimeMs = 0;
  private elapsedSec = 0;
  private fpsSamples = 60;

  // Critically damped springs for pointer mass, surge, scroll skylight, and optical params
  private readonly lensX = makeSpring(0.56);
  private readonly lensY = makeSpring(0.62);
  private readonly massBoost = makeSpring(1.0);
  private readonly skylightTilt = makeSpring(0.0);

  private readonly einsteinRadius = makeSpring(DEFAULT_OPTICAL_PARAMS.einsteinRadius);
  private readonly filmThicknessNm = makeSpring(DEFAULT_OPTICAL_PARAMS.filmThicknessNm);
  private readonly filmIor = makeSpring(DEFAULT_OPTICAL_PARAMS.filmIor);
  private readonly dispersion = makeSpring(DEFAULT_OPTICAL_PARAMS.dispersion);
  private readonly causticIntensity = makeSpring(DEFAULT_OPTICAL_PARAMS.causticIntensity);
  private readonly deflectionGain = makeSpring(DEFAULT_OPTICAL_PARAMS.deflectionGain);

  private pointerActive = false;
  private pointerPressed = false;
  private resizeObserver: ResizeObserver | null = null;
  private motionMediaQuery: MediaQueryList | null = null;

  // Pre-allocated scratch uniform vectors to guarantee zero GC in render loop
  private readonly _resolutionVec = new THREE.Vector2(1, 1);
  private readonly _lensPosVec = new THREE.Vector2(0.56, 0.62);
  private readonly _lensVelVec = new THREE.Vector2(0, 0);

  constructor(container: HTMLElement, initialParams?: Partial<OpticalParams>) {
    this.container = container;
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionMediaQuery.matches;

    const probe = detectSoftwareWebGL();
    this.webglSupported = probe.supported;
    this.isSoftwareGl = probe.isSoftwareGl;

    if (initialParams) {
      this.setTargetParams(initialParams, true);
    }

    if (!this.webglSupported) {
      writeTelemetry({ webglActive: false, reducedMotion: this.reducedMotion });
      return;
    }

    const dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('data-testid', 'optical-webgl-canvas');

    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = scene;
    this.camera = camera;

    const stageMirror = new StageMirrorCanvas(dpr);
    this.stageMirror = stageMirror;
    const stageTexture = this.createStageTexture(stageMirror.canvas);
    this.stageTexture = stageTexture;

    stageMirror.setOnUpload(() => {
      this.syncStageTexture();
    });

    this._resolutionVec.set(window.innerWidth, window.innerHeight);

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: opticalVert,
      fragmentShader: opticalFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uStageTex: { value: stageTexture },
        uResolution: { value: this._resolutionVec },
        uAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) },
        uTime: { value: 0 },
        uLensPos: { value: this._lensPosVec },
        uLensVel: { value: this._lensVelVec },
        uMassBoost: { value: this.massBoost.value },
        uEinsteinRadius: { value: this.einsteinRadius.value },
        uDeflectionGain: { value: this.deflectionGain.value },
        uDispersion: { value: this.dispersion.value },
        uFilmIOR: { value: this.filmIor.value },
        uFilmThicknessNm: { value: this.filmThicknessNm.value },
        uLightTilt: { value: this.skylightTilt.value },
        uCausticIntensity: { value: this.causticIntensity.value },
        uReducedMotion: { value: this.reducedMotion ? 1.0 : 0.0 },
      },
    });
    this.material = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.geometry = geometry;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    this.attachListeners();
    this.syncScrollTarget();
    this.stageMirror.redrawNow();

    // Re-mirror crisp typography once webfonts finish loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!this.disposed) {
          this.stageMirror?.invalidate();
        }
      });
    }

    writeTelemetry({
      webglActive: true,
      reducedMotion: this.reducedMotion,
    });

    this.lastTimeMs = performance.now();
    this.scheduleNextTick(false);
  }

  getStatus(): OpticalEngineStatus {
    return {
      webglSupported: this.webglSupported,
      isSoftwareGl: this.isSoftwareGl,
      reducedMotion: this.reducedMotion,
    };
  }

  setTargetParams(params: Partial<OpticalParams>, immediate = false): void {
    const apply = (spring: SpringScalar, value?: number) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      spring.target = value;
      if (immediate) {
        spring.value = value;
        spring.velocity = 0;
      }
    };

    apply(this.einsteinRadius, params.einsteinRadius);
    apply(this.filmThicknessNm, params.filmThicknessNm);
    apply(this.filmIor, params.filmIor);
    apply(this.dispersion, params.dispersion);
    apply(this.causticIntensity, params.causticIntensity);
    apply(this.deflectionGain, params.deflectionGain);
  }

  invalidateMirror(): void {
    this.stageMirror?.invalidate();
  }

  private createStageTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.lastTexWidth = canvas.width;
    this.lastTexHeight = canvas.height;
    return tex;
  }

  private syncStageTexture(): void {
    if (!this.stageMirror || !this.material) return;
    const canvas = this.stageMirror.canvas;
    if (
      !this.stageTexture ||
      canvas.width !== this.lastTexWidth ||
      canvas.height !== this.lastTexHeight
    ) {
      const oldTex = this.stageTexture;
      const nextTex = this.createStageTexture(canvas);
      this.stageTexture = nextTex;
      this.material.uniforms.uStageTex.value = nextTex;
      oldTex?.dispose();
    } else {
      this.stageTexture.needsUpdate = true;
    }
  }

  private attachListeners(): void {
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', this.handlePointerUp, { passive: true });
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.motionMediaQuery?.addEventListener('change', this.handleReducedMotionChange);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.stageMirror?.invalidate();
      });
      this.resizeObserver.observe(document.body);
    }
  }

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (this.reducedMotion) return;
    this.pointerActive = true;
    const uvX = clamp(e.clientX / Math.max(window.innerWidth, 1), 0.02, 0.98);
    const uvY = clamp(1.0 - e.clientY / Math.max(window.innerHeight, 1), 0.02, 0.98);
    this.lensX.target = uvX;
    this.lensY.target = uvY;
  };

  private readonly handlePointerDown = (e: PointerEvent): void => {
    if (this.reducedMotion) return;
    // Ignore clicks on interactive controls so sliders/buttons don't trigger mass surge
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, a, [role="dialog"]')) {
      return;
    }
    this.pointerPressed = true;
    this.massBoost.target = 1.65;
  };

  private readonly handlePointerUp = (): void => {
    this.pointerPressed = false;
    this.massBoost.target = 1.0;
  };

  private readonly handleScroll = (): void => {
    this.syncScrollTarget();
    this.stageMirror?.invalidate();
  };

  private syncScrollTarget(): void {
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    const progress = clamp((window.scrollY || 0) / maxScroll, 0, 1);
    this.skylightTilt.target = progress;
  }

  private readonly handleResize = (): void => {
    if (!this.renderer || !this.material) return;
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    const dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);
    this._resolutionVec.set(width, height);
    this.material.uniforms.uAspect.value = width / height;
    if (this.stageMirror) {
      this.stageMirror.resize(width, height, dpr);
      this.stageMirror.redrawNow();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    this.paused = document.hidden;
    if (!this.paused && !this.disposed) {
      this.lastTimeMs = performance.now();
      this.scheduleNextTick(false);
    }
  };

  private readonly handleReducedMotionChange = (e: MediaQueryListEvent): void => {
    this.reducedMotion = e.matches;
    if (this.reducedMotion) {
      this.lensX.target = 0.62;
      this.lensY.target = 0.64;
      this.massBoost.target = 1.0;
    }
    writeTelemetry({ reducedMotion: this.reducedMotion });
  };

  private scheduleNextTick(afterSoftwareDraw: boolean): void {
    if (this.disposed || this.paused) return;

    if (this.isSoftwareGl && afterSoftwareDraw && this.renderer) {
      this.afterDraw(() => {
        if (!this.disposed && !this.paused) {
          this.tick();
        }
      });
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  private afterDraw(cb: () => void): void {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.timeoutId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.timeoutId = window.setTimeout(cb, 80);
      }
    };
    this.timeoutId = window.setTimeout(poll, 5);
  }

  private readonly tick = (): void => {
    if (this.disposed || this.paused || !this.renderer || !this.scene || !this.camera || !this.material) {
      return;
    }

    const now = performance.now();
    const rawDt = Math.max((now - this.lastTimeMs) / 1000, 0.001);
    const dt = Math.min(rawDt, 0.05);
    this.lastTimeMs = now;
    this.elapsedSec += dt;

    // Smooth FPS tracker
    const instantFps = clamp(1 / rawDt, 1, 144);
    this.fpsSamples = this.fpsSamples * 0.9 + instantFps * 0.1;

    // Gentle idle orbital drift on hero before pointer enters (disabled in reduced-motion)
    if (!this.pointerActive && !this.reducedMotion) {
      this.lensX.target = 0.56 + Math.sin(this.elapsedSec * 0.34) * 0.065;
      this.lensY.target = 0.62 + Math.cos(this.elapsedSec * 0.27) * 0.04;
    } else if (this.reducedMotion) {
      this.lensX.target = 0.64;
      this.lensY.target = 0.64;
      this.massBoost.target = 1.0;
    }

    // Advance critically damped springs
    const lensOmega = this.isSoftwareGl ? 10.5 : 13.5;
    const paramOmega = 9.0;

    const nextX = stepSpring(this.lensX.value, this.lensX.velocity, this.lensX.target, lensOmega, dt);
    this.lensX.value = nextX.value;
    this.lensX.velocity = nextX.velocity;

    const nextY = stepSpring(this.lensY.value, this.lensY.velocity, this.lensY.target, lensOmega, dt);
    this.lensY.value = nextY.value;
    this.lensY.velocity = nextY.velocity;

    const nextMass = stepSpring(
      this.massBoost.value,
      this.massBoost.velocity,
      this.massBoost.target,
      11.0,
      dt,
    );
    this.massBoost.value = nextMass.value;
    this.massBoost.velocity = nextMass.velocity;

    const nextTilt = stepSpring(
      this.skylightTilt.value,
      this.skylightTilt.velocity,
      this.skylightTilt.target,
      7.5,
      dt,
    );
    this.skylightTilt.value = nextTilt.value;
    this.skylightTilt.velocity = nextTilt.velocity;

    const advanceParam = (s: SpringScalar) => {
      const n = stepSpring(s.value, s.velocity, s.target, paramOmega, dt);
      s.value = n.value;
      s.velocity = n.velocity;
    };

    advanceParam(this.einsteinRadius);
    advanceParam(this.filmThicknessNm);
    advanceParam(this.filmIor);
    advanceParam(this.dispersion);
    advanceParam(this.causticIntensity);
    advanceParam(this.deflectionGain);

    // Update shader uniforms without allocations
    this._lensPosVec.set(this.lensX.value, this.lensY.value);
    this._lensVelVec.set(this.lensX.velocity, this.lensY.velocity);

    const u = this.material.uniforms;
    u.uTime.value = this.elapsedSec;
    u.uMassBoost.value = this.massBoost.value;
    u.uEinsteinRadius.value = this.einsteinRadius.value;
    u.uDeflectionGain.value = this.deflectionGain.value;
    u.uDispersion.value = this.dispersion.value;
    u.uFilmIOR.value = this.filmIor.value;
    u.uFilmThicknessNm.value = this.filmThicknessNm.value;
    u.uLightTilt.value = this.skylightTilt.value;
    u.uCausticIntensity.value = this.causticIntensity.value;
    u.uReducedMotion.value = this.reducedMotion ? 1.0 : 0.0;

    this.renderer.render(this.scene, this.camera);

    // Publish telemetry into zero-rerender bridge
    const viewportH = Math.max(window.innerHeight, 1);
    writeTelemetry({
      einsteinRadiusPx: Math.round(this.einsteinRadius.value * this.massBoost.value * viewportH),
      filmNm: Math.round(this.filmThicknessNm.value),
      filmIor: Number(this.filmIor.value.toFixed(3)),
      skylightDeg: Number((14 + this.skylightTilt.value * 44).toFixed(1)),
      lensUvX: Number(this.lensX.value.toFixed(3)),
      lensUvY: Number(this.lensY.value.toFixed(3)),
      massBoost: Number(this.massBoost.value.toFixed(2)),
      fps: Math.round(this.fpsSamples),
      webglActive: true,
      reducedMotion: this.reducedMotion,
    });

    this.scheduleNextTick(true);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.rafId);
    clearTimeout(this.timeoutId);

    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.motionMediaQuery?.removeEventListener('change', this.handleReducedMotionChange);
    this.resizeObserver?.disconnect();

    this.stageTexture?.dispose();
    this.geometry?.dispose();
    this.material?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}

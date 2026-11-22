import type {
  CalibrationCreateInput,
  OpticalCalibration,
  OpticalParams,
} from '../types/calibration';

export const OPTICAL_BOUNDS = {
  einsteinRadius: { min: 0.04, max: 0.18, default: 0.088 },
  filmThicknessNm: { min: 220, max: 720, default: 420 },
  filmIor: { min: 1.2, max: 2.2, default: 1.38 },
  dispersion: { min: 0.0, max: 2.5, default: 1.15 },
  causticIntensity: { min: 0.0, max: 1.5, default: 0.85 },
  deflectionGain: { min: 0.2, max: 2.0, default: 1.0 },
} as const;

export const DEFAULT_OPTICAL_PARAMS: OpticalParams = {
  einsteinRadius: OPTICAL_BOUNDS.einsteinRadius.default,
  filmThicknessNm: OPTICAL_BOUNDS.filmThicknessNm.default,
  filmIor: OPTICAL_BOUNDS.filmIor.default,
  dispersion: OPTICAL_BOUNDS.dispersion.default,
  causticIntensity: OPTICAL_BOUNDS.causticIntensity.default,
  deflectionGain: OPTICAL_BOUNDS.deflectionGain.default,
};

export const SEEDED_CALIBRATIONS: OpticalCalibration[] = [
  {
    id: 'preset-leica-mgf2-420',
    name: 'Leica MgF2 420nm',
    coatingCode: 'AR-MGF2-420',
    notes:
      'Quarter-wave magnesium fluoride anti-reflective single layer calibrated for 550nm green transmission and low grazing dispersion.',
    einsteinRadius: 0.088,
    filmThicknessNm: 420,
    filmIor: 1.38,
    dispersion: 1.15,
    causticIntensity: 0.85,
    deflectionGain: 1.0,
    createdAt: '2026-09-14T09:00:00.000Z',
    isPreset: true,
  },
  {
    id: 'preset-deep-field-schwarzschild',
    name: 'Deep-Field Schwarzschild',
    coatingCode: 'GR-SCHW-585',
    notes:
      'High-mass relativistic lensing aperture with extended Einstein ring envelope and pronounced spectral rim refraction.',
    einsteinRadius: 0.132,
    filmThicknessNm: 585,
    filmIor: 1.52,
    dispersion: 1.85,
    causticIntensity: 0.95,
    deflectionGain: 1.38,
    createdAt: '2026-09-16T11:30:00.000Z',
    isPreset: true,
  },
  {
    id: 'preset-borosilicate-crown',
    name: 'Borosilicate Crown',
    coatingCode: 'BK7-CROWN-310',
    notes:
      'Ultra-low Abbe dispersion N-BK7 optical crown profile with restrained baseline curvature and neutral silver Fresnel edge.',
    einsteinRadius: 0.068,
    filmThicknessNm: 310,
    filmIor: 1.516,
    dispersion: 0.58,
    causticIntensity: 0.65,
    deflectionGain: 0.82,
    createdAt: '2026-09-18T14:15:00.000Z',
    isPreset: true,
  },
  {
    id: 'preset-cryo-quartz-caustic',
    name: 'Cryo-Quartz Caustic',
    coatingCode: 'SIO2-CRYO-660',
    notes:
      'Fused silica cryogenic optical bench tuned for heightened skylight refraction caustics and crisp cyan-violet interference.',
    einsteinRadius: 0.104,
    filmThicknessNm: 660,
    filmIor: 1.46,
    dispersion: 1.42,
    causticIntensity: 1.35,
    deflectionGain: 1.12,
    createdAt: '2026-09-21T16:45:00.000Z',
    isPreset: true,
  },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const denom = edge1 - edge0;
  if (Math.abs(denom) < 1e-8) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / denom, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Computes regularized point-mass Einstein-ring gravitational deflection in UV space.
 * Mirrors the exact GLSL equations in optical.frag.glsl.
 */
export function computeEinsteinDeflection(
  uvX: number,
  uvY: number,
  lensX: number,
  lensY: number,
  aspect: number,
  einsteinRadius: number,
  massBoost: number,
  deflectionGain: number,
): { offsetX: number; offsetY: number; r: number; rE: number; env: number } {
  const dx = (uvX - lensX) * aspect;
  const dy = uvY - lensY;
  const r = Math.hypot(dx, dy);
  const rE = einsteinRadius * massBoost;
  const env = smoothstep(rE * 3.6, rE * 0.35, r);
  const bend = (rE * rE) / (r + 0.018);
  const safeR = Math.max(r, 1e-4);
  const dirX = dx / safeR;
  const dirY = dy / safeR;
  const mag = bend * env * deflectionGain;
  return {
    offsetX: (dirX * mag) / Math.max(aspect, 1e-4),
    offsetY: dirY * mag,
    r,
    rE,
    env,
  };
}

/**
 * Narrow Gaussian ring weight localized strictly around the Einstein ring boundary.
 */
export function computeRingMask(r: number, rE: number): number {
  const sigma = Math.max(rE * 0.26, 1e-4);
  const ratio = (r - rE) / sigma;
  return Math.exp(-(ratio * ratio));
}

/**
 * Airy OPD thin-film spectral interference modulated by Schlick Fresnel and ring mask.
 * Returns normalized RGB [0..0.38] specular contribution.
 */
export function computeThinFilmFresnel(
  r: number,
  rE: number,
  filmIor: number,
  filmThicknessNm: number,
): { r: number; g: number; b: number; fresnel: number; opd: number } {
  const denom = Math.max(rE * 1.45, 0.001);
  const ratio = r / denom;
  const cosTheta = clamp(Math.sqrt(Math.max(0, 1 - ratio * ratio)), 0, 1);
  const opd = 2 * filmIor * filmThicknessNm * cosTheta;

  const twoPi = 6.283185307179586;
  const ir = 0.5 + 0.5 * Math.cos(twoPi * (opd / 650.0) + 0.0);
  const ig = 0.5 + 0.5 * Math.cos(twoPi * (opd / 510.0) + 2.094);
  const ib = 0.5 + 0.5 * Math.cos(twoPi * (opd / 475.0) + 4.188);

  const fresnel = 0.04 + 0.96 * Math.pow(1 - cosTheta, 5);
  const ringMask = computeRingMask(r, rE);
  const intensity = clamp(fresnel * ringMask * 0.38, 0, 0.38);

  return {
    r: ir * intensity,
    g: ig * intensity,
    b: ib * intensity,
    fresnel,
    opd,
  };
}

/**
 * Evaluates thin-film spectral RGB swatch (0..255) for a given coating thickness & IOR
 * at a representative incidence angle (cosTheta) for UI preset cards.
 */
export function computeCoatingSpectralSwatch(
  filmThicknessNm: number,
  filmIor: number,
  cosTheta = 0.72,
): string {
  const opd = 2 * filmIor * filmThicknessNm * clamp(cosTheta, 0.1, 1.0);
  const twoPi = 6.283185307179586;
  const r = Math.round((0.35 + 0.65 * (0.5 + 0.5 * Math.cos(twoPi * (opd / 650.0)))) * 235);
  const g = Math.round((0.35 + 0.65 * (0.5 + 0.5 * Math.cos(twoPi * (opd / 510.0) + 2.094))) * 235);
  const b = Math.round((0.35 + 0.65 * (0.5 + 0.5 * Math.cos(twoPi * (opd / 475.0) + 4.188))) * 235);
  return `rgb(${clamp(r, 40, 245)}, ${clamp(g, 40, 245)}, ${clamp(b, 40, 245)})`;
}

/**
 * Critically damped spring step using semi-implicit Euler integration with clamped dt.
 */
export function stepSpring(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number,
): { value: number; velocity: number } {
  const clampedDt = clamp(dt, 0, 0.05);
  const displacement = current - target;
  const acceleration = -(omega * omega) * displacement - 2 * omega * velocity;
  const nextVelocity = velocity + acceleration * clampedDt;
  const nextValue = current + nextVelocity * clampedDt;
  return { value: nextValue, velocity: nextVelocity };
}

/**
 * Computes analytical surface normal tilt angle and local percentage coordinates
 * for DOM-synced thin-film foil surfaces.
 */
export function computeFoilAngles(
  rect: { left: number; top: number; width: number; height: number },
  pointerX: number,
  pointerY: number,
): { angleDeg: number; localXPct: number; localYPct: number; intensity: number } {
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const dx = pointerX - cx;
  const dy = pointerY - cy;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = ((angleRad * 180) / Math.PI + 450) % 360;

  const localXPct = rect.width > 0 ? clamp(((pointerX - rect.left) / rect.width) * 100, -40, 140) : 50;
  const localYPct = rect.height > 0 ? clamp(((pointerY - rect.top) / rect.height) * 100, -40, 140) : 50;

  const diag = Math.max(Math.hypot(rect.width, rect.height), 1);
  const distNorm = Math.hypot(dx, dy) / (diag * 1.15);
  const intensity = clamp(0.88 - distNorm * 0.58, 0.2, 0.88);

  return {
    angleDeg: Math.round(angleDeg * 10) / 10,
    localXPct: Math.round(localXPct * 10) / 10,
    localYPct: Math.round(localYPct * 10) / 10,
    intensity: Math.round(intensity * 1000) / 1000,
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  sanitized?: CalibrationCreateInput;
}

function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function parseBoundedNumber(
  raw: unknown,
  field: keyof typeof OPTICAL_BOUNDS,
  errors: string[],
): number {
  const num = typeof raw === 'number' ? raw : Number(raw);
  const { min, max } = OPTICAL_BOUNDS[field];
  if (!Number.isFinite(num)) {
    errors.push(`${field} must be a valid finite number.`);
    return OPTICAL_BOUNDS[field].default;
  }
  if (num < min || num > max) {
    errors.push(`${field} must be between ${min} and ${max}.`);
    return clamp(num, min, max);
  }
  return Math.round(num * 10000) / 10000;
}

/**
 * Validates and sanitizes an incoming calibration payload on both client and server.
 */
export function validateCalibrationInput(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['Calibration payload must be a JSON object.'] };
  }

  const record = payload as Record<string, unknown>;
  const errors: string[] = [];

  const name = sanitizeText(record.name, 64);
  if (name.length < 2) {
    errors.push('Calibration name is required (at least 2 characters).');
  }

  const notes = sanitizeText(record.notes, 200);
  const rawCode = sanitizeText(record.coatingCode, 24).toUpperCase().replace(/[^A-Z0-9-]/g, '');

  const einsteinRadius = parseBoundedNumber(record.einsteinRadius, 'einsteinRadius', errors);
  const filmThicknessNm = parseBoundedNumber(record.filmThicknessNm, 'filmThicknessNm', errors);
  const filmIor = parseBoundedNumber(
    record.filmIor ?? OPTICAL_BOUNDS.filmIor.default,
    'filmIor',
    errors,
  );
  const dispersion = parseBoundedNumber(record.dispersion, 'dispersion', errors);
  const causticIntensity = parseBoundedNumber(record.causticIntensity, 'causticIntensity', errors);
  const deflectionGain = parseBoundedNumber(
    record.deflectionGain ?? OPTICAL_BOUNDS.deflectionGain.default,
    'deflectionGain',
    errors,
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const generatedCode =
    rawCode.length >= 3 ? rawCode : `LAB-${Math.round(filmThicknessNm)}NM`;

  return {
    ok: true,
    errors: [],
    sanitized: {
      name,
      coatingCode: generatedCode,
      notes: notes || `Custom optical bench profile calibrated at ${Math.round(filmThicknessNm)}nm.`,
      einsteinRadius,
      filmThicknessNm,
      filmIor,
      dispersion,
      causticIntensity,
      deflectionGain,
    },
  };
}

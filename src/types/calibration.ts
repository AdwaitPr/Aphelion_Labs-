export interface OpticalParams {
  /** Regularized Einstein ring radius in normalized viewport height units (0.04 - 0.18) */
  einsteinRadius: number;
  /** Thin-film optical coating thickness in nanometers (220 - 720) */
  filmThicknessNm: number;
  /** Thin-film index of refraction (1.20 - 2.20, e.g. MgF2 = 1.38) */
  filmIor: number;
  /** Grazing-angle Cauchy chromatic dispersion gain (0.0 - 2.5) */
  dispersion: number;
  /** Scroll-tilted refraction caustic intensity multiplier (0.0 - 1.5) */
  causticIntensity: number;
  /** Deflection strength multiplier (0.2 - 2.0) */
  deflectionGain: number;
}

export interface OpticalCalibration extends OpticalParams {
  id: string;
  name: string;
  coatingCode: string;
  notes: string;
  createdAt: string;
  isPreset: boolean;
}

export interface CalibrationCreateInput extends OpticalParams {
  name: string;
  coatingCode?: string;
  notes?: string;
}

export interface TelemetrySnapshot {
  einsteinRadiusPx: number;
  filmNm: number;
  filmIor: number;
  skylightDeg: number;
  lensUvX: number;
  lensUvY: number;
  massBoost: number;
  fps: number;
  webglActive: boolean;
  reducedMotion: boolean;
}

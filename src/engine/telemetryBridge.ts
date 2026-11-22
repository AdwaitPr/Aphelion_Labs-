import type { TelemetrySnapshot } from '../types/calibration';
import { DEFAULT_OPTICAL_PARAMS } from './opticalMath';

const telemetryState: TelemetrySnapshot = {
  einsteinRadiusPx: Math.round(DEFAULT_OPTICAL_PARAMS.einsteinRadius * 900),
  filmNm: DEFAULT_OPTICAL_PARAMS.filmThicknessNm,
  filmIor: DEFAULT_OPTICAL_PARAMS.filmIor,
  skylightDeg: 14.0,
  lensUvX: 0.5,
  lensUvY: 0.58,
  massBoost: 1.0,
  fps: 60,
  webglActive: false,
  reducedMotion: false,
};

export function writeTelemetry(partial: Partial<TelemetrySnapshot>): void {
  Object.assign(telemetryState, partial);
}

export function readTelemetry(): TelemetrySnapshot {
  return { ...telemetryState };
}

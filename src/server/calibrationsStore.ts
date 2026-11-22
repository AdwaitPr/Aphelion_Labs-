import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  SEEDED_CALIBRATIONS,
  validateCalibrationInput,
} from '../engine/opticalMath';
import type { OpticalCalibration } from '../types/calibration';

const MAX_STORED_CALIBRATIONS = 50;

export class CalibrationsStore {
  private readonly filePath: string;

  constructor(customFilePath?: string) {
    const defaultPath = path.resolve(process.cwd(), 'data', 'calibrations.json');
    this.filePath = customFilePath ? path.resolve(customFilePath) : defaultPath;
    this.ensureSeeded();
  }

  private ensureSeeded(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      this.writeAtomic(SEEDED_CALIBRATIONS);
    }
  }

  private writeAtomic(records: OpticalCalibration[]): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = path.join(
      dir,
      `.calibrations-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.tmp`,
    );
    fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }

  list(): OpticalCalibration[] {
    this.ensureSeeded();
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.writeAtomic(SEEDED_CALIBRATIONS);
        return [...SEEDED_CALIBRATIONS];
      }
      return parsed as OpticalCalibration[];
    } catch {
      this.writeAtomic(SEEDED_CALIBRATIONS);
      return [...SEEDED_CALIBRATIONS];
    }
  }

  create(payload: unknown): {
    ok: true;
    calibration: OpticalCalibration;
  } | {
    ok: false;
    status: number;
    errors: string[];
  } {
    const validation = validateCalibrationInput(payload);
    if (!validation.ok || !validation.sanitized) {
      return { ok: false, status: 400, errors: validation.errors };
    }

    const existing = this.list();
    const calibration: OpticalCalibration = {
      id: `cal-${crypto.randomUUID().slice(0, 8)}`,
      name: validation.sanitized.name,
      coatingCode: validation.sanitized.coatingCode ?? 'LAB-420NM',
      notes: validation.sanitized.notes ?? '',
      einsteinRadius: validation.sanitized.einsteinRadius,
      filmThicknessNm: validation.sanitized.filmThicknessNm,
      filmIor: validation.sanitized.filmIor,
      dispersion: validation.sanitized.dispersion,
      causticIntensity: validation.sanitized.causticIntensity,
      deflectionGain: validation.sanitized.deflectionGain,
      createdAt: new Date().toISOString(),
      isPreset: false,
    };

    const customEntries = existing.filter((item) => !item.isPreset);
    const presetEntries = existing.filter((item) => item.isPreset);
    const nextCustom = [calibration, ...customEntries].slice(
      0,
      Math.max(1, MAX_STORED_CALIBRATIONS - presetEntries.length),
    );
    const nextAll = [...presetEntries, ...nextCustom];
    this.writeAtomic(nextAll);

    return { ok: true, calibration };
  }
}

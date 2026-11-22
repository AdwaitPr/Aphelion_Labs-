import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CalibrationsStore } from './calibrationsStore';

function createTempStorePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aphelion-cal-'));
  return path.join(dir, 'calibrations.json');
}

test('CalibrationsStore pre-seeds 4 curated optical presets on first initialization', () => {
  const storePath = createTempStorePath();
  try {
    const store = new CalibrationsStore(storePath);
    const list = store.list();
    assert.equal(list.length, 4);
    assert.equal(list[0].name, 'Leica MgF2 420nm');
    assert.equal(list[1].name, 'Deep-Field Schwarzschild');
    assert.equal(list[2].name, 'Borosilicate Crown');
    assert.equal(list[3].name, 'Cryo-Quartz Caustic');
  } finally {
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('CalibrationsStore persists newly saved calibration across reload instances', () => {
  const storePath = createTempStorePath();
  try {
    const storeA = new CalibrationsStore(storePath);
    const created = storeA.create({
      name: 'Aphelion Deep-UV 340nm',
      coatingCode: 'UV-340',
      notes: 'Custom thin-film profile for ultraviolet lithography verification.',
      einsteinRadius: 0.105,
      filmThicknessNm: 340,
      filmIor: 1.44,
      dispersion: 1.3,
      causticIntensity: 0.9,
      deflectionGain: 1.15,
    });

    assert.equal(created.ok, true);
    if (created.ok) {
      assert.equal(created.calibration.name, 'Aphelion Deep-UV 340nm');
      assert.equal(created.calibration.isPreset, false);
    }

    const storeB = new CalibrationsStore(storePath);
    const reloaded = storeB.list();
    assert.equal(reloaded.length, 5);
    assert.ok(reloaded.some((c) => c.name === 'Aphelion Deep-UV 340nm'));
  } finally {
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('CalibrationsStore rejects malformed or out-of-range payloads', () => {
  const storePath = createTempStorePath();
  try {
    const store = new CalibrationsStore(storePath);
    const bad = store.create({
      name: '',
      einsteinRadius: 5,
      filmThicknessNm: 1000,
      dispersion: -2,
      causticIntensity: 10,
    });
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.equal(bad.status, 400);
      assert.ok(bad.errors.length >= 3);
    }
    assert.equal(store.list().length, 4);
  } finally {
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

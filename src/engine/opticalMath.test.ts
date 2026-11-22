import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCoatingSpectralSwatch,
  computeEinsteinDeflection,
  computeFoilAngles,
  computeRingMask,
  computeThinFilmFresnel,
  SEEDED_CALIBRATIONS,
  stepSpring,
  validateCalibrationInput,
} from './opticalMath';

test('Einstein deflection vanishes outside outer envelope so distant typography stays straight', () => {
  const far = computeEinsteinDeflection(0.95, 0.95, 0.1, 0.1, 1.6, 0.088, 1.0, 1.0);
  assert.equal(far.env, 0);
  assert.equal(far.offsetX, 0);
  assert.equal(far.offsetY, 0);

  const near = computeEinsteinDeflection(0.56, 0.5, 0.5, 0.5, 1.6, 0.088, 1.0, 1.0);
  assert.ok(near.env > 0.5);
  assert.ok(Math.abs(near.offsetX) > 0.02);
  assert.equal(near.offsetY, 0);
});

test('Einstein deflection scales with massBoost during gravitational surge', () => {
  const base = computeEinsteinDeflection(0.57, 0.5, 0.5, 0.5, 1.5, 0.088, 1.0, 1.0);
  const surged = computeEinsteinDeflection(0.57, 0.5, 0.5, 0.5, 1.5, 0.088, 1.65, 1.0);
  assert.ok(Math.abs(surged.offsetX) > Math.abs(base.offsetX) * 2.0);
});

test('Ring mask peaks strictly at Einstein ring boundary and decays to near zero elsewhere', () => {
  const rE = 0.088;
  assert.ok(Math.abs(computeRingMask(rE, rE) - 1.0) < 1e-6);
  assert.ok(computeRingMask(0, rE) < 0.001);
  assert.ok(computeRingMask(rE * 2.5, rE) < 0.001);
});

test('Thin-film Airy OPD Fresnel intensity stays clamped at or below 0.38 specular ceiling', () => {
  const rE = 0.088;
  for (let i = 0; i <= 20; i++) {
    const r = (i / 20) * rE * 2.0;
    const sample = computeThinFilmFresnel(r, rE, 1.38, 420);
    assert.ok(sample.r <= 0.38001 && sample.r >= 0);
    assert.ok(sample.g <= 0.38001 && sample.g >= 0);
    assert.ok(sample.b <= 0.38001 && sample.b >= 0);
  }
});

test('Critically damped spring converges smoothly to target without exploding', () => {
  let value = 0;
  let velocity = 0;
  for (let i = 0; i < 120; i++) {
    const next = stepSpring(value, velocity, 1.0, 14, 1 / 60);
    value = next.value;
    velocity = next.velocity;
  }
  assert.ok(Math.abs(value - 1.0) < 0.002);
  assert.ok(Math.abs(velocity) < 0.01);
});

test('Foil surface angles compute bounded coordinates and higher intensity near pointer', () => {
  const rect = { left: 100, top: 100, width: 300, height: 200 };
  const near = computeFoilAngles(rect, 250, 200);
  const far = computeFoilAngles(rect, 1200, 900);
  assert.equal(near.localXPct, 50);
  assert.equal(near.localYPct, 50);
  assert.ok(near.intensity > far.intensity);
});

test('Coating spectral swatch outputs valid rgb string', () => {
  const swatch = computeCoatingSpectralSwatch(420, 1.38);
  assert.match(swatch, /^rgb\(\d+, \d+, \d+\)$/);
});

test('Seeded calibrations include 4 curated presets and pass validation', () => {
  assert.equal(SEEDED_CALIBRATIONS.length, 4);
  for (const preset of SEEDED_CALIBRATIONS) {
    const res = validateCalibrationInput(preset);
    assert.equal(res.ok, true, `Preset ${preset.name} failed validation: ${res.errors.join(', ')}`);
  }
});

test('Validation rejects empty names and out-of-range optical parameters', () => {
  const emptyName = validateCalibrationInput({
    name: '   ',
    einsteinRadius: 0.088,
    filmThicknessNm: 420,
    filmIor: 1.38,
    dispersion: 1.0,
    causticIntensity: 0.8,
  });
  assert.equal(emptyName.ok, false);
  assert.ok(emptyName.errors.some((e) => e.toLowerCase().includes('name')));

  const outOfRange = validateCalibrationInput({
    name: 'Invalid Optics',
    einsteinRadius: 0.99,
    filmThicknessNm: 100,
    filmIor: 5.0,
    dispersion: -1,
    causticIntensity: 9,
  });
  assert.equal(outOfRange.ok, false);
  assert.ok(outOfRange.errors.length >= 4);
});

import { useState, type FormEvent } from 'react';
import { Check, RotateCcw, Save, X } from 'lucide-react';
import {
  computeCoatingSpectralSwatch,
  DEFAULT_OPTICAL_PARAMS,
  OPTICAL_BOUNDS,
  validateCalibrationInput,
} from '../engine/opticalMath';
import type {
  CalibrationCreateInput,
  OpticalCalibration,
  OpticalParams,
} from '../types/calibration';

interface OpticalBenchDrawerProps {
  isOpen: boolean;
  params: OpticalParams;
  calibrations: OpticalCalibration[];
  activeCalibrationId: string | null;
  onClose: () => void;
  onChangeParams: (next: OpticalParams) => void;
  onSelectCalibration: (cal: OpticalCalibration) => void;
  onSaveCalibration: (input: CalibrationCreateInput) => Promise<{ ok: boolean; error?: string }>;
}

interface SliderSpec {
  key: keyof OpticalParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDER_SPECS: SliderSpec[] = [
  {
    key: 'einsteinRadius',
    label: 'Einstein Radius (R_E)',
    unit: 'norm. rad',
    min: OPTICAL_BOUNDS.einsteinRadius.min,
    max: OPTICAL_BOUNDS.einsteinRadius.max,
    step: 0.002,
    format: (v) => v.toFixed(3),
  },
  {
    key: 'filmThicknessNm',
    label: 'Film Coating Thickness',
    unit: 'nm',
    min: OPTICAL_BOUNDS.filmThicknessNm.min,
    max: OPTICAL_BOUNDS.filmThicknessNm.max,
    step: 5,
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: 'filmIor',
    label: 'Coating Refractive Index (n)',
    unit: 'IOR',
    min: OPTICAL_BOUNDS.filmIor.min,
    max: OPTICAL_BOUNDS.filmIor.max,
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'dispersion',
    label: 'Grazing Dispersion Index',
    unit: 'Cauchy ×',
    min: OPTICAL_BOUNDS.dispersion.min,
    max: OPTICAL_BOUNDS.dispersion.max,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'causticIntensity',
    label: 'Caustic Skylight Intensity',
    unit: 'gain ×',
    min: OPTICAL_BOUNDS.causticIntensity.min,
    max: OPTICAL_BOUNDS.causticIntensity.max,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'deflectionGain',
    label: 'Gravitational Deflection Gain',
    unit: 'gain ×',
    min: OPTICAL_BOUNDS.deflectionGain.min,
    max: OPTICAL_BOUNDS.deflectionGain.max,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
];

export function OpticalBenchDrawer({
  isOpen,
  params,
  calibrations,
  activeCalibrationId,
  onClose,
  onChangeParams,
  onSelectCalibration,
  onSaveCalibration,
}: OpticalBenchDrawerProps) {
  const [name, setName] = useState('');
  const [coatingCode, setCoatingCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSliderChange = (key: keyof OpticalParams, rawValue: number) => {
    setSavedNotice(null);
    onChangeParams({
      ...params,
      [key]: rawValue,
    });
  };

  const handleReset = () => {
    setFormError(null);
    setSavedNotice(null);
    onChangeParams({ ...DEFAULT_OPTICAL_PARAMS });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSavedNotice(null);

    const payload: CalibrationCreateInput = {
      name,
      coatingCode: coatingCode.trim() || undefined,
      notes: notes.trim() || undefined,
      ...params,
    };

    const validation = validateCalibrationInput(payload);
    if (!validation.ok) {
      setFormError(validation.errors[0] ?? 'Please provide a valid calibration name.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSaveCalibration(payload);
      if (!result.ok) {
        setFormError(result.error ?? 'Failed to persist optical calibration.');
      } else {
        setSavedNotice(`Saved "${name.trim()}" to archive.`);
        setName('');
        setCoatingCode('');
        setNotes('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const swatchA = computeCoatingSpectralSwatch(params.filmThicknessNm, params.filmIor, 0.96);
  const swatchB = computeCoatingSpectralSwatch(params.filmThicknessNm, params.filmIor, 0.62);
  const swatchC = computeCoatingSpectralSwatch(params.filmThicknessNm, params.filmIor, 0.25);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/55"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        id="optical-bench-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Optical Calibration Bench"
        className="flex h-full w-full max-w-md flex-col border-l border-white/[0.14] bg-[#0A0B0F] text-[#F4F5F7]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/[0.09] px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-[#F4F5F7]">
              Optical Calibration Bench
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-[#8A8F9D]">
              Live WebGL2 Shader Uniform Controller
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset optical parameters to defaults"
              className="inline-flex h-8 items-center gap-1.5 border border-white/[0.12] px-2.5 font-mono text-[11px] text-[#8A8F9D] transition-colors hover:border-white/25 hover:text-[#F4F5F7]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Optical Calibration Bench"
              className="inline-flex h-8 w-8 items-center justify-center border border-white/[0.12] text-[#8A8F9D] transition-colors hover:border-white/25 hover:text-[#F4F5F7]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Bench Interior */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Thin-Film Spectral Preview */}
          <div className="mb-6 border border-white/[0.09] bg-[#050507] p-4">
            <div className="flex items-center justify-between font-mono text-[11px] text-[#8A8F9D]">
              <span>Airy OPD Spectral Profile</span>
              <span className="tabular-nums text-[#F4F5F7]">
                {Math.round(params.filmThicknessNm)} nm · n={params.filmIor.toFixed(2)}
              </span>
            </div>
            <div
              className="mt-3 h-2.5 w-full border border-white/[0.12]"
              style={{
                background: `linear-gradient(90deg, ${swatchA}, ${swatchB}, ${swatchC})`,
              }}
            />
          </div>

          {/* Parameter Sliders */}
          <div className="space-y-5">
            {SLIDER_SPECS.map((spec) => {
              const value = params[spec.key];
              const inputId = `bench-slider-${spec.key}`;
              return (
                <div key={spec.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <label htmlFor={inputId} className="text-xs font-medium text-[#D6D9E0]">
                      {spec.label}
                    </label>
                    <span className="font-mono text-xs tabular-nums text-[#F4F5F7]">
                      {spec.format(value)}{' '}
                      <span className="text-[11px] text-[#8A8F9D]">{spec.unit}</span>
                    </span>
                  </div>
                  <input
                    id={inputId}
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={value}
                    onChange={(e) => handleSliderChange(spec.key, Number(e.target.value))}
                    className="optical-slider"
                  />
                </div>
              );
            })}
          </div>

          {/* Quick Replay of Persisted Calibrations */}
          <div className="mt-8 border-t border-white/[0.09] pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-medium text-[#8A8F9D]">
                Saved Presets ({calibrations.length})
              </h3>
              <span className="font-mono text-[11px] text-[#6F7584]">Click to replay</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {calibrations.map((cal) => {
                const active = activeCalibrationId === cal.id;
                return (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => {
                      setSavedNotice(null);
                      onSelectCalibration(cal);
                    }}
                    className={`flex items-center justify-between border px-3 py-2.5 text-left transition-colors duration-150 ${
                      active
                        ? 'border-[#C8D9F0]/60 bg-[#121520] text-[#F4F5F7]'
                        : 'border-white/[0.08] bg-[#050507] text-[#C5C9D3] hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-xs font-medium">{cal.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[#8A8F9D]">
                        R_E {cal.einsteinRadius.toFixed(3)} · {Math.round(cal.filmThicknessNm)}nm ·
                        Disp {cal.dispersion.toFixed(2)}×
                      </div>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#C8D9F0]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persist New Calibration Form */}
          <form onSubmit={handleSubmit} noValidate className="mt-8 border-t border-white/[0.09] pt-6">
            <h3 className="font-display text-sm font-semibold text-[#F4F5F7]">
              Save Calibration to Archive
            </h3>
            <p className="mt-1 text-xs text-[#8A8F9D]">
              Persists the current shader uniform state via the laboratory API.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="calibration-name-input" className="block text-xs text-[#C5C9D3]">
                  Calibration Name
                </label>
                <input
                  id="calibration-name-input"
                  type="text"
                  required
                  maxLength={64}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Aphelion Deep-UV 340nm"
                  className="mt-1.5 h-10 w-full border border-white/[0.14] bg-[#050507] px-3 text-sm text-[#F4F5F7] placeholder:text-[#5B606E] focus:border-[#C8D9F0] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="calibration-code-input" className="block text-xs text-[#C5C9D3]">
                  Coating Code (optional)
                </label>
                <input
                  id="calibration-code-input"
                  type="text"
                  maxLength={24}
                  value={coatingCode}
                  onChange={(e) => setCoatingCode(e.target.value)}
                  placeholder="e.g. AR-UV-340"
                  className="mt-1.5 h-10 w-full border border-white/[0.14] bg-[#050507] px-3 font-mono text-xs text-[#F4F5F7] uppercase placeholder:normal-case placeholder:text-[#5B606E] focus:border-[#C8D9F0] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="calibration-notes-input" className="block text-xs text-[#C5C9D3]">
                  Laboratory Notes (optional)
                </label>
                <textarea
                  id="calibration-notes-input"
                  rows={2}
                  maxLength={200}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe intended wavelength band or lens curvature notes..."
                  className="mt-1.5 w-full resize-none border border-white/[0.14] bg-[#050507] p-3 text-xs text-[#F4F5F7] placeholder:text-[#5B606E] focus:border-[#C8D9F0] focus:outline-none"
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="border border-rose-400/35 bg-rose-950/35 px-3 py-2 text-xs text-rose-200"
                >
                  {formError}
                </p>
              )}

              {savedNotice && (
                <p
                  role="status"
                  className="border border-emerald-400/35 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200"
                >
                  {savedNotice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 border border-white/25 bg-[#F4F5F7] px-4 text-xs font-semibold text-[#050507] transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{submitting ? 'Saving Calibration...' : 'Save Calibration'}</span>
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}

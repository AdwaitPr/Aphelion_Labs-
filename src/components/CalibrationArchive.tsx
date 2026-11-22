import { Check, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { computeCoatingSpectralSwatch } from '../engine/opticalMath';
import type { OpticalCalibration } from '../types/calibration';

interface CalibrationArchiveProps {
  calibrations: OpticalCalibration[];
  activeCalibrationId: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectCalibration: (calibration: OpticalCalibration) => void;
  onOpenBench: () => void;
}

export function CalibrationArchive({
  calibrations,
  activeCalibrationId,
  loading,
  error,
  onRetry,
  onSelectCalibration,
  onOpenBench,
}: CalibrationArchiveProps) {
  return (
    <section id="archive" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="mb-12 flex flex-col justify-between gap-6 border-b border-white/[0.09] pb-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs text-[#8A8F9D]">03. Full-Stack Calibration Archive</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] text-[#F4F5F7] sm:text-4xl">
              Persisted optical coatings &amp; laboratory profiles.
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs tabular-nums text-[#8A8F9D]">
              {calibrations.length} stored {calibrations.length === 1 ? 'profile' : 'profiles'}
            </span>
            <button
              type="button"
              onClick={onOpenBench}
              className="inline-flex h-9 items-center gap-2 border border-white/[0.14] bg-[#0A0B0F] px-3.5 text-xs font-medium text-[#F4F5F7] whitespace-nowrap transition-colors duration-150 hover:border-white/30 hover:bg-[#11131B] focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-2"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#C8D9F0]" aria-hidden="true" />
              <span>Record New Profile</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-64 border border-white/[0.09] bg-[#0A0B0F] p-6"
              >
                <div className="h-2 w-full bg-white/[0.06]" />
                <div className="mt-6 h-5 w-2/3 bg-white/[0.08]" />
                <div className="mt-3 h-12 w-full bg-white/[0.04]" />
                <div className="mt-8 h-10 w-full bg-white/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-start justify-between gap-4 border border-white/[0.14] bg-[#0A0B0F] p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-base font-medium text-[#F4F5F7]">
                Unable to load persisted calibrations
              </h3>
              <p className="mt-1 text-sm text-[#8A8F9D]">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-9 items-center gap-2 border border-white/20 bg-[#F4F5F7] px-4 text-xs font-medium text-[#050507] transition-colors hover:bg-white"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry Fetch</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && calibrations.length === 0 && (
          <div className="border border-white/[0.09] bg-[#0A0B0F] p-10 text-center">
            <p className="font-display text-lg text-[#F4F5F7]">No calibrations recorded yet</p>
            <p className="mt-2 text-sm text-[#8A8F9D]">
              Open the Optical Bench to dial in a custom coating and persist it to the archive.
            </p>
          </div>
        )}

        {/* Live Persisted Archive Cards */}
        {!loading && !error && calibrations.length > 0 && (
          <div
            data-testid="calibration-archive-grid"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {calibrations.map((cal) => {
              const isActive = activeCalibrationId === cal.id;
              const s0 = computeCoatingSpectralSwatch(cal.filmThicknessNm, cal.filmIor, 0.95);
              const s1 = computeCoatingSpectralSwatch(cal.filmThicknessNm, cal.filmIor, 0.62);
              const s2 = computeCoatingSpectralSwatch(cal.filmThicknessNm, cal.filmIor, 0.28);

              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => onSelectCalibration(cal)}
                  aria-pressed={isActive}
                  className={`group flex flex-col justify-between border bg-[#0A0B0F] p-6 text-left transition-colors duration-150 focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-2 ${
                    isActive
                      ? 'border-[#C8D9F0]/65 bg-[#0F121B]'
                      : 'border-white/[0.09] hover:border-white/[0.24] hover:bg-[#0D0F16]'
                  }`}
                >
                  <div className="w-full">
                    {/* Analytical Airy Thin-Film Interference Bar */}
                    <div
                      aria-hidden="true"
                      className="h-1.5 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${s0}, ${s1}, ${s2})`,
                      }}
                    />

                    <div className="mt-4 flex items-center justify-between gap-2 font-mono text-[11px] text-[#8A8F9D]">
                      <span className="truncate">{cal.coatingCode}</span>
                      <span className="shrink-0">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[#C8D9F0]">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Active
                          </span>
                        ) : cal.isPreset ? (
                          'Lab Preset'
                        ) : (
                          'Saved Run'
                        )}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-display text-lg font-medium tracking-[-0.015em] text-[#F4F5F7]">
                      {cal.name}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#8A8F9D]">
                      {cal.notes}
                    </p>
                  </div>

                  {/* Tabular Optical Spec Footer */}
                  <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-white/[0.08] pt-4 font-mono text-[11px] tabular-nums">
                    <div>
                      <div className="text-[#6F7584]">R_E</div>
                      <div className="mt-0.5 text-[#F4F5F7]">{cal.einsteinRadius.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-[#6F7584]">d-FILM</div>
                      <div className="mt-0.5 text-[#F4F5F7]">{Math.round(cal.filmThicknessNm)}nm</div>
                    </div>
                    <div>
                      <div className="text-[#6F7584]">Disp.</div>
                      <div className="mt-0.5 text-[#F4F5F7]">{cal.dispersion.toFixed(2)}×</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

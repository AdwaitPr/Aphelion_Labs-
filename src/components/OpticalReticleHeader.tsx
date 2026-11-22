import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { readTelemetry } from '../engine/telemetryBridge';
import type { TelemetrySnapshot } from '../types/calibration';

interface OpticalReticleHeaderProps {
  activeCalibrationName: string;
  isBenchOpen: boolean;
  onToggleBench: () => void;
}

export function OpticalReticleHeader({
  activeCalibrationName,
  isBenchOpen,
  onToggleBench,
}: OpticalReticleHeaderProps) {
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(() => readTelemetry());

  // Sample imperative telemetry bridge at ~15Hz without touching WebGL render loop
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = readTelemetry();
      setTelemetry((prev) => {
        if (
          prev.einsteinRadiusPx === next.einsteinRadiusPx &&
          prev.filmNm === next.filmNm &&
          prev.skylightDeg === next.skylightDeg &&
          prev.massBoost === next.massBoost &&
          prev.webglActive === next.webglActive
        ) {
          return prev;
        }
        return next;
      });
    }, 66);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-white/[0.09] bg-[#050507]/95">
      <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-6 px-4 sm:px-8">
        {/* Zone 1: Single-line Swiss brand wordmark */}
        <a
          href="#stage"
          className="font-display text-sm font-semibold tracking-[0.2em] text-[#F4F5F7] uppercase whitespace-nowrap shrink-0 focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-4"
        >
          Aphelion Labs
        </a>

        {/* Zone 2: Navigation links + compact monospaced optical reticle readout */}
        <div className="hidden items-center gap-8 md:flex">
          <nav aria-label="Primary sections" className="flex items-center gap-6 text-xs font-medium text-[#8A8F9D]">
            <a
              href="#stage"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F5F7]"
            >
              Stage
            </a>
            <a
              href="#architecture"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F5F7]"
            >
              Architecture
            </a>
            <a
              href="#verification"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F5F7]"
            >
              Verification
            </a>
            <a
              href="#archive"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F5F7]"
            >
              Archive
            </a>
          </nav>

          <div
            aria-label="Live optical reticle telemetry"
            className="hidden items-center gap-3 border-l border-white/[0.09] pl-6 font-mono text-[11px] tabular-nums text-[#8A8F9D] xl:flex"
          >
            <span className="whitespace-nowrap">
              θE <strong className="font-medium text-[#F4F5F7]">{telemetry.einsteinRadiusPx}px</strong>
            </span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span className="whitespace-nowrap">
              d-FILM <strong className="font-medium text-[#F4F5F7]">{telemetry.filmNm}nm</strong>
            </span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span className="max-w-[170px] truncate text-[#C8D9F0]" title={activeCalibrationName}>
              {activeCalibrationName}
            </span>
          </div>
        </div>

        {/* Zone 3: Single primary action trigger */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-foil-surface
            onClick={onToggleBench}
            aria-expanded={isBenchOpen}
            aria-controls="optical-bench-drawer"
            className="inline-flex h-9 items-center gap-2 border border-white/[0.14] bg-[#0A0B0F] px-3.5 text-xs font-medium text-[#F4F5F7] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-white/30 hover:bg-[#10121A] focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#C8D9F0]" aria-hidden="true" />
            <span>Optical Bench</span>
          </button>
        </div>
      </div>
    </header>
  );
}

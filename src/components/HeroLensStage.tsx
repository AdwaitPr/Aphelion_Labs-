import { ArrowDownRight, SlidersHorizontal } from 'lucide-react';
import type { OpticalParams } from '../types/calibration';

interface HeroLensStageProps {
  params: OpticalParams;
  activePresetName: string;
  webglActive: boolean;
  onOpenBench: () => void;
}

export function HeroLensStage({
  params,
  activePresetName,
  webglActive,
  onOpenBench,
}: HeroLensStageProps) {
  return (
    <section
      id="stage"
      className="relative flex min-h-[86vh] flex-col justify-between pt-28 pb-16 sm:pt-36 sm:pb-20"
    >
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-8">
        {/* Quiet Swiss Laboratory Kicker — unboxed metadata with typographic separators */}
        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[#8A8F9D]">
          <span>Zurich Optical Cryptography Division</span>
          <span aria-hidden="true" className="text-white/20">
            ·
          </span>
          <span>Active Coating: {activePresetName}</span>
          {!webglActive && (
            <>
              <span aria-hidden="true" className="text-white/20">
                ·
              </span>
              <span>Static Precision Mode</span>
            </>
          )}
        </div>

        {/* Hero Display Headline — Mirrored 1:1 into WebGL2 StageMirrorCanvas for physical Einstein-ring deflection */}
        <div className="max-w-5xl">
          <h1
            data-lens-mirror
            data-lens-color="#F4F5F7"
            className="font-display text-[clamp(2.75rem,6.2vw,5.65rem)] font-semibold leading-[1.03] tracking-[-0.032em] text-[#F4F5F7] text-balance"
          >
            Cryptographic silicon engineered to optical tolerances.
          </h1>
        </div>

        {/* Secondary editorial column and primary action */}
        <div className="mt-12 grid grid-cols-1 items-end gap-10 border-t border-white/[0.09] pt-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="max-w-xl text-base leading-relaxed text-[#A3A8B5] sm:text-[17px]">
              Aphelion Labs fabricates deterministic hardware roots of trust and borosilicate
              photonic interconnects verified on our live gravitational lensing bench. Glide across
              the headline above to inspect baseline deflection and grazing thin-film dispersion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:col-span-6 lg:justify-end">
            <button
              type="button"
              data-foil-surface
              onClick={onOpenBench}
              className="inline-flex h-11 items-center gap-2.5 border border-white/25 bg-[#F4F5F7] px-5 text-sm font-medium text-[#050507] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-white focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-3"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Calibrate Optical Stage</span>
            </button>

            <a
              href="#archive"
              className="inline-flex h-11 items-center gap-2 border border-white/[0.12] bg-[#0A0B0F] px-5 text-sm font-medium text-[#F4F5F7] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-white/30 hover:bg-[#11131B] focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-3"
            >
              <span>Inspect Calibration Archive</span>
              <ArrowDownRight className="h-4 w-4 text-[#8A8F9D]" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Hero Datum Strip & Interaction Cue */}
      <div className="mx-auto mt-16 w-full max-w-[1360px] px-4 sm:px-8">
        <div className="grid grid-cols-1 border-y border-white/[0.09] bg-[#0A0B0F]/85 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-white/[0.09] px-5 py-4 sm:border-r lg:border-b-0">
            <div className="font-mono text-[11px] text-[#8A8F9D]">Interaction Protocol</div>
            <div className="mt-1.5 font-mono text-xs font-medium tracking-wider text-[#F4F5F7] uppercase">
              Drag to Deflect · Hold to Increase Mass
            </div>
          </div>

          <div className="border-b border-white/[0.09] px-5 py-4 lg:border-r lg:border-b-0">
            <div className="font-mono text-[11px] text-[#8A8F9D]">Einstein Radius (R_E)</div>
            <div className="mt-1.5 font-mono text-sm font-medium tabular-nums text-[#F4F5F7]">
              {params.einsteinRadius.toFixed(3)}{' '}
              <span className="text-xs font-normal text-[#8A8F9D]">norm. rad</span>
            </div>
          </div>

          <div className="border-b border-white/[0.09] px-5 py-4 sm:border-r sm:border-b-0">
            <div className="font-mono text-[11px] text-[#8A8F9D]">Thin-Film Layer (d)</div>
            <div className="mt-1.5 font-mono text-sm font-medium tabular-nums text-[#F4F5F7]">
              {Math.round(params.filmThicknessNm)}{' '}
              <span className="text-xs font-normal text-[#8A8F9D]">
                nm · n={params.filmIor.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="font-mono text-[11px] text-[#8A8F9D]">Photonic Timing Jitter</div>
            <div className="mt-1.5 font-mono text-sm font-medium tabular-nums text-[#F4F5F7]">
              0.14{' '}
              <span className="text-xs font-normal text-[#8A8F9D]">ps RMS @ 4.2 K</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

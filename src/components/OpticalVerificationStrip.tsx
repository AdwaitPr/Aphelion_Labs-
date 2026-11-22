import { useEffect, useMemo, useState } from 'react';
import {
  computeCoatingSpectralSwatch,
  computeEinsteinDeflection,
  computeRingMask,
} from '../engine/opticalMath';
import { readTelemetry } from '../engine/telemetryBridge';
import type { OpticalParams } from '../types/calibration';

interface OpticalVerificationStripProps {
  params: OpticalParams;
}

type CompareMode = 'split' | 'lensed' | 'unlensed';

export function OpticalVerificationStrip({ params }: OpticalVerificationStripProps) {
  const [compareMode, setCompareMode] = useState<CompareMode>('split');
  const [probeX, setProbeX] = useState<number>(0.52);
  const [skylightDeg, setSkylightDeg] = useState<number>(14.0);

  // Sync scroll-driven skylight incidence angle at ~15Hz
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = readTelemetry();
      setSkylightDeg((prev) => (prev === t.skylightDeg ? prev : t.skylightDeg));
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  // Generate unlensed vs. physically deflected baseline paths using identical math as GLSL shader
  const baselinePaths = useMemo(() => {
    const width = 640;
    const height = 240;
    const aspect = width / height;
    const rows = [44, 82, 120, 158, 196];
    const samples = 64;
    const lensY = 0.5;

    return rows.map((rowY) => {
      const uvY = rowY / height;
      const unlensedPts: string[] = [];
      const lensedPts: string[] = [];

      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const px = u * width;
        unlensedPts.push(`${px.toFixed(1)},${rowY.toFixed(1)}`);

        const defl = computeEinsteinDeflection(
          u,
          uvY,
          probeX,
          lensY,
          aspect,
          params.einsteinRadius * 1.45,
          1.0,
          params.deflectionGain,
        );
        const lensedX = (u - defl.offsetX) * width;
        const lensedY = (uvY - defl.offsetY) * height;
        lensedPts.push(`${lensedX.toFixed(1)},${lensedY.toFixed(1)}`);
      }

      return {
        rowY,
        unlensed: `M ${unlensedPts.join(' L ')}`,
        lensed: `M ${lensedPts.join(' L ')}`,
      };
    });
  }, [probeX, params.einsteinRadius, params.deflectionGain]);

  const einsteinCirclePx = Math.round(params.einsteinRadius * 1.45 * 240);
  const peakRingWeight = computeRingMask(params.einsteinRadius, params.einsteinRadius);
  const spectralRimColor = computeCoatingSpectralSwatch(params.filmThicknessNm, params.filmIor, 0.42);
  const skylightRad = ((skylightDeg - 35) * Math.PI) / 180;
  const causticRayShift = Math.sin(skylightRad) * 68;

  return (
    <section id="verification" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 border-b border-white/[0.09] pb-8 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-xs text-[#8A8F9D]">02. Optical Verification Strip</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] text-[#F4F5F7] sm:text-4xl">
              Unlensed datum vs. relativistic baseline deflection.
            </h2>
          </div>

          {/* Functional Segmented Compare Control */}
          <div
            role="group"
            aria-label="Baseline comparison mode"
            className="inline-flex border border-white/[0.12] bg-[#0A0B0F] p-1 shrink-0"
          >
            {(
              [
                ['split', 'Overlay Compare'],
                ['lensed', 'Lensed Only'],
                ['unlensed', 'Unlensed Datum'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCompareMode(mode)}
                aria-pressed={compareMode === mode}
                className={`px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors duration-150 ${
                  compareMode === mode
                    ? 'bg-[#F4F5F7] font-medium text-[#050507]'
                    : 'text-[#8A8F9D] hover:text-[#F4F5F7]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Analytical Schematic Frame */}
        <div
          data-foil-surface
          className="grid grid-cols-1 border border-white/[0.10] bg-[#0A0B0F] lg:grid-cols-12"
        >
          {/* SVG Ray-Deflection Optical Bench */}
          <div className="relative border-b border-white/[0.09] p-6 lg:col-span-8 lg:border-r lg:border-b-0 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#8A8F9D]">
              <span>ANALYTICAL RAY BENCH · REGULARIZED POINT-MASS SOLVER</span>
              <span className="tabular-nums text-[#C8D9F0]">
                SKYLIGHT INCIDENCE {skylightDeg.toFixed(1)}°
              </span>
            </div>

            <div className="overflow-hidden border border-white/[0.08] bg-[#050507]">
              <svg
                viewBox="0 0 640 240"
                className="block h-auto w-full"
                role="img"
                aria-label="Comparison diagram of straight unlensed reference baselines versus curved gravitationally lensed baselines"
              >
                {/* Subtle scroll-tilted skylight caustic ray guides */}
                <g opacity={Math.min(0.42, 0.12 + params.causticIntensity * 0.2)}>
                  {[-120, -40, 40, 120].map((offset) => (
                    <line
                      key={offset}
                      x1={320 + offset + causticRayShift}
                      y1="0"
                      x2={320 + offset - causticRayShift * 0.6}
                      y2="240"
                      stroke={spectralRimColor}
                      strokeOpacity="0.22"
                      strokeWidth="1"
                    />
                  ))}
                </g>

                {/* Vertical fiducial grid */}
                {[80, 160, 240, 320, 400, 480, 560].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="240"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {/* Unlensed Reference Baselines */}
                {(compareMode === 'split' || compareMode === 'unlensed') &&
                  baselinePaths.map((row) => (
                    <path
                      key={`u-${row.rowY}`}
                      d={row.unlensed}
                      fill="none"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth="1"
                      strokeDasharray={compareMode === 'split' ? '4 4' : undefined}
                    />
                  ))}

                {/* Physically Lensed Baselines */}
                {(compareMode === 'split' || compareMode === 'lensed') &&
                  baselinePaths.map((row) => (
                    <path
                      key={`l-${row.rowY}`}
                      d={row.lensed}
                      fill="none"
                      stroke="#F4F5F7"
                      strokeWidth="1.4"
                    />
                  ))}

                {/* Einstein Ring & Grazing Thin-Film Fresnel Rim */}
                {compareMode !== 'unlensed' && (
                  <g>
                    <circle
                      cx={probeX * 640}
                      cy={120}
                      r={einsteinCirclePx}
                      fill="none"
                      stroke={spectralRimColor}
                      strokeWidth="1.5"
                      strokeOpacity="0.88"
                    />
                    <circle
                      cx={probeX * 640}
                      cy={120}
                      r={einsteinCirclePx * 1.45}
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="1"
                      strokeDasharray="2 5"
                    />
                    <line
                      x1={probeX * 640 - 7}
                      y1={120}
                      x2={probeX * 640 + 7}
                      y2={120}
                      stroke="#C8D9F0"
                      strokeWidth="1"
                    />
                    <line
                      x1={probeX * 640}
                      y1={113}
                      x2={probeX * 640}
                      y2={127}
                      stroke="#C8D9F0"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Interactive Lateral Aperture Scrubber */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="verification-probe-slider"
                className="font-mono text-xs text-[#8A8F9D] whitespace-nowrap"
              >
                Aperture Axis Position ({Math.round(probeX * 100)}%)
              </label>
              <div className="w-full sm:max-w-xs">
                <input
                  id="verification-probe-slider"
                  type="range"
                  min={0.18}
                  max={0.82}
                  step={0.01}
                  value={probeX}
                  onChange={(e) => setProbeX(Number(e.target.value))}
                  className="optical-slider"
                />
              </div>
            </div>
          </div>

          {/* Right Analytical Readout Column */}
          <div className="flex flex-col justify-between p-6 lg:col-span-4 sm:p-8">
            <div className="space-y-5">
              <div>
                <div className="font-mono text-[11px] text-[#8A8F9D]">
                  Optical Path Difference (2·n·d·cos θ)
                </div>
                <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[#F4F5F7]">
                  {Math.round(2 * params.filmIor * params.filmThicknessNm)}{' '}
                  <span className="text-xs font-normal text-[#8A8F9D]">nm normal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-[#8A8F9D]">Ring Boundary</div>
                  <div className="mt-1 text-sm text-[#F4F5F7]">{einsteinCirclePx} px</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8A8F9D]">Grazing Weight</div>
                  <div className="mt-1 text-sm text-[#F4F5F7]">{peakRingWeight.toFixed(2)} σ</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8A8F9D]">Cauchy Dispersion</div>
                  <div className="mt-1 text-sm text-[#F4F5F7]">
                    {params.dispersion.toFixed(2)}×
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8A8F9D]">Caustic Gain</div>
                  <div className="mt-1 text-sm text-[#F4F5F7]">
                    {params.causticIntensity.toFixed(2)}×
                  </div>
                </div>
              </div>

              {/* Thin-Film Spectral Sample Strip */}
              <div className="border-t border-white/[0.08] pt-5">
                <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-[#8A8F9D]">
                  <span>Airy Interference Spectrum (0° → 78°)</span>
                  <span>n={params.filmIor.toFixed(2)}</span>
                </div>
                <div
                  className="h-3 w-full border border-white/[0.12]"
                  style={{
                    background: `linear-gradient(90deg, ${computeCoatingSpectralSwatch(
                      params.filmThicknessNm,
                      params.filmIor,
                      0.98,
                    )}, ${computeCoatingSpectralSwatch(
                      params.filmThicknessNm,
                      params.filmIor,
                      0.72,
                    )}, ${computeCoatingSpectralSwatch(
                      params.filmThicknessNm,
                      params.filmIor,
                      0.45,
                    )}, ${computeCoatingSpectralSwatch(
                      params.filmThicknessNm,
                      params.filmIor,
                      0.2,
                    )})`,
                  }}
                />
              </div>
            </div>

            <p className="mt-6 border-t border-white/[0.08] pt-4 text-xs leading-relaxed text-[#8A8F9D]">
              Scrolling the page smoothly tilts the virtual skylight from 14° to 58°, shifting
              caustic refraction bands while maintaining sub-13% luminance for full typographic
              legibility.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

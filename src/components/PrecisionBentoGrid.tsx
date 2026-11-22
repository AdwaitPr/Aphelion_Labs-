import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { OpticalParams } from '../types/calibration';

interface BentoSpecCard {
  id: string;
  index: string;
  title: string;
  metricValue: string;
  metricUnit: string;
  summary: string;
  detail: string;
  colSpanClass: string;
  featuredFoil?: boolean;
  recommendedParams: Partial<OpticalParams>;
  schematic: 'ring' | 'lattice' | 'prism' | 'waveguide' | 'cryo' | 'array';
}

const BENTO_SPECS: BentoSpecCard[] = [
  {
    id: 'hsm-vault',
    index: '01',
    title: 'Deterministic Key Isolation Core',
    metricValue: '256-bit',
    metricUnit: 'zero-leakage enclave',
    summary:
      'Dual-rail masked logic cells fabricated on 5nm silicon-on-insulator substrates with physically verified electromagnetic isolation.',
    detail:
      'Measured side-channel SNR remains below -94 dB across 10^9 signing operations under continuous differential power probes.',
    colSpanClass: 'md:col-span-4',
    featuredFoil: true,
    recommendedParams: { einsteinRadius: 0.092, filmThicknessNm: 420, dispersion: 1.1 },
    schematic: 'ring',
  },
  {
    id: 'borosilicate-interconnect',
    index: '02',
    title: 'Borosilicate Photonic Bus',
    metricValue: '1.46',
    metricUnit: 'refractive index @ 1550 nm',
    summary:
      'Femtosecond-laser-inscribed waveguides inside annealed low-expansion borosilicate glass eliminate copper crosstalk between HSM blades.',
    detail:
      'Insertion loss holds under 0.08 dB/cm with thermal drift below 0.002 nm/K across laboratory operating envelopes.',
    colSpanClass: 'md:col-span-2',
    featuredFoil: true,
    recommendedParams: { einsteinRadius: 0.072, filmThicknessNm: 310, dispersion: 0.65 },
    schematic: 'waveguide',
  },
  {
    id: 'airy-coating',
    index: '03',
    title: 'Ion-Beam Thin-Film Deposition',
    metricValue: '±0.4',
    metricUnit: 'nm thickness tolerance',
    summary:
      'Multi-stack magnesium fluoride and tantala coatings suppress grazing surface scatter across visible and near-infrared verification bands.',
    detail:
      'Analytical Airy optical-path-difference metrology validates phase uniformity on every batch prior to vacuum sealing.',
    colSpanClass: 'md:col-span-2',
    recommendedParams: { einsteinRadius: 0.084, filmThicknessNm: 515, dispersion: 1.45 },
    schematic: 'prism',
  },
  {
    id: 'clock-mesh',
    index: '04',
    title: 'Optical Atomic Reference Mesh',
    metricValue: '1.2×10⁻¹⁵',
    metricUnit: 'Allan deviation @ 100s',
    summary:
      'Rubidium-disciplined photonic oscillators distribute sub-picosecond consensus epochs across geographically separated signing vaults.',
    detail:
      'Passive chromatic compensation preserves phase lock across 120 km dark-fiber spans without electronic regeneration.',
    colSpanClass: 'md:col-span-2',
    recommendedParams: { einsteinRadius: 0.098, filmThicknessNm: 465, dispersion: 1.0 },
    schematic: 'lattice',
  },
  {
    id: 'cryo-enclosure',
    index: '05',
    title: 'Cryogenic Silica Metrology Chamber',
    metricValue: '4.2',
    metricUnit: 'Kelvin closed-cycle',
    summary:
      'Active vibration-damped optical tables isolate superconducting single-photon detectors from seismic micro-tremors.',
    detail:
      'Thermal expansion approaches zero inside the fused-quartz inner cavity, holding focal alignment within 40 nanometers.',
    colSpanClass: 'md:col-span-2',
    recommendedParams: { einsteinRadius: 0.108, filmThicknessNm: 660, dispersion: 1.38 },
    schematic: 'cryo',
  },
  {
    id: 'zk-optical-array',
    index: '06',
    title: 'Zero-Knowledge Optical Verification Array',
    metricValue: '48.6',
    metricUnit: 'M proofs / sec per rack',
    summary:
      'Parallel interferometric matrix multipliers accelerate polynomial commitments with deterministic hardware attestation logs.',
    detail:
      'Every optical lane records continuous baseline deflection telemetry to detect physical tampering at the micrometer scale.',
    colSpanClass: 'md:col-span-6',
    featuredFoil: true,
    recommendedParams: { einsteinRadius: 0.128, filmThicknessNm: 585, dispersion: 1.75 },
    schematic: 'array',
  },
];

function BentoSchematic({ kind }: { kind: BentoSpecCard['schematic'] }) {
  switch (kind) {
    case 'ring':
      return (
        <svg viewBox="0 0 180 72" className="h-14 w-36 text-white/35" aria-hidden="true">
          <line x1="0" y1="36" x2="180" y2="36" stroke="currentColor" strokeOpacity="0.28" />
          <line x1="90" y1="4" x2="90" y2="68" stroke="currentColor" strokeOpacity="0.28" />
          <circle cx="90" cy="36" r="24" fill="none" stroke="currentColor" strokeOpacity="0.7" />
          <circle
            cx="90"
            cy="36"
            r="14"
            fill="none"
            stroke="#C8D9F0"
            strokeOpacity="0.65"
            strokeDasharray="3 3"
          />
          <circle cx="90" cy="36" r="2.5" fill="#F4F5F7" />
        </svg>
      );
    case 'waveguide':
      return (
        <svg viewBox="0 0 140 72" className="h-14 w-28 text-white/35" aria-hidden="true">
          <path d="M4 18 C48 18, 56 36, 136 36" fill="none" stroke="currentColor" strokeOpacity="0.6" />
          <path d="M4 36 C56 36, 78 36, 136 36" fill="none" stroke="#C8D9F0" strokeOpacity="0.8" />
          <path d="M4 54 C48 54, 56 36, 136 36" fill="none" stroke="currentColor" strokeOpacity="0.6" />
          <rect x="64" y="24" width="12" height="24" fill="none" stroke="currentColor" strokeOpacity="0.5" />
        </svg>
      );
    case 'prism':
      return (
        <svg viewBox="0 0 140 72" className="h-14 w-28 text-white/35" aria-hidden="true">
          <polygon points="70,10 106,62 34,62" fill="none" stroke="currentColor" strokeOpacity="0.7" />
          <line x1="8" y1="44" x2="54" y2="36" stroke="#F4F5F7" strokeOpacity="0.7" />
          <line x1="86" y1="36" x2="132" y2="26" stroke="#C8D9F0" strokeOpacity="0.75" />
          <line x1="86" y1="38" x2="132" y2="48" stroke="currentColor" strokeOpacity="0.45" />
        </svg>
      );
    case 'lattice':
      return (
        <svg viewBox="0 0 140 72" className="h-14 w-28 text-white/35" aria-hidden="true">
          {[18, 46, 74, 102, 122].map((x) => (
            <line key={x} x1={x} y1="10" x2={x} y2="62" stroke="currentColor" strokeOpacity="0.24" />
          ))}
          <polyline
            points="10,48 34,26 58,44 82,18 106,40 130,28"
            fill="none"
            stroke="#C8D9F0"
            strokeOpacity="0.8"
          />
        </svg>
      );
    case 'cryo':
      return (
        <svg viewBox="0 0 140 72" className="h-14 w-28 text-white/35" aria-hidden="true">
          <rect x="20" y="12" width="100" height="48" fill="none" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="36" y="22" width="68" height="28" fill="none" stroke="#C8D9F0" strokeOpacity="0.65" />
          <line x1="20" y1="36" x2="120" y2="36" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2 4" />
        </svg>
      );
    case 'array':
      return (
        <svg viewBox="0 0 320 64" className="h-14 w-full max-w-[300px] text-white/35" aria-hidden="true">
          {[14, 26, 38, 50].map((y) => (
            <path
              key={y}
              d={`M0 ${y} Q 160 ${y + (y - 32) * 0.45} 320 ${y}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.45"
            />
          ))}
          <circle cx="160" cy="32" r="22" fill="none" stroke="#C8D9F0" strokeOpacity="0.7" />
          <circle cx="160" cy="32" r="10" fill="none" stroke="#F4F5F7" strokeOpacity="0.55" />
        </svg>
      );
  }
}

interface PrecisionBentoGridProps {
  onPreviewOpticalProfile: (params: Partial<OpticalParams>, label: string) => void;
}

export function PrecisionBentoGrid({ onPreviewOpticalProfile }: PrecisionBentoGridProps) {
  const [selectedId, setSelectedId] = useState<string>(BENTO_SPECS[0].id);

  return (
    <section id="architecture" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        {/* Swiss Section Header */}
        <div className="mb-12 flex flex-col justify-between gap-6 border-b border-white/[0.09] pb-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs text-[#8A8F9D]">01. Hardware &amp; Optical Architecture</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] text-[#F4F5F7] sm:text-4xl">
              Machined tolerances across six verification layers.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#8A8F9D]">
            Select any hardware subsystem below to spring the live stage lens into its corresponding
            metrology coating profile.
          </p>
        </div>

        {/* 6-Cell Asymmetrical Precision Bento Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {BENTO_SPECS.map((card) => {
            const isSelected = selectedId === card.id;
            return (
              <article
                key={card.id}
                data-foil-surface={card.featuredFoil ? '' : undefined}
                className={`${card.colSpanClass} group relative flex flex-col justify-between overflow-hidden border bg-[#0A0B0F] p-6 transition-colors duration-200 ${
                  isSelected
                    ? 'border-white/28 bg-[#0E1017]'
                    : 'border-white/[0.09] hover:border-white/[0.20]'
                }`}
              >
                {/* Cursor-normal specular anodized sheen */}
                {card.featuredFoil && (
                  <div
                    aria-hidden="true"
                    className="foil-specular-sheen pointer-events-none absolute inset-0"
                  />
                )}

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="font-mono text-xs text-[#8A8F9D]">
                    <span>{card.index}</span>
                    <span aria-hidden="true" className="mx-2 text-white/20">
                      /
                    </span>
                    <span className={isSelected ? 'text-[#C8D9F0]' : 'text-[#8A8F9D]'}>
                      {isSelected ? 'Active Optics' : 'Subsystem'}
                    </span>
                  </div>
                  <BentoSchematic kind={card.schematic} />
                </div>

                <div className="relative z-10 mt-6">
                  <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                    <span className="text-2xl font-semibold tracking-tight text-[#F4F5F7] sm:text-3xl">
                      {card.metricValue}
                    </span>
                    <span className="text-xs text-[#8A8F9D]">{card.metricUnit}</span>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-medium tracking-[-0.015em] text-[#F4F5F7]">
                    {card.title}
                  </h3>

                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#9DA3B0]">
                    {card.summary}
                  </p>

                  <p className="mt-3 border-t border-white/[0.07] pt-3 text-xs leading-relaxed text-[#777D8B]">
                    {card.detail}
                  </p>
                </div>

                <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                  <span className="font-mono text-[11px] tabular-nums text-[#8A8F9D]">
                    {card.recommendedParams.filmThicknessNm} nm · R_E{' '}
                    {card.recommendedParams.einsteinRadius?.toFixed(3)}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(card.id);
                      onPreviewOpticalProfile(card.recommendedParams, card.title);
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#F4F5F7] transition-colors duration-150 hover:text-[#C8D9F0] focus-visible:outline-1 focus-visible:outline-[#C8D9F0] focus-visible:outline-offset-4"
                  >
                    <span>{isSelected ? 'Profile Loaded' : 'Load Profile'}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

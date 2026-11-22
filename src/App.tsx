import { useCallback, useEffect, useRef, useState } from 'react';
import { CalibrationArchive } from './components/CalibrationArchive';
import { HeroLensStage } from './components/HeroLensStage';
import { OpticalBenchDrawer } from './components/OpticalBenchDrawer';
import { OpticalReticleHeader } from './components/OpticalReticleHeader';
import { OpticalVerificationStrip } from './components/OpticalVerificationStrip';
import { PrecisionBentoGrid } from './components/PrecisionBentoGrid';
import { FoilSyncManager } from './engine/foilSync';
import { DEFAULT_OPTICAL_PARAMS, SEEDED_CALIBRATIONS } from './engine/opticalMath';
import { OpticalStageEngine } from './engine/OpticalStageEngine';
import type {
  CalibrationCreateInput,
  OpticalCalibration,
  OpticalParams,
} from './types/calibration';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<OpticalStageEngine | null>(null);
  const foilRef = useRef<FoilSyncManager | null>(null);

  const [webglActive, setWebglActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [params, setParams] = useState<OpticalParams>({ ...DEFAULT_OPTICAL_PARAMS });
  const [calibrations, setCalibrations] = useState<OpticalCalibration[]>([]);
  const [activeCalibrationId, setActiveCalibrationId] = useState<string | null>(
    SEEDED_CALIBRATIONS[0].id,
  );
  const [activeLabel, setActiveLabel] = useState<string>(SEEDED_CALIBRATIONS[0].name);
  const [loadingArchive, setLoadingArchive] = useState(true);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isBenchOpen, setIsBenchOpen] = useState(false);

  // Mount imperative WebGL2 OpticalStageEngine & FoilSyncManager once (React 19 StrictMode safe)
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new OpticalStageEngine(mountEl, DEFAULT_OPTICAL_PARAMS);
    engineRef.current = engine;
    const status = engine.getStatus();
    setWebglActive(status.webglSupported);
    setReducedMotion(status.reducedMotion);

    const foil = new FoilSyncManager();
    foilRef.current = foil;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      motionQuery.removeEventListener('change', onMotionChange);
      foil.dispose();
      foilRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Push updated optical parameters imperatively into the Three.js uniform springs
  useEffect(() => {
    engineRef.current?.setTargetParams(params, false);
  }, [params]);

  // Fetch persisted calibrations from Express backend
  const fetchCalibrations = useCallback(async () => {
    setLoadingArchive(true);
    setArchiveError(null);
    try {
      const response = await fetch('/api/calibrations');
      if (!response.ok) {
        throw new Error(`Archive request returned HTTP ${response.status}.`);
      }
      const data = (await response.json()) as { calibrations?: OpticalCalibration[] };
      const list = Array.isArray(data.calibrations) ? data.calibrations : [];
      setCalibrations(list);

      if (list.length > 0) {
        const first = list[0];
        setActiveCalibrationId((prev) => prev ?? first.id);
      }
    } catch (err) {
      setArchiveError(
        err instanceof Error ? err.message : 'Unable to reach optical calibration archive.',
      );
    } finally {
      setLoadingArchive(false);
    }
  }, []);

  useEffect(() => {
    fetchCalibrations();
  }, [fetchCalibrations]);

  // Re-invalidate mirrored typography when archive layout finishes rendering
  useEffect(() => {
    engineRef.current?.invalidateMirror();
    foilRef.current?.scan();
  }, [calibrations.length, loadingArchive]);

  // Escape key closes Optical Bench drawer
  useEffect(() => {
    if (!isBenchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBenchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBenchOpen]);

  const handleSelectCalibration = useCallback((cal: OpticalCalibration) => {
    setActiveCalibrationId(cal.id);
    setActiveLabel(cal.name);
    setParams({
      einsteinRadius: cal.einsteinRadius,
      filmThicknessNm: cal.filmThicknessNm,
      filmIor: cal.filmIor,
      dispersion: cal.dispersion,
      causticIntensity: cal.causticIntensity,
      deflectionGain: cal.deflectionGain,
    });
  }, []);

  const handleManualParamsChange = useCallback((next: OpticalParams) => {
    setActiveCalibrationId(null);
    setActiveLabel('Custom Bench');
    setParams(next);
  }, []);

  const handlePreviewSubsystem = useCallback(
    (partial: Partial<OpticalParams>, subsystemTitle: string) => {
      setActiveCalibrationId(null);
      setActiveLabel(subsystemTitle);
      setParams((prev) => ({
        ...prev,
        ...partial,
      }));
    },
    [],
  );

  const handleSaveCalibration = useCallback(
    async (input: CalibrationCreateInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/calibrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = (await response.json()) as {
          calibration?: OpticalCalibration;
          calibrations?: OpticalCalibration[];
          error?: string;
        };

        if (!response.ok || !data.calibration) {
          return {
            ok: false,
            error: data.error ?? 'Calibration could not be saved.',
          };
        }

        if (Array.isArray(data.calibrations)) {
          setCalibrations(data.calibrations);
        } else {
          setCalibrations((prev) => [...prev, data.calibration!]);
        }

        setActiveCalibrationId(data.calibration.id);
        setActiveLabel(data.calibration.name);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Network error while saving calibration.',
        };
      }
    },
    [],
  );

  const mirrorActive = webglActive && !reducedMotion;

  return (
    <div
      data-webgl-ready={webglActive ? 'true' : 'false'}
      data-active-calibration={activeLabel}
      className={`relative min-h-screen bg-[#050507] text-[#F4F5F7] ${
        mirrorActive ? 'lens-mirror-active' : ''
      }`}
    >
      {/* Dedicated isolated WebGL2 canvas mount — zero React siblings inside */}
      <div
        ref={canvasMountRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      />

      {/* Top Architectural Optical Reticle Header */}
      <OpticalReticleHeader
        activeCalibrationName={activeLabel}
        isBenchOpen={isBenchOpen}
        onToggleBench={() => setIsBenchOpen((prev) => !prev)}
      />

      {/* Main Scrolling Editorial Stage */}
      <main className="relative z-10">
        <HeroLensStage
          params={params}
          activePresetName={activeLabel}
          webglActive={webglActive}
          onOpenBench={() => setIsBenchOpen(true)}
        />

        <PrecisionBentoGrid onPreviewOpticalProfile={handlePreviewSubsystem} />

        <OpticalVerificationStrip params={params} />

        <CalibrationArchive
          calibrations={calibrations}
          activeCalibrationId={activeCalibrationId}
          loading={loadingArchive}
          error={archiveError}
          onRetry={fetchCalibrations}
          onSelectCalibration={handleSelectCalibration}
          onOpenBench={() => setIsBenchOpen(true)}
        />
      </main>

      {/* Quiet Swiss Editorial Footer */}
      <footer className="relative z-10 border-t border-white/[0.09] bg-[#050507]">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-4 px-4 py-10 text-xs text-[#8A8F9D] sm:flex-row sm:items-center sm:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display font-semibold tracking-[0.18em] text-[#F4F5F7] uppercase">
              Aphelion Labs
            </span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span>Zurich &amp; Wetzlar Optical Hardware Foundry</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono text-[11px]">
            <a href="#stage" className="transition-colors hover:text-[#F4F5F7]">
              Stage
            </a>
            <a href="#architecture" className="transition-colors hover:text-[#F4F5F7]">
              Architecture
            </a>
            <a href="#verification" className="transition-colors hover:text-[#F4F5F7]">
              Verification
            </a>
            <a href="#archive" className="transition-colors hover:text-[#F4F5F7]">
              Archive
            </a>
            <span className="text-[#5B606E]">© 2026 Aphelion Labs AG</span>
          </div>
        </div>
      </footer>

      {/* Slide-out Optical Bench Calibration Drawer */}
      <OpticalBenchDrawer
        isOpen={isBenchOpen}
        params={params}
        calibrations={calibrations}
        activeCalibrationId={activeCalibrationId}
        onClose={() => setIsBenchOpen(false)}
        onChangeParams={handleManualParamsChange}
        onSelectCalibration={handleSelectCalibration}
        onSaveCalibration={handleSaveCalibration}
      />
    </div>
  );
}

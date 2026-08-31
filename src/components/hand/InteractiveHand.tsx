import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cx } from '@/lib/utils';
import { HandController, type ARInput, type PointerInput } from './handController';
import type { ARHandController, ARStatus } from './arController';
import { HandFallback } from './HandFallback';

/** three.js and the whole scene stay out of the initial bundle. */
const HandScene = lazy(() => import('./HandScene'));

interface Props {
  /** Element the pointer is measured against — normally the hero. */
  trackingTargetRef: React.RefObject<HTMLElement>;
  className?: string;
  /** Renders the AR toggle. Enabled on the mobile hero only. */
  showArButton?: boolean;
  /** Start AR as soon as the hero is visible, without waiting for a tap. */
  autoStartAr?: boolean;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

export function InteractiveHand({
  trackingTargetRef,
  className,
  showArButton = false,
  autoStartAr = false,
}: Props) {
  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  const [arStatus, setArStatus] = useState<ARStatus>('idle');
  const [arMessage, setArMessage] = useState<string | null>(null);
  const arControllerRef = useRef<ARHandController | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerInput>({ x: 0, y: 0, active: false });
  const arRef = useRef<ARInput | null>(null);

  const controller = useMemo(() => new HandController(reducedMotion), [reducedMotion]);
  const [sceneActive, setSceneActive] = useState(true);

  useEffect(() => {
    controller.setReducedMotion(reducedMotion);
  }, [controller, reducedMotion]);

  // Capability check + deferred mount: the 3D system starts only once the hero
  // is actually on screen.
  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMounted(true);
        setSceneActive(entry.isIntersecting);
      },
      { threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Pause rendering when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setSceneActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Pointer tracking, normalised against the hero rather than the window so the
  // hand stays elegant at the edges of the screen.
  useEffect(() => {
    const target = trackingTargetRef.current;
    if (!target) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = target.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      pointerRef.current.x = Math.max(-1, Math.min(1, x));
      pointerRef.current.y = Math.max(-1, Math.min(1, y));
      pointerRef.current.active = true;
    };

    const onLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    target.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [trackingTargetRef]);

  const stopAr = useCallback(async () => {
    const ar = arControllerRef.current;
    if (!ar) return;
    await ar.stop();
    arRef.current = null;
    arControllerRef.current = null;
    setArStatus('idle');
    setArMessage(null);
  }, []);

  const startAr = useCallback(async () => {
    if (arControllerRef.current) return;
    setArMessage(null);
    setArStatus('starting');
    try {
      const { ARHandController: Controller } = await import('./arController');
      const ar = new Controller((status, message) => {
        setArStatus(status);
        if (message) setArMessage(message);
      });
      arControllerRef.current = ar;
      arRef.current = ar.input;
      await ar.start();
      if (ar.status === 'unavailable' || ar.status === 'denied') {
        arRef.current = null;
        arControllerRef.current = null;
      }
    } catch {
      arRef.current = null;
      arControllerRef.current = null;
      setArStatus('unavailable');
      setArMessage('AR interaction is unavailable on this device.');
    }
  }, []);

  /**
   * Mobile: start AR without waiting for a tap.
   *
   * The browser still shows its own camera permission prompt — no site can skip
   * that — so this moves the prompt to load time rather than removing it. It
   * waits until the hero is actually on screen, runs once, and stays silent if
   * permission is refused: the normal 3D hand simply keeps running.
   */
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStartAr || autoStarted.current) return;
    if (!mounted || !sceneActive || reducedMotion) return;
    autoStarted.current = true;
    void startAr();
  }, [autoStartAr, mounted, sceneActive, reducedMotion, startAr]);

  // Always release the camera when the hand unmounts.
  useEffect(() => () => void arControllerRef.current?.stop(), []);

  const arOn = arStatus === 'tracking' || arStatus === 'searching' || arStatus === 'starting';

  return (
    <div ref={containerRef} className={cx('relative', className)}>
      {/* No backdrop: the hand sits directly on the page's black. Anything
          behind it — glow, arcs, grain — competed with the model instead of
          supporting it. */}

      {/* ---- Hand ----
          Masked so the wrist dissolves into the page instead of ending on a
          hard cut. The mask is on the wrapper, not the canvas, so it survives
          the fallback and the AR states too. */}
      <div
        className="relative h-full w-full"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 95%)',
          maskImage:
            'linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 95%)',
        }}
      >
        {webglOk === false || failed ? (
          <HandFallback reason={failed ? 'error' : 'unsupported'} />
        ) : (
          mounted && (
            <ErrorGate onError={() => setFailed(true)}>
              <Suspense fallback={<HandFallback reason="loading" />}>
                <HandScene
                  controller={controller}
                  pointerRef={pointerRef}
                  arRef={arRef}
                  active={sceneActive}
                  reducedMotion={reducedMotion}
                />
              </Suspense>
            </ErrorGate>
          )
        )}
      </div>

      {showArButton && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => (arOn ? void stopAr() : void startAr())}
            disabled={arStatus === 'unavailable'}
            aria-describedby="ar-hint"
            className={cx(
              'liquid-glass btn rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]',
              'text-white/85 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {arStatus === 'starting' ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : arOn ? (
              <CameraOff size={14} aria-hidden="true" />
            ) : (
              <Camera size={14} aria-hidden="true" />
            )}
            {arOn ? 'Exit AR' : autoStartAr ? 'Retry AR' : 'Enable AR'}
          </button>

          <p id="ar-hint" className="max-w-[16rem] text-center text-[11px] leading-relaxed text-white/35">
            {arMessage ??
              (arStatus === 'tracking'
                ? 'Tracking your hand.'
                : arStatus === 'searching'
                  ? 'Hold your hand up to the camera.'
                  : arStatus === 'starting'
                    ? 'Starting the camera…'
                    : 'Uses your camera to mirror your real hand. Nothing is uploaded.')}
          </p>
        </div>
      )}
    </div>
  );
}

/** Keeps a WebGL or model failure inside the hand instead of the whole page. */
class ErrorGate extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

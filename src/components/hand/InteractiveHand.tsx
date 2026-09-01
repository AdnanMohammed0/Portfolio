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
import { Smartphone } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cx } from '@/lib/utils';
import { HandController, type PointerInput } from './handController';
import { TiltController, type TiltStatus } from './tiltController';
import { HandFallback } from './HandFallback';

/** three.js and the whole scene stay out of the initial bundle. */
const HandScene = lazy(() => import('./HandScene'));

interface Props {
  /** Element the pointer is measured against — normally the hero. */
  trackingTargetRef: React.RefObject<HTMLElement>;
  className?: string;
  /**
   * Drive the hand from the device's orientation sensor instead of a pointer.
   * Enabled on touch devices, where there is no cursor to follow.
   */
  useTilt?: boolean;
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

export function InteractiveHand({ trackingTargetRef, className, useTilt = false }: Props) {
  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [tiltStatus, setTiltStatus] = useState<TiltStatus>('idle');

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerInput>({ x: 0, y: 0, active: false });
  const tiltRef = useRef<TiltController | null>(null);

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

  /**
   * Pause rendering when the tab is hidden.
   *
   * `?nopause=1` disables this in development only — some embedded browsers
   * report `document.hidden` permanently, which otherwise makes the hand
   * impossible to observe while working on it.
   */
  useEffect(() => {
    const ignoreHidden =
      import.meta.env.DEV && new URLSearchParams(window.location.search).has('nopause');
    if (ignoreHidden) {
      setSceneActive(true);
      return;
    }
    const onVisibility = () => setSceneActive(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Pointer tracking, normalised against the hero rather than the window so the
  // hand stays elegant at the edges of the screen.
  useEffect(() => {
    if (useTilt) return;
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
  }, [trackingTargetRef, useTilt]);

  const startTilt = useCallback(async () => {
    if (tiltRef.current) return;
    const tilt = new TiltController(setTiltStatus);
    tiltRef.current = tilt;
    await tilt.start();
  }, []);

  /**
   * Device orientation drives the hand on touch devices. Android exposes the
   * sensor without any permission, so this starts on its own. iOS gates it
   * behind a user gesture, which surfaces as a single small button.
   */
  useEffect(() => {
    if (!useTilt || reducedMotion || !mounted) return;
    if (TiltController.needsPermission) {
      setTiltStatus('needs-permission');
      return;
    }
    void startTilt();
    return () => {
      tiltRef.current?.stop();
      tiltRef.current = null;
    };
  }, [useTilt, reducedMotion, mounted, startTilt]);

  // Feed the sensor into the same normalised input the mouse writes to, so the
  // springs, banking and finger ripple all apply unchanged.
  useEffect(() => {
    if (!useTilt) return;
    let raf = 0;
    const pump = () => {
      raf = requestAnimationFrame(pump);
      const tilt = tiltRef.current;
      if (!tilt || tilt.status !== 'active') return;
      pointerRef.current.x = tilt.reading.x;
      pointerRef.current.y = tilt.reading.y;
      pointerRef.current.active = true;
    };
    raf = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(raf);
  }, [useTilt]);

  useEffect(() => () => tiltRef.current?.stop(), []);

  return (
    <div ref={containerRef} className={cx('relative', className)}>
      {/* No backdrop: the hand sits directly on the page's black. Anything
          behind it — glow, arcs, grain — competed with the model instead of
          supporting it. */}

      {/* ---- Hand ----
          Masked so the wrist dissolves into the page instead of ending on a
          hard cut. The mask is on the wrapper, not the canvas, so it survives
          the fallback states too. */}
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
                  active={sceneActive}
                  reducedMotion={reducedMotion}
                />
              </Suspense>
            </ErrorGate>
          )
        )}
      </div>

      {/* iOS only: motion access needs a tap. Everywhere else the hand simply
          responds to the phone, with nothing to press and nothing to grant. */}
      {useTilt && tiltStatus === 'needs-permission' && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <button
            type="button"
            onClick={() => void startTilt()}
            className="liquid-glass btn rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-white/85"
          >
            <Smartphone size={14} aria-hidden="true" />
            Move with my phone
          </button>
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

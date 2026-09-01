import { clamp, damp } from '@/lib/utils';

/**
 * Device-orientation input for the hand.
 *
 * On a phone there is no pointer, so the hand tracks how the device is being
 * held instead. Tilt maps onto the same normalised [-1, 1] range the mouse
 * produces, which means it feeds straight into the existing pointer path and
 * inherits the springs, banking and finger ripple for free.
 *
 * This replaces the camera-based AR entirely: no permission prompt on Android,
 * no MediaPipe download, and it works on every phone rather than only ones with
 * a usable front camera.
 */

export type TiltStatus = 'idle' | 'active' | 'needs-permission' | 'unavailable';

/** Degrees of tilt that map to the full range of movement. */
const RANGE_DEGREES = 32;

interface Reading {
  /** Left/right tilt, -1 to 1. */
  x: number;
  /** Forward/back tilt, -1 to 1. */
  y: number;
}

export class TiltController {
  status: TiltStatus = 'idle';
  readonly reading: Reading = { x: 0, y: 0 };

  /** Neutral position, captured from the first reading. */
  private origin: { beta: number; gamma: number } | null = null;
  private listening = false;
  private lastEventAt = 0;

  constructor(private onStatus: (status: TiltStatus) => void) {}

  private setStatus(status: TiltStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.onStatus(status);
  }

  /** True when the platform gates motion access behind a user gesture (iOS 13+). */
  static get needsPermission(): boolean {
    const ctor = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    return typeof ctor?.requestPermission === 'function';
  }

  static get isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  async start(): Promise<void> {
    if (this.listening) return;

    if (!TiltController.isSupported) {
      this.setStatus('unavailable');
      return;
    }

    // iOS requires an explicit grant, and the call must originate from a tap.
    if (TiltController.needsPermission) {
      try {
        const ctor = window.DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<PermissionState>;
        };
        const result = await ctor.requestPermission();
        if (result !== 'granted') {
          this.setStatus('needs-permission');
          return;
        }
      } catch {
        // Throws when called outside a user gesture — ask for a tap instead.
        this.setStatus('needs-permission');
        return;
      }
    }

    window.addEventListener('deviceorientation', this.onOrientation, true);
    this.listening = true;

    /**
     * Some devices register the listener but never fire it — a desktop browser
     * pretending to be mobile, or a phone with the sensor disabled. Give up
     * quietly rather than leaving the hand frozen waiting for data.
     */
    window.setTimeout(() => {
      if (this.listening && this.lastEventAt === 0) {
        this.stop();
        this.setStatus('unavailable');
      }
    }, 1500);
  }

  private onOrientation = (event: DeviceOrientationEvent): void => {
    const { beta, gamma } = event;
    if (beta === null || gamma === null) return;

    this.lastEventAt = performance.now();

    // The first reading becomes neutral, so the hand is centred however the
    // visitor happens to be holding the phone.
    if (!this.origin) {
      this.origin = { beta, gamma };
      this.setStatus('active');
    }

    const deltaGamma = wrapDegrees(gamma - this.origin.gamma);
    const deltaBeta = wrapDegrees(beta - this.origin.beta);

    this.reading.x = clamp(deltaGamma / RANGE_DEGREES, -1, 1);
    this.reading.y = clamp(deltaBeta / RANGE_DEGREES, -1, 1);
  };

  /**
   * Slowly re-centres the neutral point, so a visitor who gradually changes
   * posture does not end up with the hand pinned to one side.
   */
  recentre(dt: number): void {
    if (!this.origin) return;
    this.origin.beta = damp(this.origin.beta, this.origin.beta + this.reading.y * 2, 0.08, dt);
    this.origin.gamma = damp(this.origin.gamma, this.origin.gamma + this.reading.x * 2, 0.08, dt);
  }

  stop(): void {
    if (!this.listening) return;
    window.removeEventListener('deviceorientation', this.onOrientation, true);
    this.listening = false;
    this.origin = null;
    this.reading.x = 0;
    this.reading.y = 0;
    this.setStatus('idle');
  }
}

/** Keeps an angle difference in [-180, 180] so a wrap-around is not a huge jump. */
function wrapDegrees(value: number): number {
  let v = value;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
}

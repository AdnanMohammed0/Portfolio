import { clamp } from '@/lib/utils';
import { FINGERS, makeCurlMap, type CurlMap, type FingerName } from './handRig';
import type { ARInput } from './handController';

/**
 * Optional AR hand tracking.
 *
 * Everything here — including the MediaPipe bundle — is dynamically imported
 * and only ever runs after the visitor explicitly presses "Enable AR". The
 * camera is never opened on page load, and `stop()` fully releases the stream.
 */

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type ARStatus = 'idle' | 'starting' | 'tracking' | 'searching' | 'unavailable' | 'denied';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** MediaPipe landmark indices for each finger: [mcp, pip, dip, tip]. */
const FINGER_LANDMARKS: Record<FingerName, [number, number, number, number]> = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Curl estimated from how much shorter the finger is end-to-end than the sum of
 * its segments. Cheap, and far more stable than per-joint angle estimation.
 */
function estimateCurl(landmarks: Landmark[], finger: FingerName): number {
  const [mcp, pip, dip, tip] = FINGER_LANDMARKS[finger].map((i) => landmarks[i]);
  const chain = distance(mcp, pip) + distance(pip, dip) + distance(dip, tip);
  if (chain === 0) return 0;
  const straightness = distance(mcp, tip) / chain;
  // ~0.95 when extended, ~0.4 when fully closed.
  return clamp((0.95 - straightness) / 0.5, 0, 1);
}

export class ARHandController {
  status: ARStatus = 'idle';
  readonly input: ARInput = {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    curl: makeCurlMap(0.15),
  };

  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => unknown; close: () => void } | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private running = false;

  constructor(private onStatus: (status: ARStatus, message?: string) => void) {}

  private setStatus(status: ARStatus, message?: string): void {
    this.status = status;
    this.onStatus(status, message);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.setStatus('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      this.running = false;
      this.setStatus('unavailable', 'AR interaction is unavailable on this device.');
      return;
    }

    try {
      // 1. Camera permission — only ever reached from an explicit user action.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (error) {
      this.running = false;
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      this.setStatus(
        denied ? 'denied' : 'unavailable',
        denied
          ? 'Camera access was denied. AR interaction is unavailable.'
          : 'AR interaction is unavailable on this device.',
      );
      return;
    }

    try {
      // 2. Camera element.
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = this.stream;
      await video.play();
      this.video = video;

      // 3. Hand tracking — imported only now, never in the main bundle.
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.landmarker = landmarker as unknown as ARHandController['landmarker'];

      this.setStatus('searching');
      this.loop();
    } catch {
      await this.stop();
      this.setStatus('unavailable', 'AR interaction is unavailable on this device.');
    }
  }

  private loop = (): void => {
    if (!this.running || !this.video || !this.landmarker) return;
    this.raf = requestAnimationFrame(this.loop);

    const video = this.video;
    if (video.currentTime === this.lastVideoTime || video.readyState < 2) return;
    this.lastVideoTime = video.currentTime;

    let result: { landmarks?: Landmark[][] } | undefined;
    try {
      result = this.landmarker.detectForVideo(video, performance.now()) as {
        landmarks?: Landmark[][];
      };
    } catch {
      return;
    }

    const landmarks = result?.landmarks?.[0];
    if (!landmarks || landmarks.length < 21) {
      this.input.active = false;
      if (this.status === 'tracking') this.setStatus('searching');
      return;
    }

    if (this.status !== 'tracking') this.setStatus('tracking');
    this.applyLandmarks(landmarks);
  };

  private applyLandmarks(landmarks: Landmark[]): void {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];

    // Position: mirrored so moving right moves the virtual hand right.
    const x = (0.5 - wrist.x) * 2;
    const y = (0.5 - wrist.y) * 2;
    // Hand span stands in for depth.
    const span = Math.hypot(indexMcp.x - pinkyMcp.x, indexMcp.y - pinkyMcp.y);
    const z = clamp((span - 0.16) * 6, -1, 1);

    // Orientation from the palm axis.
    const axisX = middleMcp.x - wrist.x;
    const axisY = middleMcp.y - wrist.y;
    const roll = Math.atan2(-axisX, -axisY);
    const yaw = clamp((pinkyMcp.z - indexMcp.z) * 6, -1.2, 1.2);
    const pitch = clamp((middleMcp.z - wrist.z) * 5, -1, 1);

    const curl: CurlMap = makeCurlMap(0);
    for (const finger of FINGERS) {
      curl[finger] = estimateCurl(landmarks, finger);
    }

    // Light smoothing here; the HandController damps further downstream.
    const s = 0.35;
    this.input.x += (x - this.input.x) * s;
    this.input.y += (y - this.input.y) * s;
    this.input.z += (z - this.input.z) * s;
    this.input.roll += (clamp(roll, -1, 1) - this.input.roll) * s;
    this.input.yaw += (yaw - this.input.yaw) * s;
    this.input.pitch += (pitch - this.input.pitch) * s;
    for (const finger of FINGERS) {
      this.input.curl[finger] += (curl[finger] - this.input.curl[finger]) * s;
    }
    this.input.active = true;
  }

  /** Releases the camera, the tracker and the animation loop. */
  async stop(): Promise<void> {
    this.running = false;
    this.input.active = false;
    cancelAnimationFrame(this.raf);

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        /* already released */
      }
      this.landmarker = null;
    }
    this.lastVideoTime = -1;
    this.setStatus('idle');
  }
}

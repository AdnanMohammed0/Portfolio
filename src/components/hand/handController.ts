import * as THREE from 'three';
import { clamp, damp } from '@/lib/utils';
import {
  FINGERS,
  REST_POSE,
  makeCurlMap,
  makePose,
  type CurlMap,
  type HandPose,
} from './handRig';

export type HandPhase = 'entering' | 'greeting' | 'blending' | 'interactive';

export interface PointerInput {
  /** Normalised to [-1, 1] relative to the hero, already smoothed by the DOM layer. */
  x: number;
  y: number;
  /** True while the pointer is actually over the hero. */
  active: boolean;
}

export interface ARInput {
  active: boolean;
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
  curl: CurlMap;
}

const ENTER_DURATION = 0.55;
const GREET_DURATION = 1.5;
const BLEND_DURATION = 0.65;

/** Movement envelope — deliberately narrow so the hand stays elegant. */
const LIMITS = {
  yaw: 0.62,
  pitch: 0.46,
  roll: 0.22,
  offsetX: 0.24,
  offsetY: 0.18,
  offsetZ: 0.26,
};

/**
 * A lightly underdamped spring.
 *
 * Exponential damping alone always decelerates into its target, which is why
 * eased tracking reads as mechanical. A real hand carries momentum: it arrives
 * slightly past where it was heading and settles back. `zeta` below 1 gives
 * exactly that overshoot.
 */
class Spring {
  value = 0;
  private velocity = 0;

  constructor(
    private stiffness: number,
    private zeta: number,
  ) {}

  step(target: number, dt: number): number {
    const damping = 2 * this.zeta * Math.sqrt(this.stiffness);
    const acceleration = this.stiffness * (target - this.value) - damping * this.velocity;
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  set(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}

/**
 * Owns the hand's whole lifecycle:
 *
 *   LOAD → HELLO / WAVE → SMOOTH TRANSITION → MOUSE (or AR) INTERACTION
 *
 * The greeting never hard-stops: its final rotation is captured and used as the
 * starting point of tracking, then interpolated away, so there is no visual jump.
 */
export class HandController {
  readonly pose: HandPose = makePose();

  phase: HandPhase = 'entering';

  private elapsed = 0;
  private phaseTime = 0;

  /** Rotation the greeting ended on — the seed for interactive mode. */
  private handoffRotation = new THREE.Euler(0, 0, 0);
  private handoffCurl: CurlMap = makeCurlMap(0);
  private blend = 0;

  private idlePhase = Math.random() * Math.PI * 2;

  private readonly targetRotation = new THREE.Euler(0, 0, 0);
  private readonly targetPosition = new THREE.Vector3(0, 0, 0);
  private readonly targetCurl: CurlMap = { ...REST_POSE.curl };

  /**
   * Springs for interactive tracking. Rotation is stiffer than position, so the
   * hand turns to face the pointer a beat before it drifts toward it — the same
   * lead-and-follow that makes real limb motion read as weighted.
   */
  private readonly springs = {
    rotX: new Spring(34, 0.62),
    rotY: new Spring(34, 0.62),
    rotZ: new Spring(26, 0.55),
    posX: new Spring(19, 0.68),
    posY: new Spring(19, 0.68),
    posZ: new Spring(22, 0.8),
  };

  /** Smoothed pointer, plus its velocity — used for anticipation and banking. */
  private readonly smoothPointer = { x: 0, y: 0 };
  private readonly pointerVelocity = { x: 0, y: 0 };

  /** Phase of the ripple that runs across the fingers as the pointer moves. */
  private rippleTravel = 0;

  constructor(private reducedMotion = false) {
    if (reducedMotion) {
      // No entrance, no wave — start settled and interactive.
      this.phase = 'interactive';
      this.pose.opacity = 1;
      this.pose.scale = 1;
      this.pose.curl = { ...REST_POSE.curl };
      this.pose.rotation.copy(REST_POSE.rotation);
    } else {
      // Arrives as a loose fist and unfurls — a hand opening reads as alive in
      // a way a hand that is simply already open does not.
      this.pose.opacity = 0;
      this.pose.scale = 0.86;
      this.pose.curl = makeCurlMap(0.85);
      this.pose.rotation.set(-0.25, 0.55, 0.2);
    }
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  /** Restart the greeting — used when the hero is re-initialised. */
  restart(): void {
    this.elapsed = 0;
    this.phaseTime = 0;
    this.blend = 0;
    this.phase = this.reducedMotion ? 'interactive' : 'entering';
    if (!this.reducedMotion) {
      this.pose.opacity = 0;
      this.pose.scale = 0.86;
      this.pose.rotation.set(-0.25, 0.55, 0.2);
    }
  }

  get greetingDone(): boolean {
    return this.phase === 'interactive' || this.phase === 'blending';
  }

  update(dt: number, pointer: PointerInput, ar: ARInput | null): void {
    // Guard against huge steps after a tab has been backgrounded.
    const step = Math.min(dt, 1 / 20);
    this.elapsed += step;
    this.phaseTime += step;

    switch (this.phase) {
      case 'entering':
        this.updateEntering(step);
        break;
      case 'greeting':
        this.updateGreeting(step);
        break;
      case 'blending':
      case 'interactive':
        this.updateInteractive(step, pointer, ar);
        break;
    }
  }

  // -- LOAD ----------------------------------------------------------------

  private updateEntering(dt: number): void {
    const t = clamp(this.phaseTime / ENTER_DURATION, 0, 1);
    const eased = easeOutCubic(t);

    this.pose.opacity = eased;
    this.pose.scale = 0.86 + eased * 0.14;

    // Rotate gently toward the viewer as it arrives.
    this.pose.rotation.set(
      damp(this.pose.rotation.x, -0.05, 6, dt),
      damp(this.pose.rotation.y, 0.1, 6, dt),
      damp(this.pose.rotation.z, 0.04, 6, dt),
    );

    // Fingers unfurl in sequence, thumb last, so the opening has a direction.
    FINGERS.forEach((finger, i) => {
      const stagger = clamp((t - i * 0.08) / 0.6, 0, 1);
      const target = 0.85 + (0.06 - 0.85) * easeOutCubic(stagger);
      this.pose.curl[finger] = damp(this.pose.curl[finger], target, 9, dt);
    });

    if (t >= 1) {
      this.phase = 'greeting';
      this.phaseTime = 0;
    }
  }

  // -- HELLO / WAVE --------------------------------------------------------

  private updateGreeting(dt: number): void {
    const t = clamp(this.phaseTime / GREET_DURATION, 0, 1);

    // Envelope keeps the first and last wave softer than the middle ones,
    // so the gesture starts and ends without a snap.
    const envelope = Math.sin(Math.PI * t) ** 0.7;
    // ~2.5 waves across the gesture.
    const wave = Math.sin(t * Math.PI * 5);

    this.pose.opacity = 1;
    this.pose.scale = damp(this.pose.scale, 1, 8, dt);

    this.pose.rotation.set(
      damp(this.pose.rotation.x, -0.08 + wave * 0.05 * envelope, 12, dt),
      damp(this.pose.rotation.y, 0.12 + wave * 0.1 * envelope, 12, dt),
      // The roll is the readable part of a wave.
      damp(this.pose.rotation.z, wave * 0.42 * envelope, 14, dt),
    );

    this.pose.position.set(0, damp(this.pose.position.y, envelope * 0.05, 8, dt), 0);

    // Fingers ripple across the wave, each one lagging the last, the way real
    // fingers trail when a hand rocks side to side.
    this.pose.spread = 1 + envelope * 0.5;
    FINGERS.forEach((finger, i) => {
      const ripple = Math.sin(t * Math.PI * 5 - i * 0.55) * 0.16 * envelope;
      const open = 0.1 + ripple;
      this.pose.curl[finger] = damp(this.pose.curl[finger], clamp(open, 0, 1), 12, dt);
    });

    if (t >= 1) {
      // Capture the exact pose the wave finished on: tracking starts here.
      this.handoffRotation.copy(this.pose.rotation);
      this.handoffCurl = { ...this.pose.curl };
      this.phase = 'blending';
      this.phaseTime = 0;
      this.blend = 0;
    }
  }

  // -- INTERACTION ---------------------------------------------------------

  private updateInteractive(dt: number, pointer: PointerInput, ar: ARInput | null): void {
    if (this.phase === 'blending') {
      this.blend = clamp(this.blend + dt / BLEND_DURATION, 0, 1);
      if (this.blend >= 1) {
        this.phase = 'interactive';
        this.phaseTime = 0;
      }
    }

    this.pose.opacity = damp(this.pose.opacity, 1, 8, dt);
    this.pose.scale = damp(this.pose.scale, 1, 8, dt);

    if (ar?.active) {
      this.computeArTargets(ar);
    } else {
      this.computePointerTargets(pointer, dt);
    }

    if (ar?.active) {
      // AR is already smoothed upstream and must stay locked to the real hand,
      // so it damps directly rather than going through the springs.
      const lambda = 9;
      this.pose.rotation.set(
        damp(this.pose.rotation.x, this.targetRotation.x, lambda, dt),
        damp(this.pose.rotation.y, this.targetRotation.y, lambda, dt),
        damp(this.pose.rotation.z, this.targetRotation.z, lambda, dt),
      );
      this.pose.position.set(
        damp(this.pose.position.x, this.targetPosition.x, lambda, dt),
        damp(this.pose.position.y, this.targetPosition.y, lambda, dt),
        damp(this.pose.position.z, this.targetPosition.z, lambda, dt),
      );
      this.syncSpringsToPose();
    } else {
      // Pointer tracking rides the springs, so the hand carries momentum and
      // settles rather than easing to a stop.
      this.pose.rotation.set(
        this.springs.rotX.step(this.targetRotation.x, dt),
        this.springs.rotY.step(this.targetRotation.y, dt),
        this.springs.rotZ.step(this.targetRotation.z, dt),
      );
      this.pose.position.set(
        this.springs.posX.step(this.targetPosition.x, dt),
        this.springs.posY.step(this.targetPosition.y, dt),
        this.springs.posZ.step(this.targetPosition.z, dt),
      );
    }

    const curlLambda = ar?.active ? 12 : 7;
    for (const finger of FINGERS) {
      this.pose.curl[finger] = damp(this.pose.curl[finger], this.targetCurl[finger], curlLambda, dt);
    }
    this.pose.spread = damp(this.pose.spread, ar?.active ? 1.15 : 1, 4, dt);

    // While blending, pull back toward the pose the wave ended on so the
    // transition into tracking has no discontinuity.
    if (this.blend < 1) {
      const back = 1 - easeInOutCubic(this.blend);
      this.pose.rotation.x += (this.handoffRotation.x - this.pose.rotation.x) * back;
      this.pose.rotation.y += (this.handoffRotation.y - this.pose.rotation.y) * back;
      this.pose.rotation.z += (this.handoffRotation.z - this.pose.rotation.z) * back;
      for (const finger of FINGERS) {
        this.pose.curl[finger] +=
          (this.handoffCurl[finger] - this.pose.curl[finger]) * back;
      }
    }
  }

  /** Keeps the springs in step with a pose that was driven by AR instead. */
  private syncSpringsToPose(): void {
    this.springs.rotX.set(this.pose.rotation.x);
    this.springs.rotY.set(this.pose.rotation.y);
    this.springs.rotZ.set(this.pose.rotation.z);
    this.springs.posX.set(this.pose.position.x);
    this.springs.posY.set(this.pose.position.y);
    this.springs.posZ.set(this.pose.position.z);
  }

  private computePointerTargets(pointer: PointerInput, dt: number): void {
    const strength = this.reducedMotion ? 0.25 : 1;
    const rawX = clamp(pointer.x, -1, 1);
    const rawY = clamp(pointer.y, -1, 1);

    /**
     * Track the pointer's own smoothed position and speed. Raw cursor samples
     * are jittery and arrive at irregular intervals; a hand reacting to them
     * directly twitches.
     */
    const previousX = this.smoothPointer.x;
    const previousY = this.smoothPointer.y;
    this.smoothPointer.x = damp(this.smoothPointer.x, rawX, 14, dt);
    this.smoothPointer.y = damp(this.smoothPointer.y, rawY, 14, dt);

    if (dt > 0) {
      const vx = (this.smoothPointer.x - previousX) / dt;
      const vy = (this.smoothPointer.y - previousY) / dt;
      this.pointerVelocity.x = damp(this.pointerVelocity.x, vx, 8, dt);
      this.pointerVelocity.y = damp(this.pointerVelocity.y, vy, 8, dt);
    }

    const x = this.smoothPointer.x;
    const y = this.smoothPointer.y;

    // Idle breathing keeps the hand alive when the pointer is away.
    const idle = this.reducedMotion ? 0 : 1;
    const t = this.elapsed;
    const breathY = Math.sin(t * 0.6 + this.idlePhase) * 0.03 * idle;
    const breathX = Math.cos(t * 0.45 + this.idlePhase) * 0.02 * idle;

    const engaged = pointer.active ? 1 : 0.35;

    /**
     * Banking: a hand swinging sideways rolls into the turn, and the faster it
     * travels the more it leans. This is the single biggest cue that separates
     * "following the cursor" from "moving toward something".
     */
    const bank = clamp(this.pointerVelocity.x, -3, 3) * 0.055 * strength;
    // Moving fast also pitches the hand slightly, as though leading with the wrist.
    const lead = clamp(this.pointerVelocity.y, -3, 3) * 0.03 * strength;

    this.targetRotation.set(
      -y * LIMITS.pitch * strength * engaged + breathX - 0.04 - lead,
      x * LIMITS.yaw * strength * engaged + 0.12,
      x * LIMITS.roll * strength * engaged * 0.6 + bank,
    );
    this.targetPosition.set(
      x * LIMITS.offsetX * strength * engaged,
      -y * LIMITS.offsetY * strength * engaged + breathY,
      // Slight depth parallax as the pointer approaches the centre.
      (1 - Math.hypot(x, y)) * LIMITS.offsetZ * 0.35 * engaged,
    );

    /**
     * Idle life. Two layers: a continuous per-finger breath, and a slow flex
     * that rolls through the fingers every ~9 seconds. Without the second one
     * the hand reads as a still image with a wobble; with it, it reads as a
     * hand resting.
     */
    const flexCycle = (t % 9) / 9;
    // A single smooth pulse occupying the last third of each cycle.
    const flex = flexCycle > 0.66 ? Math.sin((flexCycle - 0.66) / 0.34 * Math.PI) ** 2 : 0;

    // Fingers open a touch as the hand accelerates, the way a hand relaxes
    // open when it reaches toward something.
    const speed = Math.hypot(this.pointerVelocity.x, this.pointerVelocity.y);
    const reach = clamp(speed * 0.05, 0, 0.12);

    /**
     * Pointer-driven finger motion.
     *
     * `travel` is a wave that runs across the fingers, index to pinky, phased by
     * how far the pointer has moved. Moving the mouse sends a visible ripple
     * down the hand; holding still lets it fade out. `tilt` adds a steady
     * asymmetry so the fingers on the side the pointer sits toward open a
     * little more than the ones on the far side.
     */
    this.rippleTravel += speed * dt * 2.4;
    const rippleStrength = clamp(speed * 0.16, 0, 0.34) * idle;
    const tiltAmount = this.smoothPointer.x * 0.06 * idle;

    FINGERS.forEach((finger, i) => {
      const breath = Math.sin(t * 0.7 + i * 0.6) * 0.045 * idle;
      const rolled =
        flex * 0.3 * idle * Math.max(0, Math.sin(Math.PI * clamp(flexCycle * 3 - i * 0.12, 0, 1)));

      // Each finger lags the one before it, so the ripple reads as travelling.
      const travel = Math.sin(this.rippleTravel - i * 0.85) * rippleStrength;
      // Index (i=1) through pinky (i=4) lean with the pointer; thumb sits out.
      const tilt = i === 0 ? 0 : tiltAmount * (i - 2.5) * 0.5;

      this.targetCurl[finger] = clamp(
        REST_POSE.curl[finger] + breath + rolled + travel + tilt - reach,
        0,
        1,
      );
    });
  }

  private computeArTargets(ar: ARInput): void {
    this.targetRotation.set(
      clamp(ar.pitch, -LIMITS.pitch * 2.2, LIMITS.pitch * 2.2),
      clamp(ar.yaw, -LIMITS.yaw * 2, LIMITS.yaw * 2),
      clamp(ar.roll, -0.9, 0.9),
    );
    this.targetPosition.set(
      clamp(ar.x, -1, 1) * LIMITS.offsetX * 2.4,
      clamp(ar.y, -1, 1) * LIMITS.offsetY * 2.4,
      clamp(ar.z, -1, 1) * LIMITS.offsetZ,
    );
    for (const finger of FINGERS) {
      this.targetCurl[finger] = clamp(ar.curl[finger], 0, 1);
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

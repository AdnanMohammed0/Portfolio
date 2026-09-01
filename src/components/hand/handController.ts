import * as THREE from 'three';
import { clamp, damp } from '@/lib/utils';
import {
  FINGERS,
  REST_POSE,
  makeCurlMap,
  makePose,
  type CurlMap,
  type HandPose,
  type WristAngles,
} from './handRig';

export type HandPhase = 'entering' | 'greeting' | 'blending' | 'interactive';

export interface PointerInput {
  /** Normalised to [-1, 1] relative to the hero, already smoothed by the DOM layer. */
  x: number;
  y: number;
  /** True while the pointer is actually over the hero. */
  active: boolean;
}

const ENTER_DURATION = 0.7;
const GREET_DURATION = 2.1;
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
 *   LOAD → HELLO / WAVE → SMOOTH TRANSITION → INTERACTION
 *
 * Interaction is pointer-driven on desktop and device-orientation-driven on
 * phones; both arrive through the same normalised PointerInput, so everything
 * downstream — springs, banking, finger ripple — is shared.
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
  private handoffWrist: WristAngles = { wave: 0, nod: 0, twist: 0 };
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

  private readonly targetWrist: WristAngles = { wave: 0, nod: 0, twist: 0 };

  constructor(private reducedMotion = false) {
    if (reducedMotion) {
      // No entrance, no wave — start settled and interactive.
      this.phase = 'interactive';
      this.pose.opacity = 1;
      this.pose.scale = 1;
      this.pose.curl = { ...REST_POSE.curl };
      this.pose.rotation.copy(REST_POSE.rotation);
    } else {
      // Arrives already open. An earlier version rose as a fist and unfurled,
      // which meant the visitor spent the first half-second looking at a
      // clenched hand — the opposite of a greeting.
      this.pose.opacity = 0;
      this.pose.scale = 0.9;
      this.pose.curl = makeCurlMap(0.24);
      this.pose.rotation.set(-0.14, 0.34, 0.12);
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

  update(dt: number, pointer: PointerInput): void {
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
        this.updateInteractive(step, pointer);
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

    // Fingers relax open as the hand settles into frame.
    FINGERS.forEach((finger) => {
      const target = finger === 'thumb' ? 0.2 : 0.1;
      this.pose.curl[finger] = damp(this.pose.curl[finger], target, 7, dt);
    });

    if (t >= 1) {
      this.phase = 'greeting';
      this.phaseTime = 0;
    }
  }

  // -- HELLO / WAVE --------------------------------------------------------

  private updateGreeting(dt: number): void {
    const t = clamp(this.phaseTime / GREET_DURATION, 0, 1);

    /**
     * The wave happens at the WRIST, not by rotating the whole arm.
     *
     * That single distinction is what separates a greeting from a windscreen
     * wiper: a person waving holds the forearm nearly still and rocks the hand
     * on it. Rotating the entire model — forearm included — can never look
     * human no matter how the curve is shaped.
     *
     * On top of that the gesture is built from how people actually move:
     *   · a wind-up against the first stroke,
     *   · strokes that accelerate out and ease back rather than sway evenly,
     *   · the hand pausing a beat at the far end of each stroke,
     *   · fingers trailing the wrist, each one later than the last,
     *   · and a decay into stillness instead of an abrupt stop.
     */

    // Beats: lift (0-0.2), wave (0.2-0.86), settle (0.86-1).
    const lift = clamp(t / 0.2, 0, 1);
    const swing = clamp((t - 0.2) / 0.66, 0, 1);
    const settle = clamp((t - 0.86) / 0.14, 0, 1);

    /**
     * Stroke shape. `Math.sin` alone gives a pendulum; skewing the phase makes
     * each stroke leave quickly and arrive slowly, and raising the result to an
     * odd power flattens the middle so the hand lingers at the extremes — the
     * beat a real wave has at the top of each swing.
     */
    const phase = swing * Math.PI * 3.4;
    const skewed = phase - Math.sin(phase * 2) * 0.28;
    const raw = Math.sin(skewed);
    const stroke = Math.sign(raw) * Math.abs(raw) ** 0.72;

    // Amplitude: grows over the first stroke, decays through the last.
    const amplitude = easeOutCubic(clamp(swing / 0.22, 0, 1)) * (1 - easeInOutCubic(settle)) * (1 - swing * 0.35);

    // Wind-up: the wrist cocks the other way before the first stroke leaves.
    const windup = -Math.sin(lift * Math.PI) * 0.38 * (1 - swing);

    this.pose.opacity = 1;
    this.pose.scale = damp(this.pose.scale, 1, 8, dt);

    // ---- Wrist: the gesture itself -------------------------------------
    this.pose.wrist.wave = damp(
      this.pose.wrist.wave,
      stroke * 1.0 * amplitude + windup,
      18,
      dt,
    );
    // The hand tips back slightly as it comes up, and nods with each stroke.
    this.pose.wrist.nod = damp(
      this.pose.wrist.nod,
      -0.1 * lift * (1 - settle * 0.6) + Math.abs(stroke) * 0.06 * amplitude,
      10,
      dt,
    );
    // A touch of twist keeps the palm turned toward the viewer through the arc.
    this.pose.wrist.twist = damp(this.pose.wrist.twist, -stroke * 0.07 * amplitude, 12, dt);

    // ---- Arm: almost still, just enough to not look bolted down ---------
    this.pose.rotation.set(
      damp(this.pose.rotation.x, -0.06 - lift * 0.05, 6, dt),
      damp(this.pose.rotation.y, 0.12 + stroke * 0.1 * amplitude, 7, dt),
      damp(this.pose.rotation.z, stroke * 0.13 * amplitude, 8, dt),
    );

    this.pose.position.set(
      damp(this.pose.position.x, stroke * 0.12 * amplitude, 9, dt),
      damp(this.pose.position.y, easeOutCubic(lift) * 0.06, 6, dt),
      this.pose.position.z,
    );

    // ---- Fingers: trailing the wrist ------------------------------------
    this.pose.spread = 1 + amplitude * 0.45;
    FINGERS.forEach((finger, i) => {
      // Each finger arrives later than the one before it. The lag is what
      // stops the hand reading as a single rigid paddle.
      const trail = Math.sin(skewed - i * 0.62) * 0.1 * amplitude;
      // The hand stays open throughout — a wave is an open hand rocking, not a
      // hand opening. The fingers only trail the wrist by a small amount.
      const base = finger === 'thumb' ? 0.2 : 0.1;
      this.pose.curl[finger] = damp(this.pose.curl[finger], clamp(base + trail, 0, 1), 14, dt);
    });

    if (t >= 1) {
      // Capture the exact pose the wave finished on: tracking starts here.
      this.handoffRotation.copy(this.pose.rotation);
      this.handoffCurl = { ...this.pose.curl };
      this.handoffWrist = { ...this.pose.wrist };
      this.phase = 'blending';
      this.phaseTime = 0;
      this.blend = 0;
    }
  }

  // -- INTERACTION ---------------------------------------------------------

  private updateInteractive(dt: number, pointer: PointerInput): void {
    if (this.phase === 'blending') {
      this.blend = clamp(this.blend + dt / BLEND_DURATION, 0, 1);
      if (this.blend >= 1) {
        this.phase = 'interactive';
        this.phaseTime = 0;
      }
    }

    this.pose.opacity = damp(this.pose.opacity, 1, 8, dt);
    this.pose.scale = damp(this.pose.scale, 1, 8, dt);

    this.computePointerTargets(pointer, dt);

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

    /**
     * Tracking is split between wrist and arm. The wrist takes most of the
     * movement and reacts faster, so the hand turns toward the pointer and the
     * arm follows a beat later — the same lead-and-follow a real limb has.
     */
    this.pose.wrist.wave = damp(this.pose.wrist.wave, this.targetWrist.wave, 6, dt);
    this.pose.wrist.nod = damp(this.pose.wrist.nod, this.targetWrist.nod, 5.5, dt);
    this.pose.wrist.twist = damp(this.pose.wrist.twist, this.targetWrist.twist, 5, dt);

    const curlLambda = 7;
    for (const finger of FINGERS) {
      this.pose.curl[finger] = damp(this.pose.curl[finger], this.targetCurl[finger], curlLambda, dt);
    }
    this.pose.spread = damp(this.pose.spread, 1, 4, dt);

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
      this.pose.wrist.wave += (this.handoffWrist.wave - this.pose.wrist.wave) * back;
      this.pose.wrist.nod += (this.handoffWrist.nod - this.pose.wrist.nod) * back;
      this.pose.wrist.twist += (this.handoffWrist.twist - this.pose.wrist.twist) * back;
    }
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

    // The wrist carries most of the reach, plus a slow idle sway so the hand is
    // never perfectly still.
    const sway = Math.sin(t * 0.5 + this.idlePhase) * 0.05 * idle;
    this.targetWrist.wave = x * 0.42 * strength * engaged + sway + bank * 0.6;
    this.targetWrist.nod = -y * 0.3 * strength * engaged - 0.08;
    this.targetWrist.twist = x * 0.12 * strength * engaged;

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

}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

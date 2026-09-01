import * as THREE from 'three';

/**
 * A small anatomical rig used by both the procedural hand and (when a GLB is
 * supplied) the model driver. Everything is expressed as joint rotations so the
 * greeting animation, mouse tracking and AR tracking can all write to the same
 * target buffer and be blended smoothly.
 */

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export const FINGERS: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

export interface FingerSpec {
  name: FingerName;
  /** Base position on the palm, in local units. */
  origin: [number, number, number];
  /** Sideways splay applied at the knuckle. */
  spread: number;
  /** Lengths of proximal / middle / distal phalanges. */
  segments: [number, number, number];
  radius: number;
}

/** Palm envelope: an ellipsoid, so the silhouette is never boxy. */
export const PALM = {
  radiusX: 0.37,
  radiusY: 0.53,
  radiusZ: 0.17,
  /** Knuckle line — fingers are seated slightly inside it, not stacked on top. */
  topY: 0.4,
};

/**
 * Finger roots sit just inside the palm surface so the knuckles read as part of
 * the hand rather than as separate pieces. The thumb is rotated forward as well
 * as outward, which is what makes a hand read as a hand and not a starfish.
 */
export const FINGER_SPECS: FingerSpec[] = [
  {
    name: 'thumb',
    origin: [-0.27, -0.14, 0.08],
    spread: 0.7,
    segments: [0.25, 0.2, 0.15],
    radius: 0.088,
  },
  {
    name: 'index',
    origin: [-0.21, 0.37, 0.01],
    spread: 0.1,
    segments: [0.28, 0.19, 0.14],
    radius: 0.081,
  },
  {
    name: 'middle',
    origin: [-0.07, 0.41, 0],
    spread: 0.03,
    segments: [0.3, 0.21, 0.15],
    radius: 0.083,
  },
  {
    name: 'ring',
    origin: [0.07, 0.39, -0.01],
    spread: -0.06,
    segments: [0.28, 0.19, 0.14],
    radius: 0.078,
  },
  {
    name: 'pinky',
    origin: [0.2, 0.33, -0.02],
    spread: -0.16,
    segments: [0.22, 0.16, 0.12],
    radius: 0.066,
  },
];

/** Extra rotation applied at a finger's root, before curl. */
export const FINGER_BASE_TILT: Partial<Record<FingerName, [number, number, number]>> = {
  // Thumb opposes the palm: forward and rolled in.
  thumb: [0.15, -0.42, 0.28],
  pinky: [0, 0, 0],
};

/** Per-finger curl, 0 = fully extended, 1 = fully closed. */
export type CurlMap = Record<FingerName, number>;

export function makeCurlMap(value = 0): CurlMap {
  return { thumb: value, index: value, middle: value, ring: value, pinky: value };
}

/** Wrist articulation. The hand rocks on this; the arm barely moves. */
export interface WristAngles {
  /** Side-to-side rock about the palm normal — the motion of a wave. */
  wave: number;
  /** Nodding forward and back about the knuckle line. */
  nod: number;
  /** Twist along the length of the hand. */
  twist: number;
}

/** The complete pose the renderer reads each frame. */
export interface HandPose {
  curl: CurlMap;
  wrist: WristAngles;
  /** Finger splay multiplier — fingers open outward as it rises. */
  spread: number;
  rotation: THREE.Euler;
  position: THREE.Vector3;
  scale: number;
  opacity: number;
}

export function makePose(): HandPose {
  return {
    curl: makeCurlMap(0.05),
    wrist: { wave: 0, nod: 0, twist: 0 },
    spread: 1,
    rotation: new THREE.Euler(0, 0, 0),
    position: new THREE.Vector3(0, 0, 0),
    scale: 1,
    opacity: 1,
  };
}

/** Resting pose: fingers relaxed, hand angled slightly toward the viewer. */
export const REST_POSE = {
  curl: { thumb: 0.22, index: 0.14, middle: 0.12, ring: 0.16, pinky: 0.2 } as CurlMap,
  spread: 1,
  rotation: new THREE.Euler(-0.06, 0.16, 0.05),
};

/**
 * Rotation applied to each phalanx for a given curl amount. Later joints curl
 * further than the knuckle, which is what makes a closing hand read as natural.
 */
export function jointAngle(curl: number, segmentIndex: number): number {
  const weights = [0.85, 1.15, 1.0];
  return -curl * 1.45 * weights[segmentIndex];
}

/** Thumb curls across the palm rather than straight down. */
export function thumbAxisRotation(curl: number, segmentIndex: number): THREE.Euler {
  const bend = -curl * 1.05 * (segmentIndex === 0 ? 0.7 : 1.0);
  return new THREE.Euler(bend, 0, curl * 0.35);
}

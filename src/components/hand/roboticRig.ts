import * as THREE from 'three';
import type { CurlMap, FingerName } from './handRig';

/**
 * Builds a working skeleton for the robotic hand GLB at runtime.
 *
 * The model ships as 36 loose rigid parts under a single `Root` — no skin, no
 * bones, no animation tracks — so nothing in it can bend on its own. But the
 * parts are laid out exactly like real hardware: each finger is a column of
 * alternating joint pins (`Cylinder.*`) and phalanx shells (`Cube.*`).
 *
 * This module re-parents those parts into proper kinematic chains, one nested
 * pivot per joint, and measures each hinge axis from the model's own geometry
 * instead of assuming an orientation. After that the hand articulates like any
 * rigged model, driven by the same CurlMap the procedural hand uses — so the
 * greeting wave, pointer tracking and AR hand tracking all move the fingers.
 *
 * Part names come from the shipped asset. If they no longer resolve — a
 * different model, a re-export — `buildRoboticRig` returns null and the caller
 * falls back to moving the hand as a single piece.
 */

/**
 * Each finger, ordered from the knuckle outward:
 *   [joint, phalanx, joint, phalanx, joint, phalanx]
 * Joints become pivots; the phalanx after a joint rides on it.
 */
const FINGER_PARTS: Record<Exclude<FingerName, 'thumb'>, string[]> = {
  index: ['Cylinder.008', 'Cube.026', 'Cylinder.006', 'Cube.027', 'Cylinder.007', 'Cube.028'],
  middle: ['Cylinder.009', 'Cube.031', 'Cylinder.011', 'Cube.030', 'Cylinder.010', 'Cube.029'],
  ring: ['Cylinder.012', 'Cube.034', 'Cylinder.014', 'Cube.033', 'Cylinder.013', 'Cube.032'],
  pinky: ['Cylinder.017', 'Cube.035', 'Cylinder.015', 'Cube.036', 'Cylinder.016', 'Cube.037'],
};

/** The thumb has one fewer joint and hinges across the palm. */
const THUMB_PARTS = ['Cylinder.004', 'Cube.018', 'Cylinder.005', 'Cube.019'];

/** Later joints close further than the knuckle, as in a real finger. */
const JOINT_WEIGHTS = [0.85, 1.15, 1.0];

/** Full-curl angle at a knuckle, radians. */
const MAX_BEND = 1.45;

/** The thumb closes less far, and across rather than down. */
const THUMB_BEND_SCALE = 0.7;

interface Joint {
  pivot: THREE.Group;
  /** Hinge axis, expressed in the pivot's own local frame. */
  axis: THREE.Vector3;
  weight: number;
  rest: THREE.Quaternion;
}

interface FingerChain {
  name: FingerName;
  joints: Joint[];
  scale: number;
}

export interface RoboticRig {
  fingers: FingerChain[];
  /** Applies a pose. `spread` of 1 is neutral; higher opens the hand slightly. */
  apply(curl: CurlMap, spread: number): void;
}

/** GLTFLoader strips dots from node names, so compare on a normalised form. */
function normalise(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function indexParts(root: THREE.Object3D): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>();
  root.traverse((child) => {
    if (child.name) map.set(normalise(child.name), child);
  });
  return map;
}

/** World-space centre of an object's bounding box. */
function worldCentre(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
}

function resolve(
  names: string[],
  parts: Map<string, THREE.Object3D>,
): THREE.Object3D[] | null {
  const found = names.map((n) => parts.get(normalise(n)));
  return found.every(Boolean) ? (found as THREE.Object3D[]) : null;
}

/**
 * Assembles one finger.
 *
 * Everything is measured in world space and re-parented with `attach`, which
 * preserves each part's world transform. Mixing world-space measurements with
 * raw local positions is what makes a hand like this fly apart: the parts sit
 * under a `Root` that carries its own rotation and scale, so a part's local
 * translation is not its position in the scene.
 */
function buildChain(
  name: FingerName,
  parts: THREE.Object3D[],
  axisWorld: THREE.Vector3,
  parent: THREE.Object3D,
): FingerChain {
  const centres = parts.map(worldCentre);

  const joints: Joint[] = [];
  let attachTo: THREE.Object3D = parent;

  for (let i = 0; i < parts.length; i += 2) {
    const jointPart = parts[i];
    const phalanx = parts[i + 1];
    const centre = centres[i];

    const pivot = new THREE.Group();
    pivot.name = `rig-${name}-${i / 2}`;
    attachTo.add(pivot);
    attachTo.updateMatrixWorld(true);

    // Place the pivot exactly on the joint, expressed in its parent's frame.
    pivot.position.copy(attachTo.worldToLocal(centre.clone()));
    pivot.updateMatrixWorld(true);

    // `attach` re-parents without moving anything on screen.
    pivot.attach(jointPart);
    pivot.attach(phalanx);
    pivot.updateMatrixWorld(true);

    // Bring the hinge axis into this pivot's local frame, so a local rotation
    // spins the finger about the real-world hinge.
    const inverse = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    const axis = axisWorld.clone().transformDirection(inverse).normalize();

    joints.push({
      pivot,
      axis,
      weight: JOINT_WEIGHTS[i / 2] ?? 1,
      rest: pivot.quaternion.clone(),
    });

    attachTo = pivot;
  }

  return { name, joints, scale: name === 'thumb' ? THUMB_BEND_SCALE : 1 };
}

/**
 * @param model  The loaded GLB scene, before any wrapper transforms.
 * @param sign   Which way the fingers close. Flip if the hand bends backwards.
 */
export function buildRoboticRig(model: THREE.Object3D, sign = 1): RoboticRig | null {
  model.updateMatrixWorld(true);
  const parts = indexParts(model);

  const resolved: Partial<Record<FingerName, THREE.Object3D[]>> = {};
  for (const [finger, names] of Object.entries(FINGER_PARTS)) {
    const found = resolve(names, parts);
    if (!found) return null;
    resolved[finger as FingerName] = found;
  }

  const index = resolved.index!;
  const middle = resolved.middle!;
  const pinky = resolved.pinky!;

  /**
   * Hinge axis, measured rather than assumed: fingers pivot about the knuckle
   * line that runs across the hand, so that line *is* the axis.
   */
  const knuckleLine = new THREE.Vector3()
    .subVectors(worldCentre(index[0]), worldCentre(pinky[0]))
    .normalize();

  /** Finger direction, knuckle to fingertip. */
  const fingerDirection = new THREE.Vector3()
    .subVectors(worldCentre(middle[middle.length - 1]), worldCentre(middle[0]))
    .normalize();

  /** Palm normal follows from the two above. */
  const palmNormal = new THREE.Vector3()
    .crossVectors(knuckleLine, fingerDirection)
    .normalize();

  const chains: FingerChain[] = [];

  for (const finger of ['index', 'middle', 'ring', 'pinky'] as const) {
    chains.push(buildChain(finger, resolved[finger]!, knuckleLine, model));
  }

  // The thumb opposes the palm, so it hinges about an axis perpendicular to
  // both its own length and the palm plane.
  const thumbParts = resolve(THUMB_PARTS, parts);
  if (thumbParts) {
    const thumbDirection = new THREE.Vector3()
      .subVectors(worldCentre(thumbParts[thumbParts.length - 1]), worldCentre(thumbParts[0]))
      .normalize();
    const thumbAxis = new THREE.Vector3()
      .crossVectors(thumbDirection, palmNormal)
      .normalize();
    chains.push(buildChain('thumb', thumbParts, thumbAxis, model));
  }

  const quaternion = new THREE.Quaternion();

  return {
    fingers: chains,
    apply(curl: CurlMap, spread: number) {
      // Opening the hand past neutral eases the knuckles slightly straighter.
      const relief = (spread - 1) * 0.12;

      for (const chain of chains) {
        const amount = Math.max(0, (curl[chain.name] ?? 0) - relief) * chain.scale;

        for (const joint of chain.joints) {
          quaternion.setFromAxisAngle(joint.axis, sign * amount * MAX_BEND * joint.weight);
          joint.pivot.quaternion.copy(joint.rest).multiply(quaternion);
        }
      }
    },
  };
}

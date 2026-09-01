import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { ProceduralHand } from './ProceduralHand';
import { buildRoboticRig } from './roboticRig';
import { makeCurlMap, type HandPose } from './handRig';

/**
 * Asset boundary for the hand.
 *
 * The shipped model is a robotic hand GLB: a set of loose rigid parts with no
 * skeleton of its own. `buildRoboticRig` assembles those parts into real joint
 * chains at load time, so the fingers articulate from the same pose data the
 * procedural hand uses. If the file is missing or fails to load, the procedural
 * hand takes over and the hero is unaffected.
 */
export const HAND_MODEL_URL = '/assets/hand/robotic_hand.glb';

interface Props {
  poseRef: MutableRefObject<HandPose>;
  material: THREE.Material;
}

/** Probes for the GLB so a missing file degrades quietly instead of throwing. */
function useHandAssetAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch(HAND_MODEL_URL, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        if (!active) return;
        const type = res.headers.get('content-type') ?? '';
        // A dev server may answer with index.html for unknown paths.
        setAvailable(res.ok && !type.includes('text/html'));
      })
      .catch(() => active && setAvailable(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return available;
}

/** Target height of the hand in scene units, so any source model fits the frame. */
const TARGET_HEIGHT = 2.6;

/**
 * The shipped model is authored lying along +X (a forearm with the hand at one
 * end). These bring it upright and turn the palm toward the viewer. They are
 * the only model-specific values in the app — a different GLB only needs these
 * three numbers retuned.
 */
const MODEL_ORIENTATION: [number, number, number] = [0, -Math.PI / 2, -Math.PI / 2];

/** Which way the fingers close. Flip if a replacement model bends backwards. */
const CURL_SIGN = -1;

/** Dev affordance: ?curl=0..1 freezes every finger at a fixed curl. */
function readCurlOverride(): number | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('curl');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

/** Dev affordance: ?handrot=x,y,z (radians) to re-aim a newly dropped-in model. */
function readOrientation(): [number, number, number] {
  if (!import.meta.env.DEV || typeof window === 'undefined') return MODEL_ORIENTATION;
  const raw = new URLSearchParams(window.location.search).get('handrot');
  if (!raw) return MODEL_ORIENTATION;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return MODEL_ORIENTATION;
  return parts as [number, number, number];
}

function GltfHand({ poseRef }: Props) {
  const { scene } = useGLTF(HAND_MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const curlOverride = useMemo(readCurlOverride, []);

  /**
   * Source models arrive at arbitrary scale, orientation and origin. Normalise
   * once: clone, centre on the palm, scale to a known height, and stand the
   * hand upright so the rig's rotations mean the same thing they do for the
   * procedural hand.
   */
  const { model, rig } = useMemo(() => {
    const clone = scene.clone(true);

    // 0. Assemble kinematic chains from the model's loose parts, before any
    //    wrapper transforms, so joint centres are measured in the model's own
    //    space. Null means the parts did not resolve — the hand still moves as
    //    a whole, it just cannot bend its fingers.
    const builtRig = buildRoboticRig(clone, CURL_SIGN);

    // 1. Stand the model upright before measuring — the bounds only mean
    //    anything once the hand is in the orientation it will be rendered in.
    const oriented = new THREE.Group();
    oriented.rotation.set(...readOrientation());
    oriented.add(clone);
    oriented.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(oriented);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // 2. Recentre on the bounding box. The exporter's own transforms are left
    //    alone — overwriting them would discard the model's unit conversion.
    oriented.position.sub(center);

    // 3. Scale to a known height so the hand always frames the same way.
    const fitted = new THREE.Group();
    fitted.add(oriented);
    fitted.scale.setScalar(TARGET_HEIGHT / Math.max(size.y, 0.0001));

    const wrapper = new THREE.Group();
    wrapper.add(fitted);
    return { model: wrapper, rig: builtRig };
  }, [scene]);

  useEffect(() => {
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      // Keep the model's own materials — that is the point of using it — but
      // make them fade with the pose during the entrance.
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        mat.transparent = true;
        mat.needsUpdate = true;
      }
    });
  }, [model]);

  useFrame(() => {
    const pose = poseRef.current;
    const node = root.current;
    if (!node) return;
    node.rotation.copy(pose.rotation);
    node.position.copy(pose.position);
    node.scale.setScalar(pose.scale);

    // Fingers. Same CurlMap the procedural hand uses, so the greeting wave,
    // pointer idle and AR tracking all articulate the model.
    if (curlOverride !== null) {
      rig?.apply(makeCurlMap(curlOverride), 1, pose.wrist);
    } else {
      rig?.apply(pose.curl, pose.spread, pose.wrist);
    }

    // Drive opacity on the model's own materials for the fade-in.
    const opacity = pose.opacity;
    node.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if (mat.opacity !== opacity) mat.opacity = opacity;
      }
    });
  });

  return (
    <group ref={root} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

export function HandModel({ poseRef, material }: Props) {
  const available = useHandAssetAvailable();

  // Render the procedural hand while probing, and permanently if no GLB exists.
  if (!available) {
    return <ProceduralHand poseRef={poseRef} material={material} />;
  }

  return <GltfHand poseRef={poseRef} material={material} />;
}

useGLTF.preload(HAND_MODEL_URL);

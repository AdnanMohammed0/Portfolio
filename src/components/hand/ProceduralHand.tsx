import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  FINGER_BASE_TILT,
  FINGER_SPECS,
  PALM,
  jointAngle,
  thumbAxisRotation,
  type FingerSpec,
  type HandPose,
} from './handRig';

/**
 * A fully articulated hand built from primitives.
 *
 * This is the shipped fallback described in the spec: no external model is
 * required for the hero to work. Drop a licensed GLB at
 * /public/assets/hand/hand.glb and <HandModel> uses that instead — nothing in
 * this file needs to change.
 */

interface Props {
  poseRef: MutableRefObject<HandPose>;
  material: THREE.Material;
}

/** One phalanx: a capsule plus a joint sphere at its base. */
function Phalanx({
  length,
  radius,
  material,
  children,
}: {
  length: number;
  radius: number;
  material: THREE.Material;
  children?: ReactNode;
}) {
  return (
    <group>
      <mesh position={[0, length / 2, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[radius, length * 0.7, 6, 20]} />
      </mesh>
      <mesh material={material} castShadow>
        <sphereGeometry args={[radius * 1.03, 20, 16]} />
      </mesh>
      <group position={[0, length, 0]}>{children}</group>
    </group>
  );
}

function Finger({
  spec,
  poseRef,
  material,
}: {
  spec: FingerSpec;
  poseRef: MutableRefObject<HandPose>;
  material: THREE.Material;
}) {
  const knuckle = useRef<THREE.Group>(null);
  const j0 = useRef<THREE.Group>(null);
  const j1 = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);

  const tilt = FINGER_BASE_TILT[spec.name] ?? [0, 0, 0];

  useFrame(() => {
    const pose = poseRef.current;
    const curl = pose.curl[spec.name];

    if (knuckle.current) {
      // Base tilt is fixed anatomy; spread is the animated splay on top of it.
      knuckle.current.rotation.set(tilt[0], tilt[1], tilt[2] + spec.spread * pose.spread);
    }

    const joints = [j0.current, j1.current, j2.current];
    joints.forEach((joint, index) => {
      if (!joint) return;
      if (spec.name === 'thumb') {
        const euler = thumbAxisRotation(curl, index);
        joint.rotation.set(euler.x, euler.y, euler.z);
      } else {
        joint.rotation.x = jointAngle(curl, index);
        // A touch of lateral drift as the finger closes reads as more organic.
        joint.rotation.z = index === 0 ? -curl * 0.06 * spec.spread : 0;
      }
    });
  });

  const [a, b, c] = spec.segments;
  const r = spec.radius;

  return (
    <group position={spec.origin} ref={knuckle}>
      <group ref={j0}>
        <Phalanx length={a} radius={r} material={material}>
          <group ref={j1}>
            <Phalanx length={b} radius={r * 0.9} material={material}>
              <group ref={j2}>
                <Phalanx length={c} radius={r * 0.8} material={material} />
                <mesh position={[0, c, 0]} material={material} castShadow>
                  <sphereGeometry args={[r * 0.76, 18, 14]} />
                </mesh>
              </group>
            </Phalanx>
          </group>
        </Phalanx>
      </group>
    </group>
  );
}

export function ProceduralHand({ poseRef, material }: Props) {
  const root = useRef<THREE.Group>(null);

  /**
   * Palm: an ellipsoid, squared off toward the knuckle line and tapered toward
   * the wrist. Starting from a sphere rather than a box keeps the silhouette
   * organic — a box, however rounded, still reads as a slab in profile.
   */
  const palmGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 40, 32);
    const position = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);

      // Flatten the top half toward a straight knuckle line.
      const upper = Math.max(0, v.y);
      const squared = v.x * (1 + 0.22 * upper ** 2);

      // Taper toward the wrist.
      const lower = Math.max(0, -v.y);
      const tapered = squared * (1 - 0.4 * lower ** 2);

      // Slightly thinner at the edges, like the side of a real palm.
      const edge = 1 - 0.35 * Math.min(1, (Math.abs(v.x) * 1.05) ** 3);

      position.setXYZ(
        i,
        tapered * PALM.radiusX,
        v.y * PALM.radiusY,
        v.z * PALM.radiusZ * edge,
      );
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => () => palmGeometry.dispose(), [palmGeometry]);

  useFrame(() => {
    const pose = poseRef.current;
    const node = root.current;
    if (!node) return;
    node.rotation.copy(pose.rotation);
    node.position.copy(pose.position);
    node.scale.setScalar(pose.scale);
  });

  return (
    <group ref={root} dispose={null}>
      {/* Palm */}
      <mesh geometry={palmGeometry} material={material} castShadow receiveShadow />

      {/* Thenar eminence — the muscle pad at the base of the thumb. Sunk into
          the palm so it reads as a swell in the surface, not a bolted-on ball. */}
      <mesh
        position={[-0.23, -0.16, 0.02]}
        scale={[0.9, 1.3, 0.55]}
        material={material}
        castShadow
      >
        <sphereGeometry args={[0.17, 24, 18]} />
      </mesh>

      {/* Hypothenar — the matching pad on the pinky side */}
      <mesh
        position={[0.22, -0.15, 0]}
        scale={[0.75, 1.3, 0.5]}
        material={material}
        castShadow
      >
        <sphereGeometry args={[0.14, 20, 16]} />
      </mesh>

      {/* Wrist, tucked into the palm so there is no seam */}
      <mesh position={[0, -0.63, 0]} scale={[1, 1, 0.7]} material={material} castShadow>
        <capsuleGeometry args={[0.22, 0.24, 8, 28]} />
      </mesh>

      {FINGER_SPECS.map((spec) => (
        <Finger key={spec.name} spec={spec} poseRef={poseRef} material={material} />
      ))}
    </group>
  );
}

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { HandModel } from './HandModel';
import { HandController, type ARInput, type PointerInput } from './handController';
import type { HandPose } from './handRig';

/**
 * The R3F canvas. Loaded lazily by <InteractiveHand> so three.js never enters
 * the initial bundle, and paused whenever the hero is off screen.
 */

interface SceneProps {
  controller: HandController;
  pointerRef: React.MutableRefObject<PointerInput>;
  arRef: React.MutableRefObject<ARInput | null>;
  active: boolean;
  reducedMotion: boolean;
  onPhaseChange?: (phase: string) => void;
}

function HandRig({ controller, pointerRef, arRef, reducedMotion, onPhaseChange }: SceneProps) {
  const poseRef = useRef<HandPose>(controller.pose);
  const lastPhase = useRef(controller.phase);
  const { invalidate } = useThree();

  /**
   * Brushed-metal skin: light enough to read on black, technical rather than
   * fleshy, and cheap — no textures to download.
   */
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#c9d2d4'),
      metalness: 0.62,
      roughness: 0.34,
      clearcoat: 0.5,
      clearcoatRoughness: 0.42,
      reflectivity: 0.5,
      transparent: true,
      opacity: 1,
    });
    return mat;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_state, delta) => {
    controller.update(delta, pointerRef.current, arRef.current);
    material.opacity = controller.pose.opacity;
    material.transparent = controller.pose.opacity < 0.999;

    if (controller.phase !== lastPhase.current) {
      lastPhase.current = controller.phase;
      onPhaseChange?.(controller.phase);
    }
    invalidate();
  });

  const content = <HandModel poseRef={poseRef} material={material} />;

  return (
    <group position={[0, -0.1, 0]}>
      {reducedMotion ? (
        content
      ) : (
        <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.35}>
          {content}
        </Float>
      )}
    </group>
  );
}

/** Keeps the renderer idle while the hero is scrolled away. */
function RenderGate({ active }: { active: boolean }) {
  const { setFrameloop } = useThree();
  useEffect(() => {
    setFrameloop(active ? 'always' : 'never');
  }, [active, setFrameloop]);
  return null;
}

export default function HandScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.1, 3.4], fov: 38, near: 0.1, far: 20 }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <RenderGate active={props.active} />

      {/* The hand rotates through a wide arc, so the rig has to keep it legible
          from every angle it can reach — never a black silhouette on black. */}
      <ambientLight intensity={0.55} />
      {/* Key, cool white, high and to the right */}
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#eef4f6" />
      {/* Front fill, so a hand turned away from the key stays readable */}
      <directionalLight position={[-1, 0.5, 4]} intensity={1.1} color="#dfe8ea" />
      {/* Teal side fill, straight from the palette */}
      <directionalLight position={[-4, 1, 1]} intensity={1.2} color="#324444" />
      {/* Blue rim, separates the silhouette from pure black */}
      <pointLight position={[-1.8, -1.2, -3]} intensity={11} color="#1e3a8a" distance={14} />

      <Suspense fallback={null}>
        <HandRig {...props} />
        <Environment preset="city" background={false} />
      </Suspense>
    </Canvas>
  );
}

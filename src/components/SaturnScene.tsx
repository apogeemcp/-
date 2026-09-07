"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function SaturnBody() {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta * 0.15;
    if (mesh.current) mesh.current.rotation.y += delta * 0.05;
  });

  return (
    <mesh ref={mesh} castShadow>
      <sphereGeometry args={[1.35, 96, 96]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPos;
          varying vec3 vNormal;
          void main() {
            vPos = position;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec3 vPos;
          varying vec3 vNormal;
          void main() {
            float bands = sin(vPos.y * 11.0 + uTime) * 0.5 + 0.5;
            vec3 black = vec3(0.03, 0.03, 0.035);
            vec3 gold = vec3(0.83, 0.69, 0.22);
            vec3 orange = vec3(0.98, 0.42, 0.1);
            vec3 red = vec3(0.76, 0.08, 0.12);
            vec3 col = mix(black, gold, bands);
            col = mix(col, orange, smoothstep(0.55, 0.9, bands) * 0.55);
            col = mix(col, red, smoothstep(0.82, 1.0, bands) * 0.35);
            float light = pow(max(dot(vNormal, normalize(vec3(0.6, 0.4, 0.8))), 0.0), 1.4);
            float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
            col += gold * light * 0.35;
            col += orange * rim * 0.45;
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function Rings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * 0.08;
  });
  const colors = ["#d4af37", "#f0d78c", "#ff6b1a", "#ff3b1a", "#c1121f", "#fff6d6"];
  return (
    <group ref={ref} rotation={[Math.PI / 2.35, 0.15, 0.2]}>
      {colors.map((c, i) => (
        <mesh key={c} rotation={[0, 0, 0]}>
          <ringGeometry args={[1.7 + i * 0.12, 1.78 + i * 0.12, 128]} />
          <meshBasicMaterial color={c} transparent opacity={0.55 - i * 0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Ember() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.2 + Math.random() * 4.5;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.04;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.018} color="#ff6b1a" transparent opacity={0.7} />
    </points>
  );
}

export function SaturnScene({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0.4, 5.2], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={["#050505"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[4, 3, 5]} intensity={40} color="#f0d78c" />
        <pointLight position={[-5, -2, -3]} intensity={18} color="#ff3b1a" />
        <Stars radius={80} depth={40} count={2500} factor={3} fade speed={0.4} />
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
          <group position={[0.15, 0.05, 0]}>
            <SaturnBody />
            <Rings />
            <Ember />
          </group>
        </Float>
      </Canvas>
    </div>
  );
}

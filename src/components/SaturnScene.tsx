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
    uniforms.uTime.value += delta * 0.12;
    if (mesh.current) mesh.current.rotation.y += delta * 0.04;
  });

  return (
    <mesh ref={mesh} castShadow>
      <sphereGeometry args={[1.42, 128, 128]} />
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
            float bands = sin(vPos.y * 12.0 + uTime) * 0.5 + 0.5;
            float fine = sin(vPos.y * 42.0 + uTime * 1.4) * 0.08;
            vec3 black = vec3(0.04, 0.03, 0.028);
            vec3 gold = vec3(0.86, 0.72, 0.28);
            vec3 cream = vec3(0.95, 0.88, 0.62);
            vec3 orange = vec3(0.98, 0.42, 0.1);
            vec3 red = vec3(0.72, 0.1, 0.12);
            vec3 col = mix(black, gold, bands);
            col = mix(col, cream, smoothstep(0.4, 0.75, bands) * 0.35);
            col = mix(col, orange, smoothstep(0.55, 0.92, bands) * 0.5);
            col = mix(col, red, smoothstep(0.84, 1.0, bands) * 0.28);
            col += cream * fine;
            float light = pow(max(dot(vNormal, normalize(vec3(0.65, 0.45, 0.85))), 0.0), 1.35);
            float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
            col += gold * light * 0.42;
            col += orange * rim * 0.5;
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
    if (ref.current) ref.current.rotation.z += d * 0.06;
  });
  const colors = ["#f6e7b2", "#d4af37", "#f0d78c", "#ff8a3a", "#c1121f", "#fff6d6", "#8a6c12", "#e8c547"];
  return (
    <group ref={ref} rotation={[Math.PI / 2.32, 0.18, 0.22]}>
      {colors.map((c, i) => (
        <mesh key={`${c}-${i}`}>
          <ringGeometry args={[1.72 + i * 0.11, 1.8 + i * 0.11, 160]} />
          <meshBasicMaterial color={c} transparent opacity={0.62 - i * 0.045} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Ember() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.15 + Math.random() * 5.2;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.035;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.016} color="#f0d78c" transparent opacity={0.75} />
    </points>
  );
}

export function SaturnScene({
  className = "",
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "full";
}) {
  const groupPos: [number, number, number] = variant === "hero" ? [1.45, 0.08, 0] : [0.12, 0.04, 0];
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0.35, 5.1], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#05040a"]} />
        <ambientLight intensity={0.32} />
        <pointLight position={[4.2, 3.2, 5]} intensity={48} color="#f0d78c" />
        <pointLight position={[-5, -2, -3]} intensity={16} color="#ff3b1a" />
        <pointLight position={[0, 4, 1]} intensity={10} color="#fff6d6" />
        <Stars radius={90} depth={46} count={3200} factor={3.2} fade speed={0.28} />
        <Float speed={0.9} rotationIntensity={0.12} floatIntensity={0.22}>
          <group position={groupPos} rotation={[0.08, -0.18, 0.04]}>
            <SaturnBody />
            <Rings />
            <Ember />
          </group>
        </Float>
      </Canvas>
    </div>
  );
}

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
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
    uniforms.uTime.value += delta * 0.08;
    if (mesh.current) mesh.current.rotation.y += delta * 0.028;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1.42, 64, 64]} />
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
            vec3 black = vec3(0.04, 0.03, 0.028);
            vec3 gold = vec3(0.86, 0.72, 0.28);
            vec3 cream = vec3(0.95, 0.88, 0.62);
            vec3 orange = vec3(0.98, 0.42, 0.1);
            vec3 col = mix(black, gold, bands);
            col = mix(col, cream, smoothstep(0.4, 0.75, bands) * 0.35);
            col = mix(col, orange, smoothstep(0.55, 0.92, bands) * 0.45);
            float light = pow(max(dot(vNormal, normalize(vec3(0.65, 0.45, 0.85))), 0.0), 1.35);
            float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
            col += gold * light * 0.42;
            col += orange * rim * 0.4;
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
    if (ref.current) ref.current.rotation.z += d * 0.035;
  });
  const colors = ["#f6e7b2", "#d4af37", "#f0d78c", "#ff8a3a"];
  return (
    <group ref={ref} rotation={[Math.PI / 2.32, 0.18, 0.22]}>
      {colors.map((c, i) => (
        <mesh key={`${c}-${i}`}>
          <ringGeometry args={[1.72 + i * 0.14, 1.82 + i * 0.14, 80]} />
          <meshBasicMaterial color={c} transparent opacity={0.58 - i * 0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Ember() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 220;
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
    if (ref.current) ref.current.rotation.y += d * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.018} color="#f0d78c" transparent opacity={0.7} />
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
  const host = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(true);
  const groupPos: [number, number, number] = variant === "hero" ? [1.45, 0.08, 0] : [0.12, 0.04, 0];

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlay(!motion.matches);
    sync();
    motion.addEventListener("change", sync);
    const io = new IntersectionObserver(([entry]) => setPlay(entry.isIntersecting && !motion.matches), {
      threshold: 0.12,
    });
    io.observe(node);
    return () => {
      motion.removeEventListener("change", sync);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={host} className={`${className} saturn-canvas`}>
      <Canvas
        camera={{ position: [0, 0.35, 5.1], fov: 40 }}
        dpr={[1, 1.25]}
        frameloop={play ? "always" : "demand"}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#05040a"]} />
        <ambientLight intensity={0.32} />
        <pointLight position={[4.2, 3.2, 5]} intensity={42} color="#f0d78c" />
        <pointLight position={[-5, -2, -3]} intensity={12} color="#ff3b1a" />
        <Stars radius={80} depth={40} count={900} factor={2.6} fade speed={0.12} />
        <group position={groupPos} rotation={[0.08, -0.18, 0.04]}>
          <SaturnBody />
          <Rings />
          <Ember />
        </group>
      </Canvas>
    </div>
  );
}

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useEcoStore from '../store/useEcoStore';

const SOURCE_POSITIONS = {
  solar: [-18, 0, -10],
  wind: [18, 0, -10],
  hydro: [-18, 0, 10],
  gas: [18, 0, 10],
};

const SOURCE_COLORS = {
  solar: { base: [0.6, 0.5, 0.0], glow: [1.0, 0.85, 0.0] },
  wind: { base: [0.0, 0.4, 0.6], glow: [0.0, 0.83, 1.0] },
  hydro: { base: [0.0, 0.2, 0.6], glow: [0.0, 0.4, 1.0] },
  gas: { base: [0.6, 0.25, 0.0], glow: [1.0, 0.42, 0.0] },
  branch: { base: [0.0, 0.4, 0.6], glow: [0.0, 0.83, 1.0] },
  backup: { base: [0.0, 0.6, 0.4], glow: [0.0, 1.0, 0.63] }
};

function dist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function EnergyWire({ source, target, colorTheme, active, intensity, radius, reverseDirection = false, maxHeight = 0.4 }) {
  const meshRef = useRef();
  const matRef = useRef();

  const colors = SOURCE_COLORS[colorTheme] || SOURCE_COLORS.branch;

  const { geometry } = useMemo(() => {
    const start = new THREE.Vector3(...source);
    start.y = 0.15;
    const end = new THREE.Vector3(...target);
    end.y = 0.15;

    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y = maxHeight; 

    const c = new THREE.CatmullRomCurve3([start, mid, end], false, 'catmullrom', 0.5);
    return { geometry: new THREE.TubeGeometry(c, 24, radius, 5, false) };
  }, [source[0], source[2], target[0], target[2], radius, maxHeight]);

  const uniforms = useMemo(() => ({
    uTime: { value: Math.random() * 10 },
    uBaseColor: { value: new THREE.Vector3(...colors.base) },
    uGlowColor: { value: new THREE.Vector3(...colors.glow) },
    uIntensity: { value: intensity },
    uActive: { value: active ? 1.0 : 0.0 },
    uDirection: { value: reverseDirection ? -1.0 : 1.0 }
  }), [colors, reverseDirection]);

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
      
      matRef.current.uniforms.uActive.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uActive.value,
        active ? 1.0 : 0.0,
        0.05
      );
      matRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uIntensity.value,
        intensity,
        0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uBaseColor;
          uniform vec3 uGlowColor;
          uniform float uIntensity;
          uniform float uActive;
          uniform float uDirection;
          varying vec2 vUv;

          void main() {
            // Very slow, calm pulse
            float pulse = sin((vUv.x * uDirection) * 8.0 - uTime * 0.4);
            float glow = smoothstep(0.3, 0.7, pulse) * uIntensity;
            
            vec3 color = mix(uBaseColor * 0.3, uGlowColor, glow);
            
            // Fade to 0.08 on toggle off
            float baseAlpha = mix(0.08, 0.6, uActive); 
            float alpha = baseAlpha + glow * 0.3 * uActive;
            
            gl_FragColor = vec4(color, alpha);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function NeuralWires() {
  const buildings = useEcoStore((s) => s.buildings);
  const powerSources = useEcoStore((s) => s.powerSources);
  const connections = useEcoStore((s) => s.connections);

  const buildingMap = useMemo(() => {
    const map = new Map();
    buildings.forEach(b => map.set(b.id, b));
    return map;
  }, [buildings]);

  const activeBuildings = useMemo(() => buildings.filter(b => b.active), [buildings]);

  // 1. Trunk mapping: Each power node targets its 3-4 nearest active buildings dynamically
  const trunkWires = useMemo(() => {
    const wires = [];
    Object.keys(SOURCE_POSITIONS).forEach((sourceType) => {
      const sourcePos = SOURCE_POSITIONS[sourceType];
      
      // Calculate distances from source to all active buildings
      const targets = activeBuildings
        .map(b => ({ id: b.id, pos: b.position, dist: dist(sourcePos, b.position) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3); // top 3 nearest active buildings
        
      targets.forEach(t => {
        wires.push({
          id: `trunk-${sourceType}-${t.id}`,
          sourceType,
          source: sourcePos,
          target: t.pos
        });
      });
    });
    return wires;
  }, [activeBuildings]);

  // 2. Branch mapping: From dynamic connection graph
  const branchWires = useMemo(() => {
    return connections.filter(c => buildingMap.has(c.fromId) && buildingMap.has(c.toId)).map(c => {
      const b1 = buildingMap.get(c.fromId);
      const b2 = buildingMap.get(c.toId);
      return {
        id: `branch-${c.key}`,
        source: b1.position,
        target: b2.position,
        active: b1.active && b2.active
      };
    });
  }, [connections, buildingMap]);

  // 3. Backup Blockchain Routing
  const backupWires = useMemo(() => {
    const wires = [];
    buildings.forEach(b => {
      if (!b.active && b.blockchainBackupActive && b.backupNode && b.backupNode !== "SYSTEM-GRID") {
         // find the backup node
         const backupSource = buildings.find(x => x.code === b.backupNode);
         if (backupSource) {
            wires.push({
               id: `backup-${b.id}`,
               source: backupSource.position,
               target: b.position
            });
         }
      }
    });
    return wires;
  }, [buildings]);

  return (
    <group>
      {/* 1. Trunk Wires */}
      {trunkWires.map(({ id, sourceType, source, target }) => {
        const ps = powerSources[sourceType];
        return (
          <EnergyWire
            key={id}
            source={source}
            target={target}
            colorTheme={sourceType}
            active={ps.active && ps.output_kw > 0}
            intensity={ps.active ? ps.output_kw / (ps.max_kw || 1) : 0}
            radius={0.07}
            maxHeight={0.8}
          />
        );
      })}

      {/* 2. Branch Wires */}
      {branchWires.map(({ id, source, target, active }) => (
        <EnergyWire
          key={id}
          source={source}
          target={target}
          colorTheme="branch"
          active={active}
          intensity={active ? 0.6 : 0}
          radius={0.025}
          maxHeight={0.4}
        />
      ))}

      {/* 3. Backup Wires (Reverse flow) */}
      {backupWires.map(({ id, source, target }) => (
        <EnergyWire
          key={id}
          source={source} // source is the nearest active building
          target={target} // target is the offline building
          colorTheme="backup"
          active={true}
          intensity={0.8}
          radius={0.03}
          maxHeight={0.5}
          reverseDirection={false} // flow goes FROM backupSource TO offline
        />
      ))}
    </group>
  );
}

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useEcoStore from '../store/useEcoStore';

export default function Particles() {
  const tradeLog = useEcoStore((s) => s.tradeLog);
  const pointsRef = useRef();
  const count = 40;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = 0.2 + Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    const palette = [
      [0, 0.83, 1],    // cyan
      [0, 0.96, 0.63],  // green
      [1, 0.84, 0],     // gold
      [0, 0.4, 1],      // blue
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[i % palette.length];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return col;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      // Gentle floating motion
      pos[i * 3] += Math.sin(state.clock.elapsedTime + i) * 0.005;
      pos[i * 3 + 1] += 0.008;
      pos[i * 3 + 2] += Math.cos(state.clock.elapsedTime + i * 0.5) * 0.005;

      // Reset when too high
      if (pos[i * 3 + 1] > 5) {
        pos[i * 3 + 1] = 0.2;
        pos[i * 3] = (Math.random() - 0.5) * 30;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        transparent
        opacity={0.5}
        depthWrite={false}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useEcoStore from '../store/useEcoStore';

function CloudLayer() {
  const meshRef1 = useRef();
  const meshRef2 = useRef();

  useFrame((state, delta) => {
    if (meshRef1.current) {
      meshRef1.current.position.x -= delta * 0.5;
      if (meshRef1.current.position.x < -150) meshRef1.current.position.x = 150;
    }
    if (meshRef2.current) {
       meshRef2.current.position.x -= delta * 0.3;
       if (meshRef2.current.position.x < -150) meshRef2.current.position.x = 150;
    }
  });

  return (
    <group position={[0, 25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={meshRef1} position={[0, 0, -1]}>
         <planeGeometry args={[150, 150, 1, 1]} />
         <meshBasicMaterial color="#111522" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef2} position={[50, 20, -2]}>
         <planeGeometry args={[100, 100, 1, 1]} />
         <meshBasicMaterial color="#0b0e1a" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

function RainSystem() {
  const pointsRef = useRef();
  const count = 600;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] -= delta * 15; // Fast falling rain
      // Adding wind effect
      pos[i - 1] -= delta * 3.0; 
      
      if (pos[i] < 0) {
        pos[i] = 40;
        pos[i - 1] = (Math.random() - 0.5) * 60;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#88aacc" size={0.15} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function SnowSystem() {
  const pointsRef = useRef();
  const count = 800;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx + 1] -= delta * 6.0;
      pos[idx] += Math.sin(t + i) * 0.05 - (delta * 2); // Windy snow
      pos[idx + 2] += Math.cos(t + i) * 0.05;
      
      if (pos[idx + 1] < 0) {
        pos[idx + 1] = 40;
        pos[idx] = (Math.random() - 0.5) * 80 + 20; 
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.2} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Lightning() {
  const flashMesh = useRef();
  const flashLight = useRef();
  const lightningTimer = useRef(0);
  const nextFlash = useRef(3 + Math.random() * 5);

  useFrame((_, delta) => {
    lightningTimer.current += delta;
    if (lightningTimer.current > nextFlash.current) {
      if (flashMesh.current && flashLight.current) {
          flashMesh.current.visible = true;
          flashLight.current.intensity = 2.0;
          setTimeout(() => {
            if (flashMesh.current && flashLight.current) {
              flashMesh.current.visible = false;
              flashLight.current.intensity = 0.0;
            }
          }, 120);
      }
      lightningTimer.current = 0;
      nextFlash.current = 3 + Math.random() * 5;
    }
  });

  return (
    <group>
        <mesh ref={flashMesh} position={[(Math.random()-0.5)*30, 10, (Math.random()-0.5)*30]} visible={false}>
            <planeGeometry args={[1, 20]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <ambientLight ref={flashLight} intensity={0} color="#ffffff" />
    </group>
  );
}

function WindStreaks() {
  const pointsRef = useRef();
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] += delta * 60; // Fast horizontal movement
      
      if (pos[i] > 40) {
        pos[i] = -40;
        pos[i + 1] = Math.random() * 20;
        pos[i + 2] = (Math.random() - 0.5) * 80;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.3} transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// Ambient floating particles
function AmbientParticles() {
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

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx] += Math.sin(t + i) * 0.005;
      pos[idx + 1] += delta * 0.4;
      pos[idx + 2] += Math.cos(t + i * 0.5) * 0.005;

      if (pos[idx + 1] > 5) {
        pos[idx + 1] = 0.2;
        pos[idx] = (Math.random() - 0.5) * 30;
        pos[idx + 2] = (Math.random() - 0.5) * 20;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} transparent opacity={0.5} depthWrite={false} vertexColors blending={THREE.AdditiveBlending} />
    </points>
  );
}

export default function WeatherEffects() {
  const weatherOverride = useEcoStore((s) => s.weatherOverride);
  const showAmbient = weatherOverride !== 'THUNDERSTORM' && weatherOverride !== 'BLIZZARD';

  return (
    <>
      {showAmbient && <AmbientParticles />}

      {weatherOverride === 'OVERCAST' && (
        <CloudLayer />
      )}

      {weatherOverride === 'THUNDERSTORM' && (
        <>
          <CloudLayer />
          <RainSystem />
          <Lightning />
        </>
      )}

      {weatherOverride === 'BLIZZARD' && (
        <>
          <CloudLayer />
          <SnowSystem />
        </>
      )}

      {weatherOverride === 'PERFECT_WIND' && (
        <WindStreaks />
      )}
    </>
  );
}

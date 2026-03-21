import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from './Building';
import type { BuildingTelemetry } from '@/types';

interface CityGridProps {
  buildings: BuildingTelemetry[];
  onBuildingClick?: (data: BuildingTelemetry) => void;
}

// Animated energy particles flowing between buildings
function EnergyParticles() {
  const pointsRef    = useRef<THREE.Points>(null);
  const particleCount = 50;           // was 100 — halved for performance
  const frameRef     = useRef(0);     // for throttling drift calculation

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      // Green for energy flow
      colors[i * 3] = 0.13;
      colors[i * 3 + 1] = 0.77;
      colors[i * 3 + 2] = 0.37;
    }

    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      frameRef.current++;
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const computeDrift = frameRef.current % 2 === 0; // drift only every other frame
      
      for (let i = 0; i < particleCount; i++) {
        // Animate particles flowing upward
        positions[i * 3 + 1] += 0.02;
        
        // Reset if too high
        if (positions[i * 3 + 1] > 5) {
          positions[i * 3 + 1] = 0;
        }

        // Slight horizontal drift (throttled — sin/cos every other frame)
        if (computeDrift) {
          const t = state.clock.elapsedTime;
          positions[i * 3]     += Math.sin(t + i) * 0.002;
          positions[i * 3 + 2] += Math.cos(t + i) * 0.002;
        }
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Grid floor with glowing scanner effect
function GridFloor() {
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (scanRef.current) {
      // Create a sweeping radar/scanline effect
      scanRef.current.position.z = (Math.sin(state.clock.elapsedTime * 0.5) * 20);
    }
  });

  return (
    <group>
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.8}
        cellColor="#059669"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#10b981"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />
      
      {/* Glowing base plane */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial
          color="#022c22"
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Scanning radar line */}
      <mesh ref={scanRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 2]} />
        <meshBasicMaterial
          color="#34d399"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Scene content
function Scene({ buildings, onBuildingClick }: CityGridProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Arrange buildings in a grid pattern
  const buildingPositions = useMemo(() => {
    const positions: { [key: number]: [number, number, number] } = {};
    const cols = 10;
    const spacing = 2;
    const offsetX = ((cols - 1) * spacing) / 2;
    const offsetZ = ((Math.ceil(buildings.length / cols) - 1) * spacing) / 2;

    buildings.forEach((building, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positions[building.building_id] = [
        col * spacing - offsetX,
        0,
        row * spacing - offsetZ
      ];
    });

    return positions;
  }, [buildings.length]);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation of the entire city
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <GridFloor />
      <EnergyParticles />
      
      {buildings.map((building) => (
        <Building
          key={building.building_id}
          data={building}
          position={buildingPositions[building.building_id] || [0, 0, 0]}
          onClick={onBuildingClick}
        />
      ))}

      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        color="#ffffff"
      />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#00ff00" />
      
      {/* Stars background */}
      <Stars
        radius={50}
        depth={50}
        count={1000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </group>
  );
}

// Main CityGrid component
export function CityGrid({ buildings, onBuildingClick }: CityGridProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
        dpr={[1, 1.5]}                          // cap pixel ratio for performance
        performance={{ min: 0.5 }}              // auto scale-down on slow GPU
      >
        <Scene buildings={buildings} onBuildingClick={onBuildingClick} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
    </div>
  );
}

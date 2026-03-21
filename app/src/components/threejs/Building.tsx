import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import type { BuildingTelemetry } from '@/types';

interface BuildingProps {
  data: BuildingTelemetry;
  position: [number, number, number];
  onClick?: (data: BuildingTelemetry) => void;
}

export function Building({ data, position, onClick }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Group>(null);
  const topRef = useRef<THREE.Mesh>(null);

  // Determine building color based on state
  const { color, emissive, height, scaleY } = useMemo(() => {
    let color = '#3b82f6'; // Default blue
    let emissive = '#1e40af';
    let height = 1;
    let scaleY = 1;

    if (data.is_critical) {
      color = '#ef4444'; // Red for critical
      emissive = '#dc2626';
      height = 1.5;
    } else if (data.is_selling) {
      color = '#22c55e'; // Green for selling
      emissive = '#16a34a';
      height = 1.2 + (data.battery_soc / 100) * 0.4;
      scaleY = 1 + (data.battery_soc / 100) * 0.3;
    } else if (data.is_buying) {
      color = '#f59e0b'; // Amber for buying
      emissive = '#d97706';
      height = 0.9;
    } else if (data.is_priority) {
      color = '#a855f7'; // Purple for priority buildings
      emissive = '#7c3aed';
      height = 1.6;
    }

    // Adjust height based on building type
    switch (data.building_type) {
      case 'hospital':
        height *= 2;
        break;
      case 'datacenter':
        height *= 1.8;
        break;
      case 'commercial':
        height *= 1.4;
        break;
      case 'residential':
        height *= 0.9;
        break;
      default:
        height *= 1.1;
    }

    return { color, emissive, height, scaleY };
  }, [data]);

  // Generate procedural window texture
  const windowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#0f172a'; // Dark base
      context.fillRect(0, 0, 128, 128);
      
      // Determine window color based on building status
      const winColor = data.is_critical ? '#ef4444' : 
                      (data.is_selling ? '#4ade80' : 
                      (data.is_buying ? '#fcd34d' : '#38bdf8'));
      
      context.fillStyle = winColor;
      
      // Draw grid of windows
      for(let x=8; x<128; x+=24) {
        for(let y=8; y<128; y+=28) {
          // Randomly turn off some windows for realism
          if (Math.random() > 0.2) {
            context.fillRect(x, y, 12, 16);
            // Add a brighter core to the window
            context.fillStyle = '#ffffff';
            context.fillRect(x+2, y+2, 8, 12);
            context.fillStyle = winColor;
          }
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, height * scaleY * 1.5);
    return tex;
  }, [data.is_critical, data.is_selling, data.is_buying, height, scaleY]);

  // Animate the building
  useFrame((state) => {
    if (meshRef.current) {
      if (data.is_critical) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.05;
        meshRef.current.scale.setScalar(pulse);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }

    if (glowRef.current) {
      glowRef.current.rotation.y += 0.02;
      glowRef.current.position.y = (height / 2) + Math.sin(state.clock.elapsedTime * 2 + data.building_id) * 0.15;
    }
    
    if (topRef.current) {
      topRef.current.rotation.y -= 0.03;
    }
  });

  return (
    <group position={position}>
      {/* Main Building Base */}
      <mesh
        ref={meshRef}
        position={[0, (height * scaleY) / 2, 0]}
        onClick={() => onClick?.(data)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.8, height * scaleY, 0.8]} />
        <meshStandardMaterial
          color={color}
          map={windowTexture}
          emissive={emissive}
          emissiveIntensity={0.6}
          emissiveMap={windowTexture}
          roughness={0.2}
          metalness={0.9}
        />
        <Edges scale={1.01} color={emissive} />
      </mesh>

      {/* Building core / tower top */}
      <mesh ref={topRef} position={[0, height * scaleY + 0.25, 0]}>
        <cylinderGeometry args={[0.15, 0.35, 0.5, 4]} />
        <meshStandardMaterial 
          color={emissive} 
          emissive={emissive} 
          emissiveIntensity={1.2} 
        />
        <Edges scale={1.05} color="#ffffff" />
      </mesh>

      {/* Holographic rings for active buildings */}
      {(data.is_selling || data.is_buying || data.is_critical) && (
        <group ref={glowRef} position={[0, height / 2, 0]}>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.7, 0.02, 16, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.9, 0.01, 16, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* Energy flow indicator beacon */}
      {data.net_energy !== 0 && (
        <mesh position={[0, height * scaleY + 0.8, 0]}>
          <sphereGeometry args={[data.is_critical ? 0.2 : 0.12, 16, 16]} />
          <meshBasicMaterial
            color={data.net_energy > 0 ? '#22c55e' : '#f59e0b'}
          />
        </mesh>
      )}

      {/* Ground Projection / Base Plate */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial color={emissive} transparent opacity={data.is_critical ? 0.6 : 0.2} />
      </mesh>
      
      {/* Sub-grid lines for base plate */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

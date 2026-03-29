import { useEffect, useRef, useMemo, useCallback, Suspense, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useEcoStore } from '@/store/useEcoStore'
import type { SimBuilding } from '@/store/useEcoStore'
import SidePanel from './SidePanel'
import BuildingPopup from './BuildingPopup'

const UI = 'Inter,sans-serif'

/* ═══════════════════════════════════════════════════════
   GRID FLOOR
   ═══════════════════════════════════════════════════════ */
function GridFloor() {
  const scanRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (scanRef.current) {
      scanRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.4) * 20
    }
  })

  return (
    <group>
      <gridHelper args={[40, 40, '#00D4FF', '#00D4FF']} position={[0, 0.01, 0]}>
        <meshBasicMaterial attach="material" color="#00D4FF" transparent opacity={0.06} />
      </gridHelper>
      <gridHelper args={[40, 8, '#00D4FF', '#00D4FF']} position={[0, 0.02, 0]}>
        <meshBasicMaterial attach="material" color="#00D4FF" transparent opacity={0.12} />
      </gridHelper>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0f1f35" roughness={0.9} />
      </mesh>
      <mesh ref={scanRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 1.5]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.04} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   PROCEDURAL WINDOW TEXTURE
   ═══════════════════════════════════════════════════════ */
function makeWindowTex(color: string, h: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0c1a2e'
  ctx.fillRect(0, 0, 64, 128)
  const rows = Math.max(3, Math.floor(h * 4))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < 3; x++) {
      if (Math.random() > 0.2) {
        const bright = Math.random() > 0.5 ? color : '#1a3050'
        ctx.fillStyle = bright
        ctx.fillRect(8 + x * 18, 6 + y * (120 / rows), 12, Math.min(10, 120 / rows - 3))
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1)
  return tex
}

/* ═══════════════════════════════════════════════════════
   BUILDING COMPONENT — polished shapes
   ═══════════════════════════════════════════════════════ */
function Building3D({ building, onClick }: { building: SimBuilding; onClick: (b: SimBuilding) => void }) {
  const activeLocation = useEcoStore(s => s.activeLocation)
  const meshRef = useRef<THREE.Group>(null)
  const seedRef = useRef(Math.random() * Math.PI * 2)

  const config = useMemo(() => {
    let heightMod = 1.0;
    let widthMod = 1.0;
    
    if (activeLocation) {
      const locName = activeLocation.name;
      if (['New York', 'Tokyo', 'Dubai', 'Singapore'].includes(locName)) {
        heightMod = 2.0; widthMod = 0.8;
      } else if (['Paris', 'London', 'Berlin'].includes(locName)) {
        heightMod = 0.7; widthMod = 1.3;
      } else if (['Mumbai', 'New Delhi', 'São Paulo'].includes(locName)) {
        heightMod = 1.2; widthMod = 1.0;
      } else {
        heightMod = 1.0; widthMod = 1.1; // Default/Sprawling
      }
    }

    const t = building.type
    const baseW = (t === 'hospital' ? 1.5 : t === 'commercial' ? 0.85 : 0.65) * widthMod
    const baseD = (t === 'hospital' ? 1.1 : t === 'commercial' ? 0.85 : 0.65) * widthMod
    const baseH = (t === 'hospital' ? 2.2
      : t === 'commercial' ? 1.6 + (building.id % 7) * 0.3
      : 0.7 + (building.id % 5) * 0.2) * heightMod
    const color = t === 'hospital' ? '#c93545' : t === 'commercial' ? '#2596be' : '#28a870'
    const emissive = t === 'hospital' ? '#8c1a25' : t === 'commercial' ? '#1a6080' : '#1a704a'
    const winColor = t === 'hospital' ? '#ff8888' : t === 'commercial' ? '#66ccee' : '#77ddaa'
    return { w: baseW, d: baseD, h: baseH, color, emissive, winColor }
  }, [building.type, building.id, activeLocation])

  const windowTex = useMemo(() => makeWindowTex(config.winColor, config.h), [config.winColor, config.h])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    if (building.active && building.isCritical && !building.isDestroyed) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 4 + seedRef.current) * 0.03)
    }
  })

  const emI = building.active ? (building.isCritical ? 0.8 : 0.35) : 0.03

  if (building.isDestroyed) {
    return (
      <group position={[building.x, 0, building.z]} rotation={[0, building.rotY, 0]}>
        <mesh position={[0, 0.3, 0]} rotation={[Math.random(), Math.random(), 0]}>
          <icosahedronGeometry args={[config.w * 0.7, 0]} />
          <meshStandardMaterial color="#1a1a1a" emissive="#551100" emissiveIntensity={0.6} roughness={1} />
        </mesh>
        <mesh position={[config.w * 0.3, 0.15, config.d * 0.3]}>
          <boxGeometry args={[config.w * 0.5, 0.3, config.d * 0.5]} />
          <meshStandardMaterial color="#2a2a2a" roughness={1} />
        </mesh>
        <pointLight position={[0, 0.5, 0]} color="#FF6B00" intensity={2} distance={3} />
      </group>
    )
  }

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, building.rotY, 0]}>
      <group ref={meshRef}>
        {/* ── RESIDENTIAL ── */}
        {building.type === 'residential' && (
          <>
            {/* Main body */}
            <mesh position={[0, config.h / 2, 0]}
              onClick={e => { e.stopPropagation(); onClick(building) }}
              onPointerOver={() => document.body.style.cursor = 'pointer'}
              onPointerOut={() => document.body.style.cursor = 'auto'}
            >
              <boxGeometry args={[config.w, config.h, config.d]} />
              <meshStandardMaterial color={config.color} emissive={config.emissive} emissiveIntensity={emI}
                map={windowTex} roughness={0.6} metalness={0.2}
                transparent={!building.active} opacity={building.active ? 1 : 0.2} />
            </mesh>
            {/* Pitched roof */}
            <mesh position={[0, config.h + 0.2, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[config.w * 0.58, 0.4, 4]} />
              <meshStandardMaterial color="#3a5040" roughness={0.8} />
            </mesh>
            {/* Door */}
            <mesh position={[0, 0.15, config.d / 2 + 0.01]}>
              <planeGeometry args={[0.15, 0.3]} />
              <meshStandardMaterial color="#443322" />
            </mesh>
          </>
        )}

        {/* ── COMMERCIAL ── */}
        {building.type === 'commercial' && (
          <>
            {/* Main tower */}
            <mesh position={[0, config.h / 2, 0]}
              onClick={e => { e.stopPropagation(); onClick(building) }}
              onPointerOver={() => document.body.style.cursor = 'pointer'}
              onPointerOut={() => document.body.style.cursor = 'auto'}
            >
              <boxGeometry args={[config.w, config.h, config.d]} />
              <meshStandardMaterial color={config.color} emissive={config.emissive} emissiveIntensity={emI}
                map={windowTex} roughness={0.15} metalness={0.85}
                transparent={!building.active} opacity={building.active ? 1 : 0.2} />
            </mesh>
            {/* Roof crown — stepped setback */}
            <mesh position={[0, config.h + 0.08, 0]}>
              <boxGeometry args={[config.w * 0.75, 0.16, config.d * 0.75]} />
              <meshStandardMaterial color="#1a3050" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Rooftop unit */}
            <mesh position={[config.w * 0.15, config.h + 0.25, 0]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color="#445566" />
            </mesh>
            {/* Antenna */}
            <mesh position={[-config.w * 0.15, config.h + 0.35, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Window strip accents */}
            {[0.3, 0.55, 0.8].map(frac => (
              <mesh key={frac} position={[config.w / 2 + 0.005, config.h * frac, 0]}>
                <planeGeometry args={[0.01, 0.03]} />
                <meshBasicMaterial color={config.winColor} transparent opacity={0.5} />
              </mesh>
            ))}
          </>
        )}

        {/* ── HOSPITAL ── */}
        {building.type === 'hospital' && (
          <>
            {/* Main wing */}
            <mesh position={[0, config.h / 2, 0]}
              onClick={e => { e.stopPropagation(); onClick(building) }}
              onPointerOver={() => document.body.style.cursor = 'pointer'}
              onPointerOut={() => document.body.style.cursor = 'auto'}
            >
              <boxGeometry args={[config.w, config.h, config.d]} />
              <meshStandardMaterial color={config.color} emissive={config.emissive} emissiveIntensity={emI}
                map={windowTex} roughness={0.5} metalness={0.3}
                transparent={!building.active} opacity={building.active ? 1 : 0.2} />
            </mesh>
            {/* Side wing (L-shape) */}
            <mesh position={[config.w * 0.55, config.h * 0.35, config.d * 0.15]}>
              <boxGeometry args={[config.w * 0.5, config.h * 0.7, config.d * 0.7]} />
              <meshStandardMaterial color={config.color} emissive={config.emissive} emissiveIntensity={emI}
                roughness={0.5} metalness={0.3} transparent={!building.active} opacity={building.active ? 1 : 0.2} />
            </mesh>
            {/* Flat roof */}
            <mesh position={[0, config.h + 0.03, 0]}>
              <boxGeometry args={[config.w + 0.06, 0.06, config.d + 0.06]} />
              <meshStandardMaterial color="#555555" roughness={0.9} />
            </mesh>
            {/* Red cross on roof */}
            <mesh position={[0, config.h + 0.1, 0]}>
              <boxGeometry args={[0.4, 0.08, 0.1]} />
              <meshStandardMaterial color="#ff3333" emissive="#ff2222" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, config.h + 0.1, 0]}>
              <boxGeometry args={[0.1, 0.08, 0.4]} />
              <meshStandardMaterial color="#ff3333" emissive="#ff2222" emissiveIntensity={1.2} />
            </mesh>
            {/* Helipad ring */}
            <mesh position={[-config.w * 0.2, config.h + 0.07, -config.d * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.12, 0.16, 16]} />
              <meshBasicMaterial color="#ffcc00" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
          </>
        )}

        {/* Ground plate */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[config.w + 0.3, config.d + 0.3]} />
          <meshBasicMaterial color={config.emissive} transparent opacity={building.active ? 0.12 : 0.03} />
        </mesh>

        {/* Battery bar */}
        {building.active && (
          <mesh position={[config.w / 2 + 0.06, config.h * (building.battery_soc / 200), 0]}>
            <boxGeometry args={[0.04, config.h * (building.battery_soc / 100), 0.04]} />
            <meshBasicMaterial color={building.battery_soc > 50 ? '#00F5A0' : building.battery_soc > 20 ? '#FFD700' : '#FF4444'} />
          </mesh>
        )}
      </group>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   NEURAL WIRES (P2P mesh)
   ═══════════════════════════════════════════════════════ */
function NeuralWires({ buildings }: { buildings: SimBuilding[] }) {
  const geos = useMemo(() => {
    if (buildings.length < 2) return []
    const connections: { i: number; j: number }[] = []
    const seen = new Set<string>()
    buildings.forEach((b, i) => {
      buildings
        .map((o, j) => ({ j, d: Math.hypot(b.x - o.x, b.z - o.z) }))
        .filter(x => x.j !== i)
        .sort((a, c) => a.d - c.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const k = `${Math.min(i, j)}-${Math.max(i, j)}`
          if (!seen.has(k)) { seen.add(k); connections.push({ i, j }) }
        })
    })
    return connections.map(({ i, j }) => {
      const a = buildings[i], b = buildings[j]
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.x, 0.15, a.z),
        new THREE.Vector3(mx, 0.35, mz),
        new THREE.Vector3(b.x, 0.15, b.z),
      ])
      return new THREE.TubeGeometry(curve, 16, 0.02, 3, false)
    })
  }, [buildings])

  const shaderMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      void main(){
        float p=sin(vUv.x*6.-uTime*0.3);
        float g=smoothstep(0.3,0.7,p);
        vec3 c=mix(vec3(0.,0.5,0.8)*0.12,vec3(0.,0.83,1.),g);
        gl_FragColor=vec4(c,0.25+g*0.35);
      }`,
    transparent: true, depthWrite: false,
  }), [])

  useFrame((s) => { shaderMat.uniforms.uTime.value = s.clock.elapsedTime })

  return (
    <group>
      {geos.map((geo, idx) => (
        <mesh key={idx} geometry={geo} material={shaderMat} />
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   POWER NODE — realistic factory structures
   ═══════════════════════════════════════════════════════ */
function PowerNode({ type, position }: { type: string; position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)
  const bladeRef = useRef<THREE.Group>(null)
  const sources = useEcoStore(s => s.powerSources)
  const toggleSource = useEcoStore(s => s.toggleSource)
  const active = sources[type]?.active ?? false

  const colors: Record<string, { main: string; glow: string }> = {
    solar: { main: '#FFD700', glow: '#b8960a' },
    wind: { main: '#00D4FF', glow: '#0088aa' },
    hydro: { main: '#0088FF', glow: '#004488' },
    gas: { main: '#FF6B00', glow: '#993d00' },
  }
  const c = colors[type] || colors.solar

  useFrame((state) => {
    if (bladeRef.current && type === 'wind') {
      bladeRef.current.rotation.z = state.clock.elapsedTime * (active ? 2.5 : 0.15)
    }
  })

  return (
    <group ref={groupRef} position={position}
      onClick={e => { e.stopPropagation(); toggleSource(type) }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* Concrete pad */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#1a2030" roughness={0.95} />
      </mesh>
      {/* Perimeter ring */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 2.1, 32]} />
        <meshBasicMaterial color={c.main} transparent opacity={active ? 0.2 : 0.04} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      {/* ── SOLAR ── */}
      {type === 'solar' && (
        <>
          {/* Support pole */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1, 8]} />
            <meshStandardMaterial color="#555" roughness={0.8} />
          </mesh>
          {/* Panel frame (tilted) */}
          <group position={[0, 1.05, 0]} rotation={[-0.5, 0, 0]}>
            {/* Frame */}
            <mesh>
              <boxGeometry args={[2.2, 0.05, 1.4]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Panel cells (2 rows) */}
            {[-0.3, 0.3].map(zOff => (
              <mesh key={zOff} position={[0, 0.03, zOff]}>
                <boxGeometry args={[2.0, 0.02, 0.5]} />
                <meshStandardMaterial color="#1a1a44" emissive={c.main} emissiveIntensity={active ? 0.5 : 0.03}
                  roughness={0.05} metalness={0.95} />
              </mesh>
            ))}
            {/* Grid lines on panel */}
            {[-0.8, -0.4, 0, 0.4, 0.8].map(x => (
              <mesh key={x} position={[x, 0.04, 0]}>
                <boxGeometry args={[0.01, 0.01, 1.3]} />
                <meshBasicMaterial color="#333" />
              </mesh>
            ))}
          </group>
        </>
      )}

      {/* ── WIND ── */}
      {type === 'wind' && (
        <>
          {/* Tower */}
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[0.08, 0.14, 4, 8]} />
            <meshStandardMaterial color="#d0d0d0" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Nacelle */}
          <mesh position={[0, 4.05, 0.1]}>
            <boxGeometry args={[0.25, 0.2, 0.5]} />
            <meshStandardMaterial color="#e8e8e8" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Hub */}
          <mesh position={[0, 4.05, 0.38]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#ccc" metalness={0.9} />
          </mesh>
          {/* Blades */}
          <group ref={bladeRef} position={[0, 4.05, 0.42]}>
            {[0, 120, 240].map(deg => (
              <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} position={[0, 0, 0]}>
                <boxGeometry args={[1.8, 0.08, 0.03]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
              </mesh>
            ))}
          </group>
        </>
      )}

      {/* ── HYDRO ── */}
      {type === 'hydro' && (
        <>
          {/* Dam wall */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[2.5, 1.2, 0.6]} />
            <meshStandardMaterial color="#556677" roughness={0.85} metalness={0.1} />
          </mesh>
          {/* Water behind dam */}
          <mesh position={[0, 0.5, -0.5]}>
            <boxGeometry args={[2.2, 0.8, 0.6]} />
            <meshStandardMaterial color="#1a4488" emissive={c.main} emissiveIntensity={active ? 0.3 : 0.02}
              transparent opacity={0.7} roughness={0.1} />
          </mesh>
          {/* Spillway */}
          <mesh position={[0, 0.3, 0.4]}>
            <boxGeometry args={[0.6, 0.3, 0.2]} />
            <meshStandardMaterial color={c.main} emissive={c.main} emissiveIntensity={active ? 0.4 : 0.02}
              transparent opacity={0.6} />
          </mesh>
          {/* Generator house */}
          <mesh position={[0, 0.3, 0.8]}>
            <boxGeometry args={[1.0, 0.6, 0.5]} />
            <meshStandardMaterial color="#445566" roughness={0.8} />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 0.65, 0.8]}>
            <boxGeometry args={[1.1, 0.06, 0.6]} />
            <meshStandardMaterial color="#334455" />
          </mesh>
        </>
      )}

      {/* ── GAS ── */}
      {type === 'gas' && (
        <>
          {/* Main tank */}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 2.0, 12]} />
            <meshStandardMaterial color="#554433" roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Tank rings */}
          {[0.3, 0.9, 1.5].map(y => (
            <mesh key={y} position={[0, y, 0]}>
              <torusGeometry args={[0.62, 0.02, 8, 24]} />
              <meshStandardMaterial color="#776655" roughness={0.5} metalness={0.5} />
            </mesh>
          ))}
          {/* Smokestack */}
          <mesh position={[0.5, 1.2, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 2.4, 8]} />
            <meshStandardMaterial color="#666" roughness={0.7} />
          </mesh>
          {/* Pipe connector */}
          <mesh position={[0.25, 0.6, 0.5]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
            <meshStandardMaterial color="#777" roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Flame glow */}
          {active && (
            <pointLight position={[0.5, 2.5, 0]} color="#FF6B00" intensity={3} distance={5} />
          )}
        </>
      )}

      {/* Status light on pad */}
      <pointLight position={[0, 0.3, 0]} color={c.main} intensity={active ? 0.8 : 0.05} distance={5} />
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   WEATHER EFFECTS
   ═══════════════════════════════════════════════════════ */
function WeatherEffects() {
  const weatherMode = useEcoStore(s => s.weatherMode)
  const ref = useRef<THREE.Points>(null)
  const count = 300

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50
      p[i * 3 + 1] = Math.random() * 30
      p[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return p
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const a = ref.current.geometry.attributes.position.array as Float32Array
    if (weatherMode === 'storm') {
      for (let i = 0; i < count; i++) { a[i*3+1] -= 0.5; if (a[i*3+1] < 0) a[i*3+1] = 30 }
      ref.current.geometry.attributes.position.needsUpdate = true
    } else if (weatherMode === 'blizzard') {
      for (let i = 0; i < count; i++) { a[i*3+1] -= 0.04; a[i*3] += Math.sin(i)*0.008; if (a[i*3+1]<0) a[i*3+1]=30 }
      ref.current.geometry.attributes.position.needsUpdate = true
    } else if (weatherMode === 'wind') {
      for (let i = 0; i < count; i++) { a[i*3] += 0.12; if (a[i*3]>25) a[i*3]=-25 }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (weatherMode === 'clear' || weatherMode === 'heatwave' || weatherMode === 'overcast') return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={weatherMode === 'storm' ? '#88bbff' : weatherMode === 'blizzard' ? '#fff' : '#aaddff'}
        size={weatherMode === 'blizzard' ? 0.3 : weatherMode === 'storm' ? 0.2 : 0.06} 
        transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function CloudSystem() {
  const wm = useEcoStore(s => s.weatherMode)
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.position.x += (wm === 'storm' || wm === 'wind' ? 0.05 : 0.01)
      if (ref.current.position.x > 40) ref.current.position.x = -60
    }
  })

  if (wm !== 'storm' && wm !== 'overcast' && wm !== 'blizzard') return null

  const cloudColor = wm === 'storm' ? '#112233' : wm === 'blizzard' ? '#ddeeff' : '#445566'

  return (
    <group ref={ref} position={[-40, 18, -10]}>
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <mesh key={i} position={[i * 12 + Math.random() * 5, Math.random() * 4, Math.random() * 20 - 10]}>
          <icosahedronGeometry args={[5 + Math.random() * 4, 1]} />
          <meshStandardMaterial color={cloudColor} transparent opacity={0.6} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   ENERGY PARTICLES
   ═══════════════════════════════════════════════════════ */
function EnergyParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 40

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i*3] = (Math.random()-0.5)*30; p[i*3+1] = Math.random()*5; p[i*3+2] = (Math.random()-0.5)*30
    }
    return p
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const a = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) { a[i*3+1] += 0.012; if (a[i*3+1]>5) a[i*3+1]=0 }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00F5A0" size={0.04} transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

/* ═══════════════════════════════════════════════════════
   NUCLEAR STRIKE COMPONENT
   ═══════════════════════════════════════════════════════ */
function NuclearStrike() {
  const target = useEcoStore(s => s.strikeTarget)
  const destroyBuilding = useEcoStore(s => s.destroyBuilding)
  const [active, setActive] = useState(false)
  const rocketRef = useRef<THREE.Mesh>(null)
  const blastRef = useRef<THREE.Mesh>(null)
  
  useEffect(() => {
    if (target && !active) {
      setActive(true)
      if (blastRef.current) {
        blastRef.current.scale.setScalar(0.1)
        const mat = blastRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = 1
      }
      if (rocketRef.current) rocketRef.current.position.set(target.x, 40, target.z)
    }
  }, [target, active])

  useFrame((_state, delta) => {
    if (active && target) {
      if (rocketRef.current && rocketRef.current.position.y > 0) {
        rocketRef.current.position.y -= delta * 50 // High speed
        if (rocketRef.current.position.y <= 0) {
          rocketRef.current.position.y = -100 // Hide rocket
          if (blastRef.current) blastRef.current.position.set(target.x, 0, target.z)
        }
      } else if (blastRef.current && blastRef.current.position.y === 0) {
        blastRef.current.scale.addScalar(delta * 25)
        const mat = blastRef.current.material as THREE.MeshBasicMaterial
        mat.opacity -= delta * 1.0
        if (mat.opacity <= 0) {
          mat.opacity = 0
          blastRef.current.position.y = -100
          setActive(false)
          destroyBuilding(target.id)
        }
      }
    }
  })

  if (!active || !target) return null

  return (
    <group>
      <mesh ref={rocketRef} position={[target.x, 40, target.z]}>
        <cylinderGeometry args={[0.3, 0.3, 2.5, 8]} />
        <meshStandardMaterial color="#222" emissive="#FF0000" emissiveIntensity={2} />
      </mesh>
      <mesh ref={blastRef} position={[0, -100, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#FF4400" transparent opacity={1} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   SCENE AMBIENT
   ═══════════════════════════════════════════════════════ */
function SceneSetup() {
  const { scene } = useThree()
  const wm = useEcoStore(s => s.weatherMode)
  const ambientRef = useRef<THREE.AmbientLight>(null)

  useEffect(() => { scene.fog = new THREE.FogExp2('#060D1A', 0.006) }, [scene])

  useFrame(() => {
    if (wm === 'storm' && ambientRef.current) {
      if (Math.random() > 0.985) {
        ambientRef.current.intensity = 3.5;
      } else {
        ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, 0.4, 0.1);
      }
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={wm === 'storm' ? 0.4 : wm === 'heatwave' ? 0.8 : wm === 'overcast' ? 0.5 : 0.7}
        color={wm === 'heatwave' ? '#FF8844' : '#ffffff'} />
      <directionalLight position={[10, 25, 10]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-8, 15, -8]} intensity={0.4} color="#88aaff" />
      <hemisphereLight args={['#b0d0ff', '#1a2040', 0.4]} />
      <pointLight position={[0, 12, 0]} intensity={0.5} color="#00F5A0" distance={40} />
      <Stars radius={60} depth={60} count={600} factor={3} saturation={0} fade speed={0.2} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN SCENE
   ═══════════════════════════════════════════════════════ */
function Scene() {
  const buildings = useEcoStore(s => s.buildings)
  const setSel = useEcoStore(s => s.setSelectedBuilding)
  const setStrikeTarget = useEcoStore(s => s.setStrikeTarget)
  const nuclearMode = useEcoStore(s => s.nuclearMode)

  const handleClick = useCallback((b: SimBuilding) => {
    if (nuclearMode) {
      if (!b.isDestroyed) setStrikeTarget(b)
    } else {
      setSel(b)
    }
  }, [setSel, nuclearMode, setStrikeTarget])

  return (
    <>
      <SceneSetup />
      <GridFloor />
      <EnergyParticles />
      {buildings.map(b => <Building3D key={b.id} building={b} onClick={handleClick} />)}
      {buildings.length > 1 && <NeuralWires buildings={buildings} />}
      <PowerNode type="solar" position={[-16, 0, -16]} />
      <PowerNode type="wind" position={[16, 0, -16]} />
      <PowerNode type="hydro" position={[-16, 0, 16]} />
      <PowerNode type="gas" position={[16, 0, 16]} />
      <WeatherEffects />
      <CloudSystem />
      <NuclearStrike />
      <OrbitControls minPolarAngle={0.3} maxPolarAngle={1.4} minDistance={5} maxDistance={45}
        enableDamping dampingFactor={0.05} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════
   AUTO-BALANCE HOOK
   ═══════════════════════════════════════════════════════ */
function useAutoBalance() {
  useEffect(() => {
    const id = setInterval(() => {
      const s = useEcoStore.getState()
      if (!s.buildings.length || !s.powerSources.solar) return
      const solarO = s.powerSources.solar.active ? s.powerSources.solar.max * s.weatherMod.solar : 0
      const windO = s.powerSources.wind.active ? s.powerSources.wind.max * s.weatherMod.wind : 0
      const hydroO = s.powerSources.hydro.active ? s.powerSources.hydro.max * s.weatherMod.hydro : 0
      const renewable = solarO + windO + hydroO
      const demand = s.buildings.filter(b => b.active).reduce((a, b) => a + b.consumption_kw, 0)
      const shortage = demand - (renewable + 30)
      const gasO = s.powerSources.gas.active ? Math.min(70, 30 + Math.max(0, shortage)) : 0
      const supply = renewable + gasO
      const balance = supply - demand
      const status = balance < -10 ? 'CRITICAL' : balance < 0 ? 'WARNING' : 'OPTIMIZED'

      useEcoStore.setState(prev => ({
        powerSources: {
          ...prev.powerSources,
          solar: { ...prev.powerSources.solar, output: +solarO.toFixed(1) },
          wind: { ...prev.powerSources.wind, output: +windO.toFixed(1) },
          hydro: { ...prev.powerSources.hydro, output: +hydroO.toFixed(1) },
          gas: { ...prev.powerSources.gas, output: +gasO.toFixed(1) },
        },
      }))
      s.setGridBalance({ status, supply: +supply.toFixed(1), demand: +demand.toFixed(1), gas: +gasO.toFixed(1) })

      const updated = s.buildings.map(b => {
        if (!b.active) return { ...b, isSelling: false, isBuying: false, isCritical: false }
        const net = b.solar_kw - b.consumption_kw * (supply / Math.max(demand, 1))
        return { ...b, isSelling: net > 2, isBuying: net < -2 && net > -8, isCritical: net <= -8,
          battery_soc: Math.max(5, Math.min(100, b.battery_soc + net * 0.1)) }
      })
      useEcoStore.setState({ buildings: updated })

      let avgPrice = 0.05
      const sellers = updated.filter(b => b.isSelling)
      const buyers = updated.filter(b => b.isBuying || b.isCritical)
      if (sellers.length && buyers.length) {
        const from = sellers[Math.floor(Math.random() * sellers.length)]
        const to = buyers[Math.floor(Math.random() * buyers.length)]
        avgPrice = +(Math.random() * 0.1 + (shortage > 0 ? 0.08 : 0.03)).toFixed(3)
        s.addTrade({ id: Math.random().toString(36).substr(2, 9), from: from.name, to: to.name,
          amount: +(Math.random() * 5 + 1).toFixed(2), price: avgPrice,
          txHash: '0x' + Math.random().toString(16).substr(2, 12), timestamp: Date.now() })
      } else {
        avgPrice = +(Math.random() * 0.02 + 0.04).toFixed(3)
      }

      s.addHistoryPoint({
        time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
        supply: +supply.toFixed(1),
        demand: +demand.toFixed(1),
        traditionalLoad: +(demand * 1.3).toFixed(1),
        avgPrice
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])
}

/* ═══════════════════════════════════════════════════════
   HUD OVERLAY — clean layout, no overlaps
   ═══════════════════════════════════════════════════════ */
function HUD() {
  const loc = useEcoStore(s => s.activeLocation)
  const gridStatus = useEcoStore(s => s.gridStatus)
  const totalSupply = useEcoStore(s => s.totalSupply)
  const totalDemand = useEcoStore(s => s.totalDemand)
  const gasOutput = useEcoStore(s => s.gasOutput)
  const setPanelOpen = useEcoStore(s => s.setPanelOpen)
  const panelOpen = useEcoStore(s => s.panelOpen)
  const weatherMode = useEcoStore(s => s.weatherMode)

  const balance = totalSupply - totalDemand
  const statusColor = gridStatus === 'OPTIMIZED' ? '#00F5A0' : gridStatus === 'WARNING' ? '#FFD700' : '#FF4444'
  const wLabels: Record<string, string> = { clear:'☀️ Clear', overcast:'☁️ Overcast', storm:'⛈️ Storm', heatwave:'🌡️ Heat Wave', blizzard:'❄️ Blizzard', wind:'🌬️ Wind' }

  return (
    <>
      {/* Top-left: Logo + Info */}
      <div style={{ position:'fixed', top:14, left:14, zIndex:100, pointerEvents:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{
            width:28, height:28, borderRadius:7,
            background:'linear-gradient(135deg,#00F5A0,#00D4FF)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 12px rgba(0,245,160,0.25)',
          }}>
            <span style={{ fontSize:12 }}>⚡</span>
          </div>
          <span style={{
            fontFamily:UI, fontSize:13, fontWeight:700,
            background:'linear-gradient(135deg,#00F5A0,#00D4FF)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>EcoSync</span>
          <span style={{
            padding:'1px 7px', borderRadius:8,
            background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)',
            fontFamily:UI, fontSize:8, fontWeight:600, color:'#FF6B6B',
            display:'flex', alignItems:'center', gap:3,
          }}>
            <span style={{ width:4, height:4, borderRadius:'50%', background:'#FF6B6B', animation:'simPulse 1.5s infinite' }}/>
            LIVE
          </span>
        </div>
        {loc && (
          <div style={{ fontFamily:UI, fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>
            📍 {loc.name}, {loc.pin}
          </div>
        )}
        <div style={{ fontFamily:UI, fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
          {wLabels[weatherMode] || '☀️ Clear'}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => useEcoStore.setState({ buildings:[], selectedBuilding:null, trades:[], appMode:'globe' })}
        style={{
          position:'fixed', top:76, left:14, zIndex:100,
          background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.25)',
          color:'#00D4FF', padding:'4px 10px', borderRadius:16,
          fontFamily:UI, fontSize:10, fontWeight:500, cursor:'pointer',
          backdropFilter:'blur(8px)',
        }}
      >← Globe</button>

      {/* Hamburger — top-right corner */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          position:'fixed', top:14, right:14, zIndex:600,
          width:36, height:36, borderRadius:8,
          background:'rgba(6,13,26,0.85)', border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff', fontSize:16, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)',
        }}
      >
        {panelOpen ? '✕' : '☰'}
      </button>

      {/* Grid status — right side, below hamburger */}
      <div style={{ position:'fixed', top:56, right:14, zIndex:100, textAlign:'right', pointerEvents:'none' }}>
        <div style={{ fontFamily:UI, fontSize:18, fontWeight:700, color:statusColor, lineHeight:1 }}>
          {balance >= 0 ? '+' : ''}{balance.toFixed(1)} kW
        </div>
        <div style={{
          display:'inline-flex', padding:'2px 8px', borderRadius:10, marginTop:3,
          background:statusColor+'15', border:`1px solid ${statusColor}33`,
          fontFamily:UI, fontSize:8, fontWeight:600, color:statusColor, letterSpacing:'0.08em',
        }}>
          {gridStatus}
        </div>
      </div>

      {/* Gas banner — center */}
      {gasOutput > 30 && (
        <div style={{
          position:'fixed', top:14, left:'50%', transform:'translateX(-50%)',
          zIndex:100, pointerEvents:'none',
          padding:'5px 16px', borderRadius:16,
          background:'rgba(255,107,0,0.1)', border:'1px solid rgba(255,107,0,0.25)',
          fontFamily:UI, fontSize:10, fontWeight:500, color:'#FF6B00',
        }}>
          ⚡ Gas backup — {gasOutput.toFixed(0)} kW (+{(gasOutput - 30).toFixed(0)} boost)
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════
   SIMULATION APP
   ═══════════════════════════════════════════════════════ */
export default function SimulationApp() {
  const selectedBuilding = useEcoStore(s => s.selectedBuilding)
  const nuclearMode = useEcoStore(s => s.nuclearMode)

  useEffect(() => {
    const s = useEcoStore.getState()
    if (!s.buildings.length) s.initBuildings()
    if (!s.powerSources.solar) s.initSources()
  }, [])

  useAutoBalance()

  return (
    <div style={{ 
      width:'100vw', height:'100vh', position:'relative', 
      background:'#060D1A', 
      cursor: nuclearMode ? 'crosshair' : 'default' 
    }}>
      <Canvas camera={{ position:[20,15,20], fov:45 }} dpr={[1,1.5]} performance={{ min:0.5 }}
        style={{ width:'100%', height:'100%' }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <HUD />
      <SidePanel />
      {selectedBuilding && !nuclearMode && <BuildingPopup />}
      <style>{`@keyframes simPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}

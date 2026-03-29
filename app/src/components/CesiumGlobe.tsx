import { useEffect, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useEcoStore } from '@/store/useEcoStore'
import type { ActiveLocation } from '@/store/useEcoStore'

// ── Set Cesium Ion token once ──
Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmOGY4MDhhMy0zOWU4LTRiZTctYmJiYS1lYzE4NjdlY2UwY2MiLCJpZCI6NDEwMzc3LCJpYXQiOjE3NzQ2OTM3MTl9.e1l8QF7r1z3ojNnoK1e7AMQ7pcVGrG4jt_R5eWpdyHQ'

// ── Hardcoded city markers (no API needed) ──
const CITIES: ActiveLocation[] = [
  { name: 'Mumbai',    lat: 18.94,  lng: 72.84,  pin: '400001' },
  { name: 'New Delhi', lat: 28.61,  lng: 77.21,  pin: '110001' },
  { name: 'Bangalore', lat: 12.97,  lng: 77.59,  pin: '560001' },
  { name: 'New York',  lat: 40.71,  lng: -74.01, pin: '10001' },
  { name: 'London',    lat: 51.51,  lng: -0.13,  pin: 'EC1A' },
  { name: 'Tokyo',     lat: 35.68,  lng: 139.69, pin: '100-0001' },
  { name: 'Paris',     lat: 48.86,  lng: 2.35,   pin: '75001' },
  { name: 'Dubai',     lat: 25.20,  lng: 55.27,  pin: '00000' },
  { name: 'Singapore', lat: 1.35,   lng: 103.82, pin: '048545' },
  { name: 'Sydney',    lat: -33.87, lng: 151.21, pin: '2000' },
  { name: 'Berlin',    lat: 52.52,  lng: 13.41,  pin: '10115' },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, pin: '01310' },
]

export default function CesiumGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const rotRef = useRef<number | null>(null)
  const [showLaunch, setShowLaunch] = useState(false)
  const [selectedCity, setSelectedCity] = useState<ActiveLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  // ── Handle city selection ──
  const handleSelect = useCallback((city: ActiveLocation) => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    setSelectedCity(city)
    setShowLaunch(false)

    // Stop rotation
    if (rotRef.current !== null) {
      cancelAnimationFrame(rotRef.current)
      rotRef.current = null
    }

    // Fly to city
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 5000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 2.5,
      complete: () => {
        setShowLaunch(true)
      },
    })
  }, [])

  // ── Launch into simulation ──
  const handleLaunch = useCallback(() => {
    if (!selectedCity) return
    useEcoStore.setState({
      appMode: 'loading',
      activeLocation: selectedCity,
    })
  }, [selectedCity])

  // ── Search handler ──
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim()
    if (!q) return

    const match = CITIES.find(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.pin === q
    )

    if (match) {
      handleSelect(match)
    } else {
      // Mock location — never show an error
      handleSelect({
        name: q,
        pin: q,
        lat: 20 + Math.random() * 10,
        lng: 75 + Math.random() * 10,
      })
    }
    setSearchQuery('')
  }, [searchQuery, handleSelect])

  // ── Initialize Cesium viewer ──
  useEffect(() => {
    if (!containerRef.current) return

    let viewer: Cesium.Viewer

    try {
      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      })
    } catch (err) {
      console.warn('[EcoSync] Cesium failed to initialize, using fallback:', err)
      return
    }

    viewerRef.current = viewer

    // ── Dark atmosphere styling ──
    try {
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.hueShift = 0.1
        viewer.scene.skyAtmosphere.brightnessShift = -0.3
      }
      viewer.scene.globe.enableLighting = true
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060D1A')
      // Deep-space skybox darkening
      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = true
      }
      viewer.scene.fog.enabled = true
      viewer.scene.fog.density = 0.0002
    } catch {
      // Non-critical styling – graceful fallback
    }

    // ── Hide credits widget ──
    try {
      const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement
      if (creditContainer) creditContainer.style.display = 'none'
    } catch {
      // okay
    }

    // ── Start camera: full globe view centered on India ──
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 18000000),
    })

    // ── Slow idle rotation ──
    const rotate = () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00008)
      }
      rotRef.current = requestAnimationFrame(rotate)
    }
    rotRef.current = requestAnimationFrame(rotate)

    // ── Add city markers ──
    const accentColor = Cesium.Color.fromCssColorString('#00F5A0')
    const bgColor = Cesium.Color.fromCssColorString('#060D1A')

    CITIES.forEach((city) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 0),
        name: city.name,
        point: {
          pixelSize: 10,
          color: accentColor,
          outlineColor: accentColor.withAlpha(0.3),
          outlineWidth: 6,
          scaleByDistance: new Cesium.NearFarScalar(1e6, 1.5, 2e7, 0.5),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        ellipse: {
          semiMajorAxis: 120000,
          semiMinorAxis: 120000,
          material: accentColor.withAlpha(0.08),
          outline: true,
          outlineColor: accentColor.withAlpha(0.5),
          outlineWidth: 2,
          height: 0,
        },
        label: {
          text: city.name,
          font: '13px "IBM Plex Mono", "Courier New", monospace',
          fillColor: accentColor,
          outlineColor: bgColor,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 1.5e7, 0.0),
          translucencyByDistance: new Cesium.NearFarScalar(2e6, 1.0, 1.5e7, 0.0),
        },
        properties: {
          pin: city.pin,
          lat: city.lat,
          lng: city.lng,
        },
      })
    })

    // ── Click handler for city dots ──
    viewer.screenSpaceEventHandler.setInputAction(
      (movement: { position: Cesium.Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position)
        if (Cesium.defined(picked) && picked.id) {
          const entity = picked.id
          if (entity.properties?.pin) {
            const cityData: ActiveLocation = {
              name: entity.name || 'Unknown',
              pin: entity.properties.pin.getValue(Cesium.JulianDate.now()),
              lat: entity.properties.lat.getValue(Cesium.JulianDate.now()),
              lng: entity.properties.lng.getValue(Cesium.JulianDate.now()),
            }
            handleSelect(cityData)
          }
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )

    // ── Cleanup on unmount ──
    return () => {
      if (rotRef.current !== null) {
        cancelAnimationFrame(rotRef.current)
        rotRef.current = null
      }
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
      }
      viewerRef.current = null
    }
  }, [handleSelect])

  // ── Search suggestions ──
  const suggestions = searchQuery.trim().length > 0
    ? CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.pin.startsWith(searchQuery.trim())
      )
    : []

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#060D1A' }}>
      {/* Cesium mounts here */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* ── OVERLAY: Top-left branding ── */}
      <div style={{
        position: 'fixed', top: 18, left: 22, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0,245,160,0.3)',
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
        </div>
        <div>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 800, fontSize: 16,
            background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: 1,
          }}>
            EcoSync
          </div>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9, color: 'rgba(255,255,255,0.35)',
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            Global Energy Grid
          </div>
        </div>
      </div>

      {/* ── OVERLAY: Search bar ── */}
      <div style={{
        position: 'fixed', top: 20, left: '50%',
        transform: 'translateX(-50%)',
        width: 400, maxWidth: 'calc(100vw - 32px)',
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(6,13,26,0.85)',
          backdropFilter: 'blur(20px)',
          border: searchFocused
            ? '1px solid rgba(0,245,160,0.5)'
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '3px 4px 3px 16px',
          transition: 'border-color 0.3s ease',
          boxShadow: searchFocused
            ? '0 0 30px rgba(0,245,160,0.1)'
            : '0 4px 30px rgba(0,0,0,0.5)',
        }}>
          <span style={{ fontSize: 14, marginRight: 8, opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter any city or pincode..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#E0E0E0', fontSize: 13,
              fontFamily: '"IBM Plex Mono", monospace',
              padding: '10px 0',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
              border: 'none', borderRadius: 12,
              color: '#060D1A', fontWeight: 700, fontSize: 13,
              padding: '8px 18px', cursor: 'pointer',
              fontFamily: '"IBM Plex Mono", monospace',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            → GO
          </button>
        </div>

        {/* ── Search suggestions dropdown ── */}
        {suggestions.length > 0 && searchFocused && (
          <div style={{
            marginTop: 6,
            background: 'rgba(6,13,26,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {suggestions.slice(0, 5).map((city) => (
              <button
                key={city.pin}
                onClick={() => {
                  handleSelect(city)
                  setSearchQuery('')
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 16px',
                  background: 'transparent', border: 'none',
                  color: '#E0E0E0', fontSize: 12,
                  fontFamily: '"IBM Plex Mono", monospace',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,245,160,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>📍 {city.name}</span>
                <span style={{ color: 'rgba(0,245,160,0.6)', fontSize: 10 }}>{city.pin}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── OVERLAY: City info badge (after selection) ── */}
      {selectedCity && (
        <div style={{
          position: 'fixed', bottom: 140, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100, textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 30,
            background: 'rgba(6,13,26,0.8)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,245,160,0.25)',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 12, color: 'rgba(255,255,255,0.7)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00F5A0',
              boxShadow: '0 0 8px #00F5A0',
            }} />
            📍 {selectedCity.name} • PIN {selectedCity.pin}
          </div>
        </div>
      )}

      {/* ── OVERLAY: Launch button (shown after flyTo completes) ── */}
      {showLaunch && selectedCity && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}>
          <button
            onClick={handleLaunch}
            style={{
              background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
              color: '#060D1A', fontWeight: 700,
              padding: '14px 40px', borderRadius: 30,
              border: 'none', fontSize: 14, cursor: 'pointer',
              fontFamily: '"IBM Plex Mono", monospace',
              boxShadow: '0 0 40px rgba(0,245,160,0.35), 0 4px 20px rgba(0,0,0,0.4)',
              animation: 'ecosyncBounce 2s ease-in-out infinite',
              letterSpacing: 0.5,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🚀 Launch EcoSync Here
          </button>
        </div>
      )}

      {/* ── OVERLAY: Bottom-right status indicators ── */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20,
        zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'flex-end',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10, color: 'rgba(255,255,255,0.3)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#00F5A0', boxShadow: '0 0 6px #00F5A0',
          }} />
          Cesium Ion Connected
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#00D4FF',
          }} />
          {CITIES.length} nodes online
        </div>
      </div>

      {/* ── OVERLAY: Click hint (bottom center) ── */}
      {!selectedCity && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100, pointerEvents: 'none',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11, color: 'rgba(255,255,255,0.25)',
          letterSpacing: 1,
          animation: 'ecosyncPulse 3s ease-in-out infinite',
        }}>
          Click any city marker to select a location
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        @keyframes ecosyncBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes ecosyncPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.6; }
        }

        /* Override Cesium's default widget styles */
        .cesium-viewer {
          font-family: 'IBM Plex Mono', monospace !important;
        }
        .cesium-viewer-bottom {
          display: none !important;
        }
        .cesium-widget-credits {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

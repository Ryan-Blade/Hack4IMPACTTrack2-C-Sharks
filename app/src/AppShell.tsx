import { useState, useEffect } from 'react'
import { useEcoStore } from '@/store/useEcoStore'
import HomePage from '@/pages/HomePage'
import CesiumGlobe from '@/components/CesiumGlobe'
import SimulationApp from '@/components/simulation/SimulationApp'

function LoadingScreen() {
  const [status, setStatus] = useState('Loading map...')
  const activeLocation = useEcoStore(s => s.activeLocation)

  useEffect(() => {
    // 1.5s until "Successfully loaded!"
    const t1 = setTimeout(() => {
      setStatus('Successfully loaded!')
    }, 1500)

    // another 1s until actual launch
    const t2 = setTimeout(() => {
      useEcoStore.setState({ appMode: 'simulation' })
    }, 2500)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6,13,26,0.9)', backdropFilter: 'blur(20px)',
      zIndex: 1000, color: '#fff'
    }}>
      <div style={{
        padding: '30px 50px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(0,245,160,0.3)',
        borderRadius: 20,
        boxShadow: '0 0 40px rgba(0,245,160,0.1)',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15
      }}>
        {status === 'Loading map...' ? (
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(0,245,160,0.2)',
            borderTopColor: '#00F5A0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <div style={{
            width: 40, height: 40,
            background: '#00F5A0',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#060D1A', fontSize: 24, fontWeight: 'bold'
          }}>✓</div>
        )}
        
        <h2 style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 20, margin: 0,
          color: status === 'Successfully loaded!' ? '#00F5A0' : '#fff'
        }}>
          {status}
        </h2>
        {activeLocation && (
          <p style={{
            margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)',
            fontFamily: '"IBM Plex Mono", monospace'
          }}>
            Location: {activeLocation.name} 
          </p>
        )}
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function AppShell() {
  const appMode = useEcoStore((s) => s.appMode)

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#060D1A', overflow: 'hidden',
      position: 'relative'
    }}>
      {appMode === 'home' && <HomePage />}

      {appMode === 'globe' && (
        <>
          <CesiumGlobe />
          <button
            onClick={() => useEcoStore.setState({ appMode: 'home' })}
            style={{
              position: 'fixed', top: 70, left: 16,
              background: 'rgba(0,245,160,0.1)',
              border: '1px solid rgba(0,245,160,0.3)',
              color: '#00F5A0', padding: '6px 14px',
              borderRadius: 20,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11, cursor: 'pointer',
              zIndex: 500, backdropFilter: 'blur(10px)',
            }}
          >← Home</button>
        </>
      )}

      {appMode === 'loading' && <LoadingScreen />}

      {appMode === 'simulation' && <SimulationApp />}
    </div>
  )
}


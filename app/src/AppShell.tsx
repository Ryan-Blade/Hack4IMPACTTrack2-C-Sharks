import { useEcoStore } from '@/store/useEcoStore'
import HomePage from '@/pages/HomePage'
import CesiumGlobe from '@/components/CesiumGlobe'
import SimulationApp from '@/components/simulation/SimulationApp'

export default function AppShell() {
  const appMode = useEcoStore((s) => s.appMode)

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#060D1A', overflow: 'hidden',
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

      {appMode === 'simulation' && <SimulationApp />}
    </div>
  )
}

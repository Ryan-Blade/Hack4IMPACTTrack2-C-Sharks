import { useEcoStore } from '@/store/useEcoStore'
import type { WeatherMode } from '@/store/useEcoStore'
import { useState } from 'react'

const mono = 'Inter,sans-serif'

export default function SidePanel() {
  const panelOpen = useEcoStore((s) => s.panelOpen)
  const sources = useEcoStore((s) => s.powerSources)
  const toggleSource = useEcoStore((s) => s.toggleSource)
  const totalSupply = useEcoStore((s) => s.totalSupply)
  const totalDemand = useEcoStore((s) => s.totalDemand)
  const gridStatus = useEcoStore((s) => s.gridStatus)
  const trades = useEcoStore((s) => s.trades)
  const weatherMode = useEcoStore((s) => s.weatherMode)
  const setWeather = useEcoStore((s) => s.setWeather)
  const loc = useEcoStore((s) => s.activeLocation)
  const [godOpen, setGodOpen] = useState(false)

  if (!panelOpen) return null

  const balance = totalSupply - totalDemand
  const statusColor = gridStatus === 'OPTIMIZED' ? '#00F5A0' : gridStatus === 'WARNING' ? '#FFD700' : '#FF4444'

  const sourceKeys = ['solar', 'wind', 'hydro', 'gas'] as const
  const sourceIcons: Record<string, string> = { solar: '☀️', wind: '🌬️', hydro: '💧', gas: '🔥' }

  const weatherOptions: { mode: WeatherMode; icon: string; label: string }[] = [
    { mode: 'clear', icon: '☀️', label: 'Clear Day' },
    { mode: 'overcast', icon: '☁️', label: 'Overcast' },
    { mode: 'storm', icon: '⛈️', label: 'Thunderstorm' },
    { mode: 'heatwave', icon: '🌡️', label: 'Heat Wave' },
    { mode: 'blizzard', icon: '❄️', label: 'Blizzard' },
    { mode: 'wind', icon: '🌬️', label: 'Perfect Wind' },
  ]

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 320, zIndex: 550,
      background: 'rgba(6,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(0,212,255,0.15)',
      overflowY: 'auto', padding: '60px 16px 20px',
      animation: 'spSlideIn 0.3s ease',
    }}>
      {/* Location & Weather */}
      <div style={{
        padding: '12px 14px', borderRadius: 12, marginBottom: 16,
        background: 'rgba(0,212,255,0.05)',
        border: '1px solid rgba(0,212,255,0.1)',
      }}>
        <div style={{ fontFamily: mono, fontSize: 12, color: '#00D4FF', marginBottom: 4 }}>
          📍 {loc?.name || 'Unknown'}, {loc?.pin || '—'}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          28°C · ☁️ 40% · Wind 5 m/s
        </div>
      </div>

      {/* Power Sources 2×2 */}
      <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Power Sources
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {sourceKeys.map((key) => {
          const src = sources[key]
          if (!src) return null
          return (
            <div key={key}
              onClick={() => toggleSource(key)}
              style={{
                padding: '12px', borderRadius: 10, cursor: 'pointer',
                background: src.active ? `${src.color}0A` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${src.active ? src.color + '33' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{sourceIcons[key]}</span>
                <div style={{
                  width: 32, height: 16, borderRadius: 8,
                  background: src.active ? src.color : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: 2,
                    left: src.active ? 18 : 2, transition: 'left 0.2s',
                  }} />
                </div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: src.active ? src.color : 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                {key}
              </div>
              <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                {src.output.toFixed(1)} <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>kW</span>
              </div>
              {/* Bar */}
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${(src.output / src.max) * 100}%`,
                  background: key === 'gas' && src.output > 30
                    ? `linear-gradient(90deg, #00F5A0 ${(30 / src.max) * 100}%, #FF6B00 100%)`
                    : src.color,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid Stats */}
      <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Grid Stats
      </div>
      <div style={{
        padding: '12px 14px', borderRadius: 12, marginBottom: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'Production', value: `${totalSupply.toFixed(1)} kW`, color: '#00F5A0' },
          { label: 'Consumption', value: `${totalDemand.toFixed(1)} kW`, color: '#FF6B6B' },
          { label: 'Net Balance', value: `${balance >= 0 ? '+' : ''}${balance.toFixed(1)} kW`, color: statusColor },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Trade Log */}
      <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Live Trades
      </div>
      <div style={{ marginBottom: 16 }}>
        {trades.slice(0, 5).map((t) => (
          <div key={t.id} style={{
            padding: '8px 10px', borderRadius: 8, marginBottom: 4,
            background: 'rgba(0,245,160,0.03)', border: '1px solid rgba(0,245,160,0.08)',
            animation: 'spFadeIn 0.3s ease',
          }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#00F5A0' }}>
              {t.from} → {t.to}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                {t.amount} kW @ ${t.price}
              </span>
              <span style={{ fontFamily: mono, fontSize: 8, color: 'rgba(0,212,255,0.5)' }}>
                {t.txHash.slice(0, 10)}...
              </span>
            </div>
          </div>
        ))}
        {trades.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 16 }}>
            Waiting for trades...
          </div>
        )}
      </div>

      {/* God Mode */}
      <button
        onClick={() => setGodOpen(!godOpen)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          background: 'rgba(124,107,255,0.08)',
          border: '1px solid rgba(124,107,255,0.2)',
          color: '#7C6BFF', fontFamily: mono, fontSize: 11,
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>⚡ GOD MODE</span>
        <span>{godOpen ? '▲' : '▼'}</span>
      </button>

      {godOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
          {weatherOptions.map((w) => (
            <button key={w.mode}
              onClick={() => setWeather(w.mode)}
              style={{
                padding: '8px 10px', borderRadius: 8,
                background: weatherMode === w.mode ? 'rgba(124,107,255,0.15)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${weatherMode === w.mode ? 'rgba(124,107,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: weatherMode === w.mode ? '#7C6BFF' : 'rgba(255,255,255,0.5)',
                fontFamily: mono, fontSize: 10, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
              }}
            >
              {w.icon} {w.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spFadeIn { from { opacity:0;transform:translateY(-5px); } to { opacity:1;transform:translateY(0); } }
      `}</style>
    </div>
  )
}

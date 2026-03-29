import { useEcoStore } from '@/store/useEcoStore'
import type { WeatherMode } from '@/store/useEcoStore'
import { useState } from 'react'
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

const mono = 'Inter,sans-serif'

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(6,13,26,0.95)', border: '1px solid rgba(0,212,255,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: 10, fontFamily: mono }}>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
        ))}
      </div>
    )
  }
  return null
}

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
  const nuclearMode = useEcoStore((s) => s.nuclearMode)
  const setNuclearMode = useEcoStore((s) => s.setNuclearMode)
  const history = useEcoStore((s) => s.history)
  const buildings = useEcoStore((s) => s.buildings)
  const [godOpen, setGodOpen] = useState(false)

  if (!panelOpen) return null

  const balance = totalSupply - totalDemand
  const statusColor = gridStatus === 'OPTIMIZED' ? '#00F5A0' : gridStatus === 'WARNING' ? '#FFD700' : '#FF4444'

  const sellers = buildings.filter(b => b.active && b.isSelling).length
  const buyers = buildings.filter(b => b.active && !b.isDestroyed && b.isBuying).length
  const critical = buildings.filter(b => b.active && !b.isDestroyed && b.isCritical).length
  const optimized = buildings.filter(b => b.active && !b.isDestroyed && !b.isSelling && !b.isBuying && !b.isCritical).length

  const pieData = [
    { name: 'Producer', value: sellers, color: '#00F5A0' },
    { name: 'Consumer', value: buyers, color: '#FFD700' },
    { name: 'Critical', value: critical, color: '#FF4444' },
    { name: 'Idle', value: optimized, color: 'rgba(255,255,255,0.2)' }
  ].filter(d => d.value > 0)

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

      {/* Analytics Dashboard */}
      {history.length > 0 && (
        <>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Live Analytics
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 10px', marginBottom: 16 }}>
            {/* EcoSync vs Traditional Load */}
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>EcoSync Load vs Traditional Grid</div>
            <div style={{ height: 60, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorTrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#FF4444" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorSmart" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F5A0" stopOpacity={0.3}/><stop offset="95%" stopColor="#00F5A0" stopOpacity={0}/></linearGradient>
                  </defs>
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="traditionalLoad" name="Traditional Load" stroke="#FF4444" fillOpacity={1} fill="url(#colorTrad)" />
                  <Area type="monotone" dataKey="demand" name="EcoSync Load" stroke="#00F5A0" fillOpacity={1} fill="url(#colorSmart)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Generation vs Load */}
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Grid Generation vs Load</div>
            <div style={{ height: 60, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="supply" name="Supply" stroke="#00D4FF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="demand" name="Demand" stroke="#FFD700" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Token Price */}
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Token Price ($/kW)</div>
                <div style={{ height: 60 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="step" dataKey="avgPrice" name="Price" stroke="#7C6BFF" fillOpacity={0.2} fill="#7C6BFF" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Dist */}
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Node Distribution</div>
                <div style={{ height: 60, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie data={pieData} innerRadius={20} outerRadius={30} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
        <>
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

          <button
            onClick={() => setNuclearMode(!nuclearMode)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, marginTop: 8,
              background: nuclearMode ? 'rgba(255,68,68,0.2)' : 'rgba(255,68,68,0.05)',
              border: `1px solid ${nuclearMode ? '#FF4444' : 'rgba(255,68,68,0.2)'}`,
              color: '#FF4444', fontFamily: mono, fontSize: 11, fontWeight: 'bold',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
              boxShadow: nuclearMode ? '0 0 15px rgba(255,68,68,0.4)' : 'none',
            }}
          >
            {nuclearMode ? '☢️ TARGET LOCKED... CLICK BUILDING ☢️' : '☢️ NUCLEAR STRIKE MODE ☢️'}
          </button>
        </>
      )}

      <style>{`
        @keyframes spSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spFadeIn { from { opacity:0;transform:translateY(-5px); } to { opacity:1;transform:translateY(0); } }
      `}</style>
    </div>
  )
}

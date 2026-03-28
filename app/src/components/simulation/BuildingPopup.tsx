import { useEcoStore } from '@/store/useEcoStore'

const mono = 'Inter,sans-serif'

export default function BuildingPopup() {
  const building = useEcoStore((s) => s.selectedBuilding)
  const setSelectedBuilding = useEcoStore((s) => s.setSelectedBuilding)
  const toggleBuilding = useEcoStore((s) => s.toggleBuilding)

  if (!building) return null

  const typeColor = building.type === 'hospital' ? '#FF4444' : building.type === 'commercial' ? '#00B4D8' : '#00C875'
  const statusText = building.isCritical ? 'CRITICAL' : building.isSelling ? 'SELLING' : building.isBuying ? 'BUYING' : 'BALANCED'
  const statusColor = building.isCritical ? '#FF4444' : building.isSelling ? '#00F5A0' : building.isBuying ? '#FFD700' : '#00D4FF'

  // Fake blockchain data
  const txHash = '0x' + Math.random().toString(16).substr(2, 16)
  const contract = '0x4f2a' + Math.random().toString(16).substr(2, 8)
  const blockNum = 1847293 + building.id

  return (
    <div style={{
      position: 'fixed', top: 70, left: 16, zIndex: 200,
      width: 260, borderRadius: 14,
      background: 'rgba(6,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${typeColor}33`,
      overflow: 'hidden',
      animation: 'bpSlideIn 0.3s ease',
      boxShadow: `0 0 30px ${typeColor}0A`,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${typeColor}22`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {building.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 9, color: typeColor, textTransform: 'uppercase', marginTop: 2 }}>
            {building.type} · #{building.id}
          </div>
        </div>
        <button
          onClick={() => setSelectedBuilding(null)}
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}
        >✕</button>
      </div>

      {/* Stats */}
      <div style={{ padding: '10px 14px' }}>
        {[
          { label: 'Consumption', value: `${building.consumption_kw.toFixed(1)} kW` },
          { label: 'Solar Output', value: `${building.solar_kw.toFixed(1)} kW` },
          { label: 'Battery SoC', value: `${building.battery_soc.toFixed(0)}%`, color: building.battery_soc > 50 ? '#00F5A0' : building.battery_soc > 20 ? '#FFD700' : '#FF4444' },
          { label: 'Status', value: statusText, color: statusColor },
        ].map((s) => (
          <div key={s.label} style={{
            display: 'flex', justifyContent: 'space-between', padding: '5px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: s.color || '#fff' }}>{s.value}</span>
          </div>
        ))}

        {/* Battery bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${building.battery_soc}%`,
              background: building.battery_soc > 50 ? '#00F5A0' : building.battery_soc > 20 ? '#FFD700' : '#FF4444',
              transition: 'width 0.5s',
            }} />
          </div>
        </div>
      </div>

      {/* Blockchain backup (when building is OFF) */}
      {!building.active && (
        <div style={{
          padding: '10px 14px', margin: '0 10px 10px',
          borderRadius: 8, background: 'rgba(0,212,255,0.05)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}>
          <div style={{
            fontFamily: mono, fontSize: 9, color: '#00D4FF',
            fontWeight: 600, textTransform: 'uppercase', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ⛓ BLOCKCHAIN BACKUP ACTIVE
          </div>
          {[
            { label: 'Smart Contract', value: contract.slice(0, 14) + '...' },
            { label: 'TX Hash', value: txHash.slice(0, 14) + '...' },
            { label: 'Block', value: `#${blockNum.toLocaleString()}` },
            { label: 'Status', value: '✓ SETTLED', color: '#00F5A0' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', padding: '3px 0',
            }}>
              <span style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{s.label}</span>
              <span style={{ fontFamily: mono, fontSize: 8, color: s.color || 'rgba(0,212,255,0.7)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      <div style={{ padding: '0 14px 14px' }}>
        <button
          onClick={() => toggleBuilding(building.id)}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
            background: building.active
              ? 'rgba(255,68,68,0.15)'
              : 'rgba(0,245,160,0.15)',
            color: building.active ? '#FF4444' : '#00F5A0',
            transition: 'all 0.2s',
          }}
        >
          {building.active ? '⏻ TURN OFF BUILDING' : '⏻ RESTORE BUILDING'}
        </button>
      </div>

      <style>{`
        @keyframes bpSlideIn { from { transform:translateX(-300px);opacity:0; } to { transform:translateX(0);opacity:1; } }
      `}</style>
    </div>
  )
}

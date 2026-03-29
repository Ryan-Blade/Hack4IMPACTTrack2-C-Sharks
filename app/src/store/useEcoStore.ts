import { create } from 'zustand'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export interface ActiveLocation {
  name: string
  pin: string
  lat: number
  lng: number
}

export interface PowerSource {
  active: boolean
  output: number
  max: number
  color: string
}

export interface SimBuilding {
  id: number
  name: string
  type: 'residential' | 'commercial' | 'hospital'
  x: number
  z: number
  rotY: number
  consumption_kw: number
  solar_kw: number
  battery_soc: number
  active: boolean
  isSelling: boolean
  isBuying: boolean
  isCritical: boolean
  isDestroyed: boolean
  // Real-world footprint data (optional, from OSM)
  footprintW?: number
  footprintD?: number
  floors?: number
}

export interface Trade {
  id: string
  from: string
  to: string
  amount: number
  price: number
  txHash: string
  timestamp: number
}

export interface HistoryData {
  time: string
  supply: number
  demand: number
  traditionalLoad: number
  avgPrice: number
}

export type WeatherMode = 'clear' | 'overcast' | 'storm' | 'heatwave' | 'blizzard' | 'wind'

/* ═══════════════════════════════════════════
   Building Name Generator
   ═══════════════════════════════════════════ */

const NAMES: Record<string, string[]> = {
  residential: [
    'Oak Lane Apts', 'Sunrise Homes', 'River View', 'Park Estate',
    'Cedar Heights', 'Maple Court', 'Elm Residency', 'Willow Green',
    'Pine Ridge', 'Birch Terrace', 'Ivy Apartments', 'Lakeview',
    'Orchard Way', 'Garden Flats', 'Valley Homes', 'Highland Apts',
    'Crescent Villas', 'Summit Homes', 'Hillside Flats', 'Bay Heights',
    'Harbor View', 'Marina Apts', 'Coastal Homes', 'Seaside Flats',
    'Breeze Estates',
  ],
  commercial: [
    'TechPark Tower', 'Metro Plaza', 'City Mall', 'Trade Center',
    'Silicon Hub', 'Commerce Square', 'Enterprise Block', 'Nexus Tower',
    'Innovation Park', 'Skyline Office', 'Gateway Center', 'Vertex Tower',
    'Quantum Plaza', 'Pinnacle Tower', 'Atlas Center', 'Matrix Hub',
    'Prism Tower', 'Zenith Office', 'Helix Center', 'Nova Block',
  ],
  hospital: [
    'City General', 'Apollo Medical', "St. Mary's Hospital",
    'Metro Hospital', 'Lifeline Medical',
  ],
}

function pickName(type: string, idx: number): string {
  const list = NAMES[type] || NAMES.residential
  return list[idx % list.length]
}

/* ═══════════════════════════════════════════
   Position Generator (organic scatter)
   ═══════════════════════════════════════════ */

function generatePositions(count = 50): [number, number][] {
  const positions: [number, number][] = []
  const minDist = 2.5
  let attempts = 0
  while (positions.length < count && attempts < 2000) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 13 * Math.sqrt(Math.random())
    const x = Math.cos(angle) * r * 1.3
    const z = Math.sin(angle) * r
    const ok = positions.every((p) => Math.hypot(p[0] - x, p[1] - z) >= minDist)
    if (ok) positions.push([x, z])
    attempts++
  }
  return positions
}

/* ═══════════════════════════════════════════
   Building Generator
   ═══════════════════════════════════════════ */

export type BuildingType = 'residential' | 'commercial' | 'hospital'

const initialHistory = Array.from({ length: 25 }).map((_, i) => {
  const t = Date.now() - (25 - i) * 2000
  const baseD = 180 + Math.sin(t / 5000) * 40 + Math.random() * 10
  const baseS = baseD + 80 + Math.random() * 30
  return {
    time: new Date(t).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
    supply: +baseS.toFixed(1),
    demand: +baseD.toFixed(1),
    traditionalLoad: +(baseD * 1.6 + Math.random() * 20).toFixed(1),
    avgPrice: +(0.03 + Math.random() * 0.01).toFixed(3)
  }
})

function generateBuildings(): SimBuilding[] {
  const positions = generatePositions(50)
  const rotations = [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4]
  const buildings: SimBuilding[] = []

  for (let i = 0; i < positions.length; i++) {
    let type: 'residential' | 'commercial' | 'hospital'
    if (i < 5) type = 'hospital'
    else if (i < 25) type = 'commercial'
    else type = 'residential'

    const typeIdx = type === 'hospital' ? i : type === 'commercial' ? i - 5 : i - 25
    const consumption = type === 'hospital' ? 30 + Math.random() * 20
      : type === 'commercial' ? 15 + Math.random() * 15
      : 5 + Math.random() * 10

    buildings.push({
      id: i,
      name: pickName(type, typeIdx),
      type,
      x: positions[i][0],
      z: positions[i][1],
      rotY: rotations[Math.floor(Math.random() * 4)],
      consumption_kw: parseFloat(consumption.toFixed(1)),
      solar_kw: parseFloat((Math.random() * 12 + 3).toFixed(1)),
      battery_soc: parseFloat((Math.random() * 80 + 20).toFixed(1)),
      active: true,
      isSelling: false,
      isBuying: false,
      isCritical: false,
      isDestroyed: false,
    })
  }
  return buildings
}

/* ═══════════════════════════════════════════
   OSM Overpass API — fetch real building data
   ═══════════════════════════════════════════ */

async function fetchOSMBuildings(lat: number, lng: number): Promise<SimBuilding[]> {
  const radius = 250 // metres — smaller = faster response
  const query = `[out:json][timeout:6];way["building"](around:${radius},${lat},${lng});out body geom;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000) // 5s hard timeout
  const resp = await fetch(url, { signal: ctrl.signal })
  clearTimeout(timer)
  if (!resp.ok) throw new Error('Overpass API failed')
  const data = await resp.json()

  const elements = (data.elements || []).filter((el: any) => el.geometry && el.geometry.length >= 3)
  if (elements.length < 10) throw new Error('Not enough buildings found')

  // Pick up to 50
  const picked = elements.slice(0, 50)

  // Compute centroid of all buildings for coordinate normalization
  let cLat = 0, cLng = 0
  picked.forEach((el: any) => {
    const g = el.geometry
    const mLat = g.reduce((a: number, p: any) => a + p.lat, 0) / g.length
    const mLng = g.reduce((a: number, p: any) => a + p.lon, 0) / g.length
    cLat += mLat; cLng += mLng
  })
  cLat /= picked.length; cLng /= picked.length

  // Scale factor: 1 degree lat ≈ 111320m, convert to ~30-unit grid
  const mPerDeg = 111320
  const gridRadius = 15 // half the grid size
  const maxDist = radius / mPerDeg // max distance in degrees
  const scale = gridRadius / maxDist

  const buildings: SimBuilding[] = []
  const rotations = [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4]

  picked.forEach((el: any, i: number) => {
    const g = el.geometry
    const tags = el.tags || {}

    // Bounding box of footprint
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    g.forEach((p: any) => {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lon < minLng) minLng = p.lon
      if (p.lon > maxLng) maxLng = p.lon
    })

    // Centroid of this building
    const bLat = (minLat + maxLat) / 2
    const bLng = (minLng + maxLng) / 2

    // Convert to grid coords
    const x = (bLng - cLng) * scale * Math.cos(cLat * Math.PI / 180)
    const z = -(bLat - cLat) * scale

    // Footprint dimensions in meters, then scale to grid units
    const widthM = (maxLng - minLng) * mPerDeg * Math.cos(bLat * Math.PI / 180)
    const depthM = (maxLat - minLat) * mPerDeg
    const footprintScale = scale / mPerDeg
    const footprintW = Math.max(0.4, Math.min(3.0, widthM * footprintScale * 1.5))
    const footprintD = Math.max(0.4, Math.min(3.0, depthM * footprintScale * 1.5))

    // Floors from tags
    const rawLevels = parseInt(tags['building:levels'] || tags.levels || '0')
    const rawHeight = parseFloat(tags.height || '0')
    let floors = rawLevels || (rawHeight ? Math.round(rawHeight / 3) : 0)
    if (!floors) floors = Math.floor(Math.random() * 6) + 1 // random 1-6

    // Determine type from OSM tags
    let type: 'residential' | 'commercial' | 'hospital' = 'residential'
    const bType = (tags.building || '').toLowerCase()
    const amenity = (tags.amenity || '').toLowerCase()
    if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors') {
      type = 'hospital'
    } else if (['commercial', 'office', 'retail', 'industrial', 'warehouse', 'supermarket'].includes(bType) ||
               ['shop', 'marketplace'].includes(amenity)) {
      type = 'commercial'
    } else if (['apartments', 'house', 'residential', 'detached', 'terrace', 'dormitory'].includes(bType)) {
      type = 'residential'
    } else {
      // Mixed assignment for variety
      type = i % 5 === 0 ? 'hospital' : i % 2 === 0 ? 'commercial' : 'residential'
    }

    const typeIdx = i
    const consumption = type === 'hospital' ? 30 + Math.random() * 20
      : type === 'commercial' ? 15 + Math.random() * 15
      : 5 + Math.random() * 10

    buildings.push({
      id: i,
      name: pickName(type, typeIdx),
      type,
      x: +x.toFixed(2),
      z: +z.toFixed(2),
      rotY: rotations[Math.floor(Math.random() * 4)],
      consumption_kw: parseFloat(consumption.toFixed(1)),
      solar_kw: parseFloat((Math.random() * 12 + 3).toFixed(1)),
      battery_soc: parseFloat((Math.random() * 80 + 20).toFixed(1)),
      active: true,
      isSelling: false,
      isBuying: false,
      isCritical: false,
      isDestroyed: false,
      footprintW,
      footprintD,
      floors,
    })
  })

  return buildings
}

/* ═══════════════════════════════════════════
   Weather Modifiers
   ═══════════════════════════════════════════ */

function weatherMods(mode: WeatherMode) {
  switch (mode) {
    case 'clear':    return { solar: 1.0, wind: 0.6, hydro: 1.0 }
    case 'overcast': return { solar: 0.3, wind: 0.8, hydro: 1.0 }
    case 'storm':    return { solar: 0.1, wind: 1.5, hydro: 1.3 }
    case 'heatwave': return { solar: 1.3, wind: 0.3, hydro: 0.7 }
    case 'blizzard': return { solar: 0.05, wind: 1.2, hydro: 0.5 }
    case 'wind':     return { solar: 0.8, wind: 1.8, hydro: 1.0 }
    default:         return { solar: 1.0, wind: 1.0, hydro: 1.0 }
  }
}

/* ═══════════════════════════════════════════
   Store Interface
   ═══════════════════════════════════════════ */

interface EcoStore {
  // Navigation
  appMode: 'home' | 'globe' | 'loading' | 'simulation'
  setAppMode: (mode: 'home' | 'globe' | 'loading' | 'simulation') => void

  // Location
  activeLocation: ActiveLocation | null
  setActiveLocation: (loc: ActiveLocation | null) => void

  // Simulation
  buildings: SimBuilding[]
  initBuildings: () => void
  fetchAndInitBuildings: (lat: number, lng: number) => Promise<void>

  powerSources: Record<string, PowerSource>
  initSources: () => void
  toggleSource: (key: string) => void

  // Weather
  weatherMode: WeatherMode
  weatherMod: { solar: number; wind: number; hydro: number }
  setWeather: (mode: WeatherMode) => void

  // Selection
  selectedBuilding: SimBuilding | null
  setSelectedBuilding: (b: SimBuilding | null) => void
  toggleBuilding: (id: number) => void

  // Nuclear Strike
  nuclearMode: boolean
  setNuclearMode: (val: boolean) => void
  strikeTarget: SimBuilding | null
  setStrikeTarget: (b: SimBuilding | null) => void
  destroyBuilding: (id: number) => void

  // Balance
  gridStatus: 'OPTIMIZED' | 'WARNING' | 'CRITICAL'
  totalSupply: number
  totalDemand: number
  gasOutput: number
  setGridBalance: (s: { status: 'OPTIMIZED' | 'WARNING' | 'CRITICAL'; supply: number; demand: number; gas: number }) => void

  // Trades
  trades: Trade[]
  addTrade: (t: Trade) => void

  // History & Analytics
  history: HistoryData[]
  addHistoryPoint: (pt: HistoryData) => void

  // Side panel
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
}

/* ═══════════════════════════════════════════
   Create Store
   ═══════════════════════════════════════════ */

export const useEcoStore = create<EcoStore>((set) => ({
  // Navigation
  appMode: 'home',
  setAppMode: (mode) => set({ appMode: mode }),

  // Location
  activeLocation: null,
  setActiveLocation: (loc) => set({ activeLocation: loc }),

  // Simulation
  buildings: [],
  initBuildings: () => set({ buildings: generateBuildings() }),
  fetchAndInitBuildings: async (lat: number, lng: number) => {
    try {
      const buildings = await fetchOSMBuildings(lat, lng)
      set({ buildings })
    } catch (e) {
      console.warn('OSM fetch failed, using procedural fallback:', e)
      set({ buildings: generateBuildings() })
    }
  },

  powerSources: {},
  initSources: () =>
    set({
      powerSources: {
        solar: { active: true, output: 50, max: 50, color: '#FFD700' },
        wind:  { active: true, output: 60, max: 60, color: '#00D4FF' },
        hydro: { active: true, output: 40, max: 40, color: '#0088FF' },
        gas:   { active: true, output: 30, max: 70, color: '#FF6B00' },
      },
    }),
  toggleSource: (key) =>
    set((state) => ({
      powerSources: {
        ...state.powerSources,
        [key]: {
          ...state.powerSources[key],
          active: !state.powerSources[key].active,
        },
      },
    })),

  // Weather
  weatherMode: 'clear',
  weatherMod: { solar: 1, wind: 1, hydro: 1 },
  setWeather: (mode) =>
    set({
      weatherMode: mode,
      weatherMod: weatherMods(mode),
    }),

  // Selection
  selectedBuilding: null,
  setSelectedBuilding: (b) => set({ selectedBuilding: b }),
  toggleBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id && !b.isDestroyed ? { ...b, active: !b.active } : b
      ),
      selectedBuilding:
        state.selectedBuilding?.id === id
          ? { ...state.selectedBuilding, active: !state.selectedBuilding.active }
          : state.selectedBuilding,
    })),

  // Nuclear Strike
  nuclearMode: false,
  setNuclearMode: (val) => set({ nuclearMode: val, strikeTarget: null }),
  strikeTarget: null,
  setStrikeTarget: (b) => set({ strikeTarget: b }),
  destroyBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, active: false, isDestroyed: true } : b
      ),
      strikeTarget: state.strikeTarget?.id === id ? null : state.strikeTarget,
    })),

  // Balance
  gridStatus: 'OPTIMIZED',
  totalSupply: 0,
  totalDemand: 0,
  gasOutput: 30,
  setGridBalance: ({ status, supply, demand, gas }) =>
    set({ gridStatus: status, totalSupply: supply, totalDemand: demand, gasOutput: gas }),

  // Trades
  trades: [],
  addTrade: (trade) =>
    set((state) => ({
      trades: [trade, ...state.trades].slice(0, 20),
    })),

  // History & Analytics
  history: initialHistory,
  addHistoryPoint: (pt) =>
    set((state) => {
      const newHist = [...state.history, pt]
      if (newHist.length > 20) newHist.shift() // Keep 20 seconds of chart rolling context
      return { history: newHist }
    }),

  // Panel
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
}))

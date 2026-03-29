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
  history: [],
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

import { create } from 'zustand';

// Generate realistic building names based on type
function generateName(type) {
  const hospitalNames = ["St. Mary's", "City General", "Apollo Med", "Mercy Hospital", "Central Clinic"];
  const commercialNames = ["TechPark Tower", "Metro Plaza", "City Mall", "Nexus Hub", "Apex Center", "Pinnacle Suites"];
  const residentialNames = ["Oak Lane", "Sunrise Apts", "River View", "Maple Row", "Cedar Heights", "Pine Condos"];

  switch (type) {
    case 'hospital': return hospitalNames[Math.floor(Math.random() * hospitalNames.length)];
    case 'commercial': return commercialNames[Math.floor(Math.random() * commercialNames.length)];
    default: return residentialNames[Math.floor(Math.random() * residentialNames.length)];
  }
}

// Organic scatter algorithm
function generateBuildings() {
  const buildings = [];
  const types = [];

  // 5 hospitals, 20 commercial, 25 residential
  for (let i = 0; i < 5; i++) types.push('hospital');
  for (let i = 0; i < 20; i++) types.push('commercial');
  for (let i = 0; i < 25; i++) types.push('residential');

  // Shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const hospCount = { count: 0 };
  const commCount = { count: 0 };
  const resCount = { count: 0 };

  const positions = [];
  const minDist = 2.5;
  let attempts = 0;
  
  while (positions.length < 50 && attempts < 2000) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 14 * Math.sqrt(Math.random());
    const x = Math.cos(angle) * radius * 1.3;
    const z = Math.sin(angle) * radius;
    
    const tooClose = positions.some(p => 
      Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2) < minDist
    );
    
    if (!tooClose) positions.push({ x, z });
    attempts++;
  }

  for (let i = 0; i < positions.length; i++) {
    const type = types[i];
    let code, height, consumption;

    const name = generateName(type);

    switch (type) {
      case 'hospital':
        hospCount.count++;
        code = `HOSP-${hospCount.count}`;
        height = 4 + Math.random() * 2;
        consumption = 8 + Math.random() * 6;
        break;
      case 'commercial':
        commCount.count++;
        code = `COMM-${commCount.count}`;
        height = 2 + Math.random() * 2;
        consumption = 3 + Math.random() * 4;
        break;
      case 'residential':
      default:
        resCount.count++;
        code = `H${resCount.count}`;
        height = 1 + Math.random() * 1.5;
        consumption = 1.5 + Math.random() * 2;
        break;
    }

    buildings.push({
      id: `building-${i}`,
      code,
      name: `${name} ${code.split('-')[1] || ''}`.trim(),
      type,
      active: true,
      consumption_kw: parseFloat(consumption.toFixed(1)),
      battery_soc: Math.floor(40 + Math.random() * 60),
      height,
      position: [positions[i].x, 0, positions[i].z],
      rotationY: Math.floor(Math.random() * 4) * (Math.PI / 4), // 0, 45, 90, 135
      tilt: [(Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.04], // max ~2deg
      status: 'online',
      blockchainBackupActive: false,
      backupNode: null,
      txHash: null,
      blockNum: null,
    });
  }

  return buildings;
}

// Distance helper
function distance(b1, b2) {
  const dx = b1.position[0] - b2.position[0];
  const dz = b1.position[2] - b2.position[2];
  return Math.sqrt(dx * dx + dz * dz);
}

// Mesh Connection Logic: Each node connects to 2-3 nearest neighbors
function buildMeshConnections(buildings) {
  const connections = [];
  buildings.forEach((b, i) => {
    // find 2 nearest neighbors
    const distances = buildings
      .map((other, j) => ({ j, d: distance(b, other) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
      
    distances.forEach(({ j }) => {
      // avoid duplicates
      const key = [Math.min(i, j), Math.max(i, j)].join('-');
      if (!connections.find(c => c.key === key)) {
        connections.push({ key, fromId: buildings[i].id, toId: buildings[j].id });
      }
    });
  });
  return connections;
}

const initialBuildings = generateBuildings();
const initialConnections = buildMeshConnections(initialBuildings);

const useEcoStore = create((set, get) => ({
  buildings: initialBuildings,
  connections: initialConnections,

  powerSources: {
    solar: { active: true, output_kw: 30, max_kw: 50, history: [30, 32, 28, 35, 30, 29, 33, 31, 34, 30] },
    wind: { active: true, output_kw: 12, max_kw: 60, history: [12, 15, 10, 14, 12, 13, 11, 16, 12, 14] },
    hydro: { active: true, output_kw: 40, max_kw: 45, history: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40] },
    gas: { active: true, output_kw: 30, max_kw: 70, history: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30] },
  },

  weatherData: {
    temp: 28,
    clouds: 40,
    wind_speed: 5,
    city: 'Demo City',
    description: 'partly cloudy',
    humidity: 65,
  },
  
  weatherOverride: null, // "OVERCAST", "THUNDERSTORM", "HEAT_WAVE", "BLIZZARD", "PERFECT_WIND"

  gridStatus: {
    balance: 0,
    status: 'OPTIMIZED',
    efficiency: 85,
  },

  selectedBuilding: null,
  tradeLog: [],
  pincode: '400001',
  sidePanelOpen: false,

  // Actions
  setSidePanelOpen: (isOpen) => set({ sidePanelOpen: isOpen }),
  setWeatherOverride: (mode) => set({ weatherOverride: mode }),
  
  setWeatherData: (data) => set({ weatherData: data }),
  setPincode: (pin) => set({ pincode: pin }),

  selectBuilding: (building) => set({ selectedBuilding: building }),
  clearSelection: () => set({ selectedBuilding: null }),

  toggleBuilding: (id) => set((state) => {
    let activeBuildings = state.buildings.filter(b => b.active && b.id !== id);
    if (!state.buildings.find(b => b.id === id).active) {
       // if we are turning it back ON, it will be considered active
       activeBuildings = state.buildings.filter(b => b.active || b.id === id);
    }
    
    const buildings = state.buildings.map((b) => {
      if (b.id === id) {
        const isTurningOff = b.active;
        const newActive = !b.active;
        
        // Mock blockchain logic
        let blockchainBackupActive = false;
        let backupNode = null;
        let txHash = null;
        let blockNum = null;

        if (isTurningOff) {
           blockchainBackupActive = true;
           // Find nearest active building for backup display
           let nearestActive = null;
           let minDist = Infinity;
           activeBuildings.forEach((other) => {
             const d = distance(b, other);
             if (d < minDist) {
                minDist = d;
                nearestActive = other;
             }
           });
           
           if (nearestActive) {
             backupNode = nearestActive.code;
           } else {
             backupNode = "SYSTEM-GRID";
           }
           
           txHash = '0x' + Math.random().toString(16).substr(2, 12) + '...a1f2';
           blockNum = `1,${Math.floor(Math.random() * 800) + 100},${Math.floor(Math.random() * 800) + 100}`;
        }

        return { 
          ...b, 
          active: newActive, 
          status: newActive ? 'online' : 'offline',
          blockchainBackupActive,
          backupNode,
          txHash,
          blockNum
        };
      }
      return b;
    });

    // Update selectedBuilding reference if it is the toggled one
    const newSelected = state.selectedBuilding?.id === id 
        ? buildings.find(b => b.id === id) 
        : state.selectedBuilding;

    return { buildings, selectedBuilding: newSelected };
  }),

  // Power toggles
  togglePowerSource: (source) => set((state) => {
    const ps = { ...state.powerSources };
    const isActive = !ps[source].active;
    ps[source] = {
      ...ps[source],
      active: isActive,
      output_kw: !isActive ? 0 : (source === 'gas' ? 30 : ps[source].max_kw * 0.6),
    };
    return { powerSources: ps };
  }),

  updatePowerOutput: (source, kw) => set((state) => {
    const ps = { ...state.powerSources };
    const hist = [...ps[source].history.slice(1), kw];
    ps[source] = { ...ps[source], output_kw: parseFloat(kw.toFixed(1)), history: hist };
    return { powerSources: ps };
  }),

  updateGridStatus: (status) => set({ gridStatus: status }),

  addTradeLog: (entry) => set((state) => ({
    tradeLog: [entry, ...state.tradeLog].slice(0, 20),
  })),

  setGasActive: (active) => set((state) => {
    const ps = { ...state.powerSources };
    ps.gas = { ...ps.gas, active, output_kw: active ? 30 : 0 };
    return { powerSources: ps };
  }),
}));

export default useEcoStore;

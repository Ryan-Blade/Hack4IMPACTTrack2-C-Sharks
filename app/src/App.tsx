import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Zap, 
  Activity, 
  TrendingUp, 
  Battery, 
  Sun, 
  Cloud, 
  AlertTriangle,
  Server,
  Cpu,
  Menu,
  X,
  Maximize2,
  Minimize2,
  CloudRain,
  ShieldAlert,
  DollarSign
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CityGrid } from '@/components/threejs/CityGrid';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { LogTerminal } from '@/components/terminal/LogTerminal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { 
  BuildingTelemetry, 
  AgentLog, 
  AnalyticsSummary, 
  MarketStatus,
  GridEvent 
} from '@/types';
import './App.css';
// @ts-expect-error - JSX module without type declarations
import Particles from '@/components/Particles';

// WebSocket connection hook
function useWebSocket(url: string) {
  const [connected, setConnected]     = useState(false);
  const [buildings, setBuildings]     = useState<BuildingTelemetry[]>([]);
  const [logs, setLogs]               = useState<AgentLog[]>([]);
  const [gridEvents, setGridEvents]   = useState<GridEvent[]>([]);
  const wsRef                         = useRef<WebSocket | null>(null);

  // --- Batched building-update buffer ----------------------------------------
  // We accumulate telemetry updates in a ref and flush them at most once per
  // animation frame via requestAnimationFrame.  This prevents a React re-render
  // for every single MQTT packet (which can arrive many times per second).
  const pendingUpdatesRef = useRef<Map<number, BuildingTelemetry>>(new Map());
  const rafPendingRef     = useRef<number | null>(null);

  const flushBuildingUpdates = useCallback(() => {
    rafPendingRef.current = null;
    const updates = pendingUpdatesRef.current;
    if (updates.size === 0) return;
    pendingUpdatesRef.current = new Map();
    setBuildings(prev => {
      const next = [...prev];
      updates.forEach((data, id) => {
        const idx = next.findIndex(b => b.building_id === id);
        if (idx >= 0) next[idx] = data;
        else next.push(data);
      });
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafPendingRef.current === null) {
      rafPendingRef.current = requestAnimationFrame(flushBuildingUpdates);
    }
  }, [flushBuildingUpdates]);
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'telemetry':
              // Buffer update; flush once per animation frame
              pendingUpdatesRef.current.set(data.data.building_id, data.data);
              scheduleFlush();
              break;
            
            case 'agent_log':
              // Cap logs at 200 entries to prevent runaway memory growth
              setLogs(prev => prev.length >= 200
                ? [...prev.slice(-199), data.data]
                : [...prev, data.data]
              );
              break;
            
            case 'grid_event':
              setGridEvents(prev => [...prev, data.data]);
              break;
            
            case 'buildings_list':
              setBuildings(data.data);
              break;
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      // Cancel any pending animation frame flush
      if (rafPendingRef.current !== null) {
        cancelAnimationFrame(rafPendingRef.current);
      }
      wsRef.current?.close();
    };
  }, [url, scheduleFlush]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { connected, buildings, logs, gridEvents, sendMessage };
}

// API polling hook for analytics
function useAnalyticsPolling(interval: number = 5000) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [history, setHistory] = useState<{ time: string; load: number; generation: number; efficiency: number; traditional: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch market status FIRST to include in history
        let currentMarketPrice = 0.15;
        const _marketApiUrl = import.meta.env.VITE_API_URL || '';
        const marketApiUrlFixed = _marketApiUrl.startsWith('http') || _marketApiUrl === '' ? _marketApiUrl : `https://${_marketApiUrl}`;
        const marketRes = await fetch(`${marketApiUrlFixed}/api/market/status`);
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          setMarketStatus(marketData);
          currentMarketPrice = marketData.current_price;
        }

        // Fetch analytics
        const _analyticsApiUrl = import.meta.env.VITE_API_URL || '';
        const analyticsApiUrlFixed = _analyticsApiUrl.startsWith('http') || _analyticsApiUrl === '' ? _analyticsApiUrl : `https://${_analyticsApiUrl}`;
        const analyticsRes = await fetch(`${analyticsApiUrlFixed}/api/analytics/summary`);
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
          
          // Update history
          setHistory(prev => {
            const newPoint = {
              time: new Date().toLocaleTimeString(),
              load: analyticsData.total_load,
              generation: analyticsData.total_generation,
              efficiency: analyticsData.grid_efficiency,
              traditional: 65, // Traditional grid baseline
              price: currentMarketPrice
            };
            const updated = [...prev, newPoint];
            return updated.slice(-50); // Keep last 50 points
          });
        }
      } catch (e) {
        console.error('API fetch error:', e);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, interval);
    return () => clearInterval(intervalId);
  }, [interval]);

  return { analytics, marketStatus, history };
}

// Main App Component
function App() {
  const location = useLocation();
  const geoBuildings = location.state?.buildings || [];
  
  const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultWsUrl = typeof window !== 'undefined' ? `${wsProtocol}//${window.location.host}/ws` : 'ws://localhost:8000/ws';
  const rawWsUrl = import.meta.env.VITE_WS_URL || '';
  const wsUrl = rawWsUrl.startsWith('ws') ? rawWsUrl : (rawWsUrl ? `wss://${rawWsUrl.replace('https://', '').replace('http://', '')}` : defaultWsUrl);
  const { connected, buildings, logs, gridEvents } = useWebSocket(wsUrl);
  const { analytics, marketStatus, history } = useAnalyticsPolling(5000);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingTelemetry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  // Get active grid events (memoized — only recomputes when gridEvents changes)
  const activeEvents    = useMemo(() => gridEvents.filter(e => e.active), [gridEvents]);
  const hasCloudCover   = useMemo(() => activeEvents.some(e => e.type === 'cloud_cover'),  [activeEvents]);
  const hasGridFailure  = useMemo(() => activeEvents.some(e => e.type === 'grid_failure'), [activeEvents]);

  const triggerEvent = async (type: string, payload: any = {}) => {
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || '';
      const apiUrl = rawApiUrl.startsWith('http') || rawApiUrl === '' ? rawApiUrl : `https://${rawApiUrl}`;
      await fetch(`${apiUrl}/api/grid/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type, ...payload })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Subtle particles background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
          particleColors={["#10b981", "#ffffff"]}
          particleCount={50}
          particleSpread={12}
          speed={0.05}
          particleBaseSize={80}
          moveParticlesOnHover={false}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-emerald-500/30 rounded-lg blur-sm animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                EcoSync
              </h1>
              <p className="text-xs text-slate-400">Smart Energy Microgrid</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="hidden md:flex items-center gap-4">
            <StatusBadge 
              icon={Server} 
              label="API" 
              active={connected} 
              activeColor="text-emerald-400"
            />
            <StatusBadge 
              icon={Cpu} 
              label="AI Agents" 
              active={buildings.length > 0} 
              activeColor="text-cyan-400"
            />
            <StatusBadge 
              icon={Sun} 
              label="Solar" 
              active={!hasCloudCover} 
              activeColor="text-amber-400"
            />
            <StatusBadge 
              icon={Activity} 
              label="Grid" 
              active={!hasGridFailure} 
              activeColor="text-green-400"
            />
            
            {/* Control Panel Buttons */}
            <div className="hidden xl:flex items-center gap-2 ml-6 pl-6 border-l border-slate-700/50">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/20 text-blue-300" onClick={() => triggerEvent('cloud_cover', { intensity: 0.8, duration: 30 })}>
                <CloudRain className="w-3 h-3 mr-1.5" /> Cloud Cover
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-red-500/50 bg-red-500/5 hover:bg-red-500/20 text-red-300" onClick={() => triggerEvent('grid_failure', { duration: 60 })}>
                <ShieldAlert className="w-3 h-3 mr-1.5" /> Grid Failure
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/20 text-amber-300" onClick={() => triggerEvent('price_update', { price: 0.50 })}>
                <DollarSign className="w-3 h-3 mr-1.5" /> Price Surge
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background border-border">
              <SheetHeader>
                <SheetTitle className="text-emerald-400">System Status</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <MobileStatusItem 
                  icon={Server} 
                  label="WebSocket" 
                  value={connected ? 'Connected' : 'Disconnected'}
                  status={connected ? 'good' : 'bad'}
                />
                <MobileStatusItem 
                  icon={Cpu} 
                  label="Active Buildings" 
                  value={buildings.length.toString()}
                  status="good"
                />
                <MobileStatusItem 
                  icon={TrendingUp} 
                  label="Grid Efficiency" 
                  value={`${analytics?.grid_efficiency.toFixed(1) || 0}%`}
                  status={analytics && analytics.grid_efficiency > 70 ? 'good' : 'warning'}
                />
                <MobileStatusItem 
                  icon={Battery} 
                  label="Avg Battery SoC" 
                  value={`${analytics?.avg_battery_soc.toFixed(1) || 0}%`}
                  status={analytics && analytics.avg_battery_soc > 30 ? 'good' : 'warning'}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Alert Banner */}
        {(hasCloudCover || hasGridFailure) && (
          <div className={`px-4 py-2 flex items-center gap-2 ${
            hasGridFailure ? 'bg-red-500/20 border-b border-red-500/50' : 'bg-amber-500/20 border-b border-amber-500/50'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${hasGridFailure ? 'text-red-400' : 'text-amber-400'}`} />
            <span className={`text-sm ${hasGridFailure ? 'text-red-300' : 'text-amber-300'}`}>
              {hasGridFailure 
                ? '⚠️ GRID FAILURE DETECTED - Buildings operating in island mode'
                : '☁️ Cloud cover event - Solar generation reduced by 80%'
              }
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          {/* 3D City View */}
          <div className="flex-1 relative">
            <CityGrid 
              buildings={buildings}
              onBuildingClick={setSelectedBuilding}
            />
            
            {/* Building Info Overlay */}
            {selectedBuilding && (
              <div className="absolute top-4 left-4 glass rounded-lg p-4 max-w-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-emerald-400">
                    Building #{selectedBuilding.building_id}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setSelectedBuilding(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="capitalize">{selectedBuilding.building_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Load:</span>
                    <span>{selectedBuilding.load.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solar:</span>
                    <span className="text-green-400">{selectedBuilding.solar_generation.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Battery:</span>
                    <span className={selectedBuilding.battery_soc < 30 ? 'text-red-400' : 'text-emerald-400'}>
                      {selectedBuilding.battery_soc.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <Badge 
                      variant="outline"
                      className={`
                        ${selectedBuilding.is_selling ? 'border-green-500 text-green-400' : ''}
                        ${selectedBuilding.is_buying ? 'border-amber-500 text-amber-400' : ''}
                        ${selectedBuilding.is_critical ? 'border-red-500 text-red-400' : ''}
                        ${!selectedBuilding.is_selling && !selectedBuilding.is_buying && !selectedBuilding.is_critical ? 'border-blue-500 text-blue-400' : ''}
                      `}
                    >
                      {selectedBuilding.is_selling && 'Selling'}
                      {selectedBuilding.is_buying && 'Buying'}
                      {selectedBuilding.is_critical && 'Critical'}
                      {!selectedBuilding.is_selling && !selectedBuilding.is_buying && !selectedBuilding.is_critical && 'Balanced'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass rounded-lg p-3">
              <h4 className="text-xs font-bold text-slate-400 mb-2">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Selling Energy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span>Buying Energy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500 animate-pulse" />
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  <span>Priority Building</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>Balanced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Analytics */}
          <div className="hidden lg:flex lg:flex-col w-golden-min bg-background/50 border-l border-border overflow-y-auto overflow-x-hidden">
            <div className="p-4 min-w-0">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-emerald-500/20">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-emerald-400 leading-none">Analytics</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time grid dashboard</p>
                </div>
              </div>
              <AnalyticsDashboard 
                buildings={buildings}
                analytics={analytics}
                marketStatus={marketStatus}
                history={history}
                onBuildingSelect={setSelectedBuilding}
              />
            </div>
          </div>
        </div>

        {/* Terminal Section */}
        <div 
          className={`border-t border-border bg-background transition-all duration-300 ${
            terminalExpanded ? 'h-96' : 'h-48'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-background/80 border-b border-border">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">AI Agent Logs</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setTerminalExpanded(!terminalExpanded)}
            >
              {terminalExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="h-[calc(100%-2.5rem)]">
            <LogTerminal logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ 
  icon: Icon, 
  label, 
  active, 
  activeColor 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  activeColor: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`w-4 h-4 ${active ? activeColor : 'text-slate-500'}`} />
      <span className={active ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
    </div>
  );
}

// Mobile Status Item
function MobileStatusItem({ 
  icon: Icon, 
  label, 
  value, 
  status 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad';
}) {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-amber-400',
    bad: 'text-red-400'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className={`text-sm font-medium ${statusColors[status]}`}>{value}</span>
    </div>
  );
}

export default App;

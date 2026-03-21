import { useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Zap, Battery, Activity, DollarSign, ShoppingCart, Store, AlertCircle } from 'lucide-react';
import type { BuildingTelemetry, AnalyticsSummary, MarketStatus } from '@/types';

interface AnalyticsDashboardProps {
  buildings: BuildingTelemetry[];
  analytics: AnalyticsSummary | null;
  marketStatus: MarketStatus | null;
  history: { time: string; load: number; generation: number; efficiency: number; price?: number }[];
  onBuildingSelect?: (building: BuildingTelemetry) => void;
}

const COLORS = {
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  cyan:   '#06b6d4',
  emerald:'#10b981',
};

// ─── Tooltip Styles ──────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0f172a',
    border: '1px solid rgba(16,185,129,0.4)',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    fontSize: '11px',
    padding: '8px 12px',
  },
  labelStyle: { color: '#94a3b8', marginBottom: 2 },
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description?: string;
  glowColor?: string;
}

const MetricCard = memo(function MetricCard({
  label, value, unit, trend = 'stable', color, icon: Icon, description, glowColor,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#f59e0b' : '#64748b';

  return (
    <div
      className="group relative flex flex-col gap-2 rounded-xl p-4 overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-default"
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,44,34,0.3) 100%)',
        border: `1px solid ${color}30`,
        boxShadow: `0 0 0 0 ${color}00`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${glowColor || color}25, inset 0 0 20px ${color}08`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}70`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 0 transparent';
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}30`;
      }}
      title={description}
    >
      {/* Background glow orb */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: color }}
      />

      {/* Header row: label + icon */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className="text-xs font-medium text-slate-400 leading-tight">{label}</span>
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>

      {/* Value row */}
      <div className="flex items-end gap-1.5 relative z-10 min-w-0">
        <span
          className="text-2xl font-black leading-none tracking-tight truncate"
          style={{ color }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-slate-400 leading-none mb-0.5 flex-shrink-0">
            {unit}
          </span>
        )}
      </div>

      {/* Trend row */}
      <div className="flex items-center gap-1 relative z-10">
        <TrendIcon className="w-3 h-3 flex-shrink-0" style={{ color: trendColor }} />
        <span className="text-xs font-medium" style={{ color: trendColor }}>
          {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
        </span>
      </div>
    </div>
  );
});

// ─── Market Stat Card ─────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description?: string;
}

const StatCard = memo(function StatCard({ label, value, sub, color, icon: Icon, description }: StatCardProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3.5 transition-all duration-200 cursor-default"
      style={{
        background: 'rgba(15,23,42,0.8)',
        border: `1px solid ${color}25`,
      }}
      title={description}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-xl font-black truncate" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs text-slate-500 truncate">{sub}</div>
      )}
    </div>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, accent = false }: { title: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {accent && <div className="w-1 h-4 rounded-full bg-emerald-400" />}
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AnalyticsDashboard({
  buildings,
  analytics,
  marketStatus,
  history,
  onBuildingSelect,
}: AnalyticsDashboardProps) {

  const statusDistribution = useMemo(() => [
    { name: 'Selling',  value: buildings.filter(b => b.is_selling).length,                                             color: COLORS.green  },
    { name: 'Buying',   value: buildings.filter(b => b.is_buying).length,                                              color: COLORS.amber  },
    { name: 'Critical', value: buildings.filter(b => b.is_critical).length,                                            color: COLORS.red    },
    { name: 'Balanced', value: buildings.filter(b => !b.is_selling && !b.is_buying && !b.is_critical).length,           color: COLORS.blue   },
  ], [buildings]);

  const batteryDistribution = useMemo(() =>
    buildings
      .map(b => ({ id: b.building_id, soc: b.battery_soc, type: b.building_type }))
      .sort((a, b) => b.soc - a.soc)
      .slice(0, 15),
    [buildings]
  );

  const buyingPower  = useMemo(() => buildings.filter(b => b.is_buying).reduce((s, b)  => s + Math.max(0, b.load - b.solar_generation), 0), [buildings]);
  const sellingPower = useMemo(() => buildings.filter(b => b.is_selling).reduce((s, b) => s + Math.max(0, b.solar_generation - b.load), 0),  [buildings]);
  const criticalBuildings = useMemo(() => buildings.filter(b => b.is_critical), [buildings]);
  const netGridFlow = analytics?.net_grid_flow ?? 0;
  const gridEff = analytics?.grid_efficiency ?? 0;

  return (
    <div className="space-y-5 pb-4">

      {/* ── Section 1: Key Metrics ── */}
      <div>
        <SectionHeader title="Grid Metrics" accent />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Grid Efficiency"
            value={`${gridEff.toFixed(1)}%`}
            trend={gridEff > 70 ? 'up' : 'down'}
            color={COLORS.emerald}
            glowColor={COLORS.emerald}
            icon={Activity}
            description="% of generated solar consumed locally rather than exported"
          />
          <MetricCard
            label="Total Generation"
            value={(analytics?.total_generation ?? 0).toFixed(0)}
            unit="kW"
            trend="up"
            color={COLORS.cyan}
            icon={Zap}
            description="Instantaneous total solar power across all buildings"
          />
          <MetricCard
            label="Net Grid Flow"
            value={Math.abs(netGridFlow).toFixed(0)}
            unit="kW"
            trend={netGridFlow < 0 ? 'down' : 'up'}
            color={netGridFlow < 0 ? COLORS.green : COLORS.amber}
            icon={TrendingUp}
            description="Net power drawn from the traditional grid. Negative = microgrid exporting."
          />
          <MetricCard
            label="Avg Battery SoC"
            value={`${(analytics?.avg_battery_soc ?? 0).toFixed(1)}%`}
            trend="stable"
            color={COLORS.purple}
            icon={Battery}
            description="Average battery state-of-charge across the entire grid"
          />
        </div>
      </div>

      {/* ── Section 2: Market Stats ── */}
      {marketStatus && (
        <div>
          <SectionHeader title="Market Status" accent />
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Market Price"
              value={`$${marketStatus.current_price.toFixed(3)}`}
              sub="per kWh"
              color={COLORS.emerald}
              icon={DollarSign}
              description="Current AI-negotiated dynamic price per kWh"
            />
            <StatCard
              label="Trades Today"
              value={marketStatus.trades_today.toString()}
              sub={`Vol: ${marketStatus.total_volume.toFixed(1)} kWh`}
              color={COLORS.cyan}
              icon={Activity}
              description="Number of P2P energy trades executed today"
            />
            <StatCard
              label="Active Sellers"
              value={marketStatus.active_sellers.toString()}
              sub={`${sellingPower.toFixed(1)} kW surplus`}
              color={COLORS.green}
              icon={Store}
              description="Buildings with excess energy selling on the P2P market"
            />
            <StatCard
              label="Active Buyers"
              value={marketStatus.active_buyers.toString()}
              sub={`${buyingPower.toFixed(1)} kW needed`}
              color={COLORS.amber}
              icon={ShoppingCart}
              description="Buildings with energy deficits buying on the P2P market"
            />
          </div>
        </div>
      )}

      {/* ── Critical Buildings Alert ── */}
      {criticalBuildings.length > 0 && (
        <div
          className="rounded-xl p-3.5 space-y-2.5"
          style={{
            background: 'rgba(127,29,29,0.15)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              {criticalBuildings.length} Critical Building{criticalBuildings.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalBuildings.map(b => (
              <Button
                key={b.building_id}
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono border-red-500/40 bg-red-500/10 hover:bg-red-500/25 text-red-300 transition-all"
                onClick={() => onBuildingSelect?.(b)}
              >
                #{b.building_id} — {b.battery_soc.toFixed(1)}%
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 3: Grid Performance Chart ── */}
      <div>
        <SectionHeader title="Grid Performance vs Traditional" accent />
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-full" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gradTrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.red} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.6)" />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickFormatter={v => v.split(':').slice(1).join(':')}
                  tickLine={false}
                />
                <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="efficiency"  name="EcoSync"      stroke={COLORS.emerald} strokeWidth={2} fill="url(#gradEff)"  />
                <Area type="monotone" dataKey="traditional" name="Traditional"  stroke={COLORS.red}     strokeWidth={1.5} fill="url(#gradTrad)" strokeDasharray="4 3" />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 4: Load vs Generation ── */}
      <div>
        <SectionHeader title="Load vs Generation — Live" accent />
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-full" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.slice(-20)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.6)" />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickFormatter={v => v.split(':').slice(1).join(':')}
                  tickLine={false}
                />
                <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="load"       name="Load"       stroke={COLORS.amber}   strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="generation" name="Generation" stroke={COLORS.green}   strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 5: Building Status Pie ── */}
      <div>
        <SectionHeader title="Building Status Distribution" accent />
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-full" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={entry.value === 0 ? 0.25 : 1} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 6: Battery Levels ── */}
      <div>
        <SectionHeader title="Top Battery Levels" accent />
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={batteryDistribution}
                layout="vertical"
                margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.6)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="id"
                  stroke="#475569"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickLine={false}
                  width={24}
                  tickFormatter={v => `#${v}`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Battery SoC']}
                />
                <Bar
                  dataKey="soc"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={data => {
                    const b = buildings.find(bld => bld.building_id === data.id);
                    if (b && onBuildingSelect) onBuildingSelect(b);
                  }}
                >
                  {batteryDistribution.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.soc > 80 ? COLORS.green : entry.soc > 30 ? COLORS.amber : COLORS.red}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 7: Market Price History ── */}
      <div>
        <SectionHeader title="Market Price History" accent />
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="w-full" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.amber} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.6)" />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickFormatter={v => v.split(':').slice(1).join(':')}
                  tickLine={false}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickLine={false}
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  domain={['dataMin - 0.02', 'dataMax + 0.02']}
                  width={42}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(val: number) => [`$${val.toFixed(3)}`, 'Market Price']}
                />
                <Area
                  type="stepAfter"
                  dataKey="price"
                  name="Market Price"
                  stroke={COLORS.amber}
                  strokeWidth={2}
                  fill="url(#gradPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}

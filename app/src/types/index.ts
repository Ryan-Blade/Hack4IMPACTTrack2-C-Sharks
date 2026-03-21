// EcoSync Type Definitions

export interface BuildingTelemetry {
  building_id: number;
  load: number;
  solar_generation: number;
  battery_soc: number;
  grid_frequency: number;
  is_selling: boolean;
  is_buying: boolean;
  is_critical: boolean;
  is_priority: boolean;
  building_type: string;
  net_energy: number;
  timestamp: string;
}

export interface AgentLog {
  agent_id: number;
  building_type: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical' | 'negotiation';
  state: string;
  battery_soc: number;
  net_energy: number;
}

export interface GridEvent {
  type: 'cloud_cover' | 'grid_failure' | 'price_update';
  active: boolean;
  intensity?: number;
  price?: number;
  timestamp: string;
}

export interface MarketStatus {
  current_price: number;
  trades_today: number;
  total_volume: number;
  grid_stability: number;
  active_sellers: number;
  active_buyers: number;
  critical_buildings: number;
}

export interface AnalyticsSummary {
  total_load: number;
  total_generation: number;
  net_grid_flow: number;
  avg_battery_soc: number;
  grid_efficiency: number;
  building_count: number;
  timestamp: string;
}

export interface Trade {
  buyer_id: number;
  seller_id: number;
  amount: number;
  price: number;
  total_cost: number;
  timestamp: string;
}

export interface AgentStatus {
  agent_id: number;
  building_type: string;
  state: string;
  balance: number;
  reputation: number;
  battery_soc: number;
  net_energy: number;
  is_selling: boolean;
  is_buying: boolean;
  trades_completed: number;
  recent_logs: AgentLog[];
}

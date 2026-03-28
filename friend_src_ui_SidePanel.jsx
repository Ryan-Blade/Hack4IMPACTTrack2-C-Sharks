import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useEcoStore from '../store/useEcoStore';
import useWeather from '../hooks/useWeather';
import PowerCards from './PowerCards';
import TradeLog from './TradeLog';

const WEATHER_ICONS = {
  'clear sky': '☀️',
  'few clouds': '🌤️',
  'scattered clouds': '⛅',
  'broken clouds': '☁️',
  'overcast clouds': '☁️',
  'shower rain': '🌧️',
  'rain': '🌧️',
  'thunderstorm': '⛈️',
  'snow': '❄️',
  'mist': '🌫️',
  'partly cloudy': '⛅',
  'haze': '🌫️',
};

function getWeatherIcon(desc) {
  const lower = (desc || '').toLowerCase();
  return WEATHER_ICONS[lower] || '🌤️';
}

function GodModePanel() {
  const [expanded, setExpanded] = useState(false);
  const weatherOverride = useEcoStore(s => s.weatherOverride);
  const setWeatherOverride = useEcoStore(s => s.setWeatherOverride);

  const setWeather = (mode) => {
    setWeatherOverride(weatherOverride === mode ? null : mode);
  };

  return (
    <div className="px-4 pb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors border border-white/5 bg-white/5 hover:bg-white/10"
      >
        <span className="text-[11px] font-bold text-cyan-400 tracking-[0.1em]">⚡ GOD MODE</span>
        <span className="text-white/50 text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                className={`weather-btn ${weatherOverride === 'OVERCAST' ? 'active shadow-[0_0_10px_rgba(100,100,100,0.5)]' : ''}`}
                onClick={() => setWeather('OVERCAST')}
              >
                ☁️ Overcast
              </button>
              <button 
                className={`weather-btn ${weatherOverride === 'THUNDERSTORM' ? 'active shadow-[0_0_10px_rgba(200,200,255,0.5)]' : ''}`}
                onClick={() => setWeather('THUNDERSTORM')}
              >
                ⛈️ Storm
              </button>
              <button 
                className={`weather-btn ${weatherOverride === 'HEAT_WAVE' ? 'active shadow-[0_0_10px_rgba(255,100,0,0.5)]' : ''}`}
                onClick={() => setWeather('HEAT_WAVE')}
              >
                🌊 Heat Wave
              </button>
              <button 
                className={`weather-btn ${weatherOverride === 'BLIZZARD' ? 'active shadow-[0_0_10px_rgba(200,255,255,0.5)]' : ''}`}
                onClick={() => setWeather('BLIZZARD')}
              >
                ❄️ Blizzard
              </button>
              <button 
                className={`weather-btn ${weatherOverride === 'PERFECT_WIND' ? 'active shadow-[0_0_10px_rgba(0,212,255,0.5)]' : ''}`}
                onClick={() => setWeather('PERFECT_WIND')}
              >
                🌬️ High Wind
              </button>
              <button 
                className="weather-btn text-gray-400 hover:text-white"
                onClick={() => setWeatherOverride(null)}
              >
                ☀️ Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function SidePanel() {
  const weatherData = useEcoStore((s) => s.weatherData);
  const buildings = useEcoStore((s) => s.buildings);
  const totalSupply = useEcoStore((s) => Object.values(s.powerSources).reduce((acc, ps) => acc + (ps.active ? ps.output_kw : 0), 0));
  
  const sidePanelOpen = useEcoStore((s) => s.sidePanelOpen);

  const [pinInput, setPinInput] = useState('');
  const { fetchWeather } = useWeather();
  
  const handleLoadCity = () => {
    if (pinInput.trim()) {
      fetchWeather(pinInput.trim());
      setPinInput('');
    }
  };

  const totalDemand = buildings.reduce((acc, b) => acc + (b.active ? b.consumption_kw : 0), 0);
  const activeBuildings = buildings.filter(b => b.active).length;
  const efficiency = totalDemand > 0 ? Math.min(100, Math.round((totalSupply / totalDemand) * 100)) : 100;

  return (
    <AnimatePresence>
      {sidePanelOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="glass-panel fixed right-0 top-0 h-full w-[320px] z-[500] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
          id="side-panel"
        >
          <div className="flex-1 overflow-y-auto pt-16 pb-4 space-y-6">
            
            {/* Weather & Location */}
            <div className="px-4">
              <div className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  placeholder="City or Pincode..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadCity()}
                  className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleLoadCity}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 245, 160, 0.2))',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: '#00D4FF',
                  }}
                >
                  Load
                </button>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-white/5 border border-white/5">
                <span className="text-lg leading-none">{getWeatherIcon(weatherData.description)}</span>
                <span className="text-xs text-gray-300 font-medium">{weatherData.city}</span>
                <span className="text-white/20">|</span>
                <span className="text-xs text-white font-mono tabular-nums">{weatherData.temp}°C</span>
                <span className="text-white/20">|</span>
                <span className="text-[10px] text-gray-400 font-mono tracking-widest tabular-nums">☁ {weatherData.clouds}%</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-4" />

            {/* Power Source Toggles */}
            <PowerCards />

            {/* Divider */}
            <div className="h-px bg-white/10 mx-4" />

            {/* Note: Building List has been removed in favor of direct 3D interaction + BuildingPopup */}
            <GodModePanel />

            <TradeLog />
            
          </div>

          {/* Stats Footer */}
          <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 tracking-[0.05em]">PRODUCTION</span>
                <span className="font-mono tabular-nums font-bold text-green-400">{totalSupply.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 tracking-[0.05em]">CONSUMPTION</span>
                <span className="font-mono tabular-nums font-bold text-orange-400">{totalDemand.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 tracking-[0.05em]">ACTIVE</span>
                <span className="font-mono tabular-nums font-bold text-cyan-400">{activeBuildings}/50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 tracking-[0.05em]">EFFICIENCY</span>
                <span className="font-mono tabular-nums font-bold" style={{ color: efficiency > 80 ? '#00F5A0' : efficiency > 50 ? '#FFD700' : '#FF3333' }}>
                  {efficiency}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

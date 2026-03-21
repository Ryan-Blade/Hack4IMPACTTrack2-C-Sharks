import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgentLog } from '@/types';

interface LogTerminalProps {
  logs: AgentLog[];
  maxLogs?: number;
}

export function LogTerminal({ logs, maxLogs = 100 }: LogTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Get color based on log type
  const getLogColor = (type: string): string => {
    switch (type) {
      case 'critical':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-amber-400';
      case 'negotiation':
        return 'text-cyan-400';
      default:
        return 'text-emerald-300';
    }
  };

  // Get icon based on log type
  const getLogIcon = (type: string): string => {
    switch (type) {
      case 'critical':
        return '⚠';
      case 'success':
        return '✓';
      case 'warning':
        return '!';
      case 'negotiation':
        return '⇄';
      default:
        return '›';
    }
  };

  // Get building type emoji
  const getBuildingEmoji = (type: string): string => {
    switch (type) {
      case 'hospital':
        return '🏥';
      case 'datacenter':
        return '🖥';
      case 'emergency':
        return '🚨';
      case 'commercial':
        return '🏢';
      case 'residential':
        return '🏠';
      default:
        return '🏢';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Limit logs to maxLogs
  const displayLogs = logs.slice(-maxLogs);

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-emerald-500/30 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-emerald-500/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-emerald-400 font-mono">
            AI Agent Thought Logs
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Total: {logs.length}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 font-mono text-xs space-y-1">
          {displayLogs.length === 0 ? (
            <div className="text-slate-500 italic">
              Waiting for agent activity...
            </div>
          ) : (
            displayLogs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className="flex items-start gap-2 py-0.5 hover:bg-slate-900/50 rounded px-1"
              >
                {/* Timestamp */}
                <span className="text-slate-500 shrink-0 w-16">
                  {formatTime(log.timestamp)}
                </span>
                
                {/* Building ID with emoji */}
                <span className="text-slate-400 shrink-0 w-16">
                  {getBuildingEmoji(log.building_type)}
                  <span className="ml-1">#{log.agent_id.toString().padStart(2, '0')}</span>
                </span>
                
                {/* Log type icon */}
                <span className={`shrink-0 w-4 ${getLogColor(log.type)}`}>
                  {getLogIcon(log.type)}
                </span>
                
                {/* Message */}
                <span className={`${getLogColor(log.type)} break-words`}>
                  {log.message}
                </span>
                
                {/* Battery indicator */}
                {log.battery_soc !== undefined && (
                  <span className="ml-auto shrink-0 text-slate-500">
                    [SoC: {log.battery_soc.toFixed(1)}%]
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Terminal Footer */}
      <div className="px-3 py-1 bg-slate-900 border-t border-emerald-500/30 text-xs text-slate-500">
        <span className="text-emerald-500">➜</span> EcoSync Agent Network v1.0.0
      </div>
    </div>
  );
}

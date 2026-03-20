'use client';

import { AIEvent } from '@/lib/types';
import { useMemo } from 'react';

interface StatsBarProps {
  events: AIEvent[];
  isSearching: boolean;
  lastArea: string | null;
}

export default function StatsBar({ events, isSearching, lastArea }: StatsBarProps) {
  const stats = useMemo(() => {
    const types: Record<string, number> = {};
    let online = 0;
    let free = 0;
    const areas = new Set<string>();

    for (const e of events) {
      if (e.event_type) types[e.event_type] = (types[e.event_type] || 0) + 1;
      if (e.is_online) online++;
      if (e.price_range === 'free') free++;
      if (e.search_area) areas.add(e.search_area);
    }

    return { types, online, free, areas: areas.size };
  }, [events]);

  const topType = Object.entries(stats.types).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-border-dim text-[10px] text-text-dim overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`status-dot ${isSearching ? 'status-scanning' : 'status-active'}`} />
        <span className="tracking-widest text-text-dim">
          {isSearching ? 'SCANNING' : 'SENTINEL ONLINE'}
        </span>
      </div>

      <div className="h-3 w-px bg-border-dim" />

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">EVENTS:</span>
        <span className="text-cyan font-semibold">{events.length}</span>
      </div>

      {lastArea && (
        <>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-text-muted">AREA:</span>
            <span className="text-text-primary">{lastArea}</span>
          </div>
        </>
      )}

      {stats.online > 0 && (
        <>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-text-muted">ONLINE:</span>
            <span className="text-neon-green">{stats.online}</span>
          </div>
        </>
      )}

      {stats.free > 0 && (
        <>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-text-muted">FREE:</span>
            <span className="text-neon-green">{stats.free}</span>
          </div>
        </>
      )}

      {topType && (
        <>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-text-muted">TOP TYPE:</span>
            <span className="text-amber uppercase">{topType[0]} ({topType[1]})</span>
          </div>
        </>
      )}

      <div className="flex-1" />

      <span className="text-text-muted shrink-0 tracking-widest">
        {new Date().toLocaleTimeString('en', { hour12: false })}
      </span>
    </div>
  );
}

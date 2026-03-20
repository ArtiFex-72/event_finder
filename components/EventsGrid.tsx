'use client';

import { useState, useMemo } from 'react';
import { AIEvent } from '@/lib/types';
import EventCard from './EventCard';

interface EventsGridProps {
  events: AIEvent[];
  onClear: () => void;
  isLoading: boolean;
}

const EVENT_TYPES = ['all', 'conference', 'meetup', 'workshop', 'hackathon', 'webinar', 'summit'];

export default function EventsGrid({ events, onClear, isLoading }: EventsGridProps) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filter !== 'all' && e.event_type?.toLowerCase() !== filter) return false;
      if (onlineOnly && !e.is_online) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.organizer?.toLowerCase().includes(q) ||
          e.topics?.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, filter, search, onlineOnly]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) {
      const t = e.event_type?.toLowerCase() || 'other';
      c[t] = (c[t] || 0) + 1;
    }
    return c;
  }, [events]);

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-dim">
        <div className={`status-dot ${isLoading ? 'status-scanning' : events.length > 0 ? 'status-active' : 'status-idle'}`} />
        <span className="text-xs tracking-widest text-text-dim uppercase">
          Intelligence Feed
        </span>
        <div className="flex-1" />
        <span className="text-xs text-cyan animate-count">
          {filtered.length}/{events.length} targets
        </span>
        {events.length > 0 && (
          <button onClick={onClear} className="btn-danger text-xs px-2 py-1 rounded">
            PURGE
          </button>
        )}
      </div>

      {/* Filters */}
      {events.length > 0 && (
        <div className="px-4 py-2 border-b border-border-dim space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter events..."
              className="intel-input flex-1 px-3 py-1.5 text-xs rounded"
            />
            <button
              onClick={() => setOnlineOnly(!onlineOnly)}
              className={`tag cursor-pointer transition-all ${onlineOnly ? 'tag-green' : 'tag-cyan opacity-40 hover:opacity-70'}`}
            >
              ONLINE ONLY
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {EVENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`tag cursor-pointer transition-all ${
                  filter === type ? 'tag-cyan' : 'tag-cyan opacity-35 hover:opacity-60'
                }`}
              >
                {type} {counts[type] !== undefined ? `(${counts[type]})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border border-cyan rounded-full animate-ping opacity-20" />
                <div className="absolute inset-2 border border-cyan rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                <div className="absolute inset-4 border border-cyan-dim rounded-full animate-spin" style={{ animationDirection: 'reverse', borderRightColor: 'transparent' }} />
              </div>
              <p className="text-xs text-cyan tracking-widest">SWEEPING INTELLIGENCE NETWORK</p>
              <p className="text-[10px] text-text-dim">Querying global AI event databases...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-text-muted text-xs tracking-widest">
                {events.length === 0 ? 'NO DATA — INITIATE RESEARCH SWEEP' : 'NO MATCHES FOR CURRENT FILTER'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {filtered.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

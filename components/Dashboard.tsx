'use client';

import { useState, useCallback, useEffect } from 'react';
import { AIEvent, LogEntry, ResearchQuery } from '@/lib/types';
import SearchPanel from './SearchPanel';
import EventsGrid from './EventsGrid';
import ResearchLog from './ResearchLog';
import StatsBar from './StatsBar';

export default function Dashboard() {
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastArea, setLastArea] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [bootSequence, setBootSequence] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en', { hour12: false }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('en', { hour12: false }));

    // Boot sequence
    const bt = setTimeout(() => setBootSequence(false), 1800);

    return () => { clearInterval(t); clearTimeout(bt); };
  }, []);

  // Load saved events on mount
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        if (data.events?.length) {
          setEvents(data.events);
          const area = data.events[0]?.search_area;
          if (area) setLastArea(area);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = useCallback(async (query: ResearchQuery) => {
    setIsSearching(true);
    setLogs([]);
    setLastArea(query.location);

    const addLog = (entry: LogEntry) => setLogs(prev => [...prev, entry]);

    addLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Research directive received — target: ${query.location}`,
    });

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'log') {
              addLog(data.entry);
            } else if (data.type === 'complete') {
              addLog({
                timestamp: new Date().toISOString(),
                level: 'COMPLETE',
                message: `Research sweep complete — ${data.totalFound} events found, ${data.totalSaved} stored`,
              });
              // Refresh events from DB
              const evRes = await fetch('/api/events');
              const evData = await evRes.json();
              setEvents(evData.events || []);
            } else if (data.type === 'error') {
              addLog({
                timestamp: new Date().toISOString(),
                level: 'ERROR',
                message: data.message,
              });
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      addLog({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClear = useCallback(async () => {
    await fetch('/api/events', { method: 'DELETE' });
    setEvents([]);
    setLogs([]);
    setLastArea(null);
  }, []);

  if (bootSequence) {
    return (
      <div className="fixed inset-0 bg-bg-deep flex items-center justify-center bg-grid">
        <div className="text-center space-y-4">
          <div className="text-cyan text-glow-cyan text-2xl font-bold tracking-[0.3em] animate-pulse">
            SENTINEL
          </div>
          <div className="text-xs text-text-dim tracking-widest">
            AI EVENT INTELLIGENCE SYSTEM
          </div>
          <div className="flex justify-center gap-1 mt-4">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-cyan"
                style={{ animation: `blink 1s ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
          <div className="text-[10px] text-text-muted tracking-widest mt-2">
            INITIALIZING SYSTEMS...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-deep bg-grid overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center px-4 py-2 border-b border-border-dim bg-bg-deep z-10">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 border border-cyan rounded-sm rotate-45 glow-cyan opacity-60" />
            <div className="absolute inset-1 border border-cyan-dim rounded-sm" />
            <span className="text-cyan text-[8px] font-bold z-10">AI</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.25em] text-cyan text-glow-cyan uppercase">
              Sentinel
            </h1>
            <p className="text-[9px] text-text-muted tracking-[0.15em] uppercase">
              AI Event Intelligence
            </p>
          </div>
        </div>

        <div className="flex-1 mx-4 h-px bg-gradient-to-r from-border-active via-border-dim to-transparent" />

        {/* System status */}
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">ENGINE</span>
            <span className="text-cyan tracking-wider">GEMINI-2.0-FLASH</span>
          </div>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">DB</span>
            <span className="text-neon-green">NEON-PG</span>
          </div>
          <div className="h-3 w-px bg-border-dim" />
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${isSearching ? 'status-scanning' : 'status-active'}`} />
            <span className={isSearching ? 'text-cyan' : 'text-neon-green'}>
              {isSearching ? 'SCANNING' : 'READY'}
            </span>
          </div>
          <div className="h-3 w-px bg-border-dim" />
          <span className="text-text-dim font-mono">{currentTime}</span>
        </div>
      </header>

      {/* Stats bar */}
      <StatsBar events={events} isSearching={isSearching} lastArea={lastArea} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Search */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-border-dim overflow-y-auto">
          <div className="p-3 flex-1">
            <SearchPanel onSearch={handleSearch} isSearching={isSearching} />
          </div>

          {/* System readouts */}
          <div className="border-t border-border-dim p-3 space-y-2">
            <div className="text-[9px] text-text-muted tracking-widest uppercase mb-1">System Readout</div>
            {[
              { label: 'Research Engine', value: 'Gemini 2.0 Flash + Google Search', color: 'text-cyan' },
              { label: 'Fallback Engine', value: 'GPT-4o', color: 'text-text-dim' },
              { label: 'Data Store', value: 'Neon PostgreSQL', color: 'text-neon-green' },
              { label: 'Events Indexed', value: String(events.length), color: 'text-cyan' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-[10px]">
                <span className="text-text-muted">{item.label}</span>
                <span className={item.color}>{item.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center - Events Grid */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <EventsGrid
            events={events}
            onClear={handleClear}
            isLoading={isSearching}
          />
        </main>

        {/* Right sidebar - Research Log */}
        <aside className="w-72 shrink-0 border-l border-border-dim flex flex-col overflow-hidden">
          <ResearchLog logs={logs} isActive={isSearching} />
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-border-dim text-[9px] text-text-muted">
        <span className="tracking-widest">SENTINEL AI INTELLIGENCE PLATFORM</span>
        <span>POWERED BY GEMINI 2.0 FLASH + GOOGLE SEARCH</span>
        <span className="tracking-widest">v2.0.0</span>
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { LogEntry } from '@/lib/types';

interface ResearchLogProps {
  logs: LogEntry[];
  isActive: boolean;
}

const LOG_ICONS: Record<LogEntry['level'], string> = {
  INFO: '◈',
  SCAN: '◎',
  FOUND: '◆',
  STORED: '◉',
  ERROR: '✕',
  COMPLETE: '★',
};

export default function ResearchLog({ logs, isActive }: ResearchLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-dim">
        <div className={`status-dot ${isActive ? 'status-scanning' : 'status-idle'}`} />
        <span className="text-xs tracking-widest text-text-dim uppercase">
          Research Log
        </span>
        <div className="flex-1" />
        <span className="text-xs text-text-muted">{logs.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5 min-h-0">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-text-muted text-xs tracking-widest">AWAITING DIRECTIVE</p>
              <p className="text-border-active text-xs mt-1 cursor-blink" />
            </div>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-entry flex items-start gap-2 py-0.5">
              <span className="text-text-muted text-[10px] shrink-0 mt-0.5">
                {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
              </span>
              <span className={`log-${log.level} shrink-0`}>
                {LOG_ICONS[log.level]}
              </span>
              <span className="text-[10px] leading-relaxed text-text-dim">
                <span className={`log-${log.level} font-semibold mr-1`}>[{log.level}]</span>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {isActive && (
        <div className="px-4 py-2 border-t border-border-dim relative overflow-hidden">
          <div className="scan-line opacity-50" />
          <p className="text-[10px] text-cyan tracking-widest animate-pulse">
            ◎ SWEEP IN PROGRESS...
          </p>
        </div>
      )}
    </div>
  );
}

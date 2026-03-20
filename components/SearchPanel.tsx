'use client';

import { useState } from 'react';
import { ResearchQuery } from '@/lib/types';

const AI_TOPICS = [
  'Machine Learning', 'LLM', 'Computer Vision', 'NLP',
  'Robotics', 'AI Ethics', 'Deep Learning', 'Generative AI',
  'AI Startups', 'Data Science', 'Autonomous Systems'
];

interface SearchPanelProps {
  onSearch: (query: ResearchQuery) => void;
  isSearching: boolean;
}

export default function SearchPanel({ onSearch, isSearching }: SearchPanelProps) {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    onSearch({
      location: location.trim(),
      radius: radius || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    });
  };

  return (
    <div className="panel panel-active corner-deco p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="status-dot status-scanning" />
        <span className="text-xs tracking-widest text-cyan uppercase font-semibold">
          Intel Acquisition Module
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-border-active to-transparent" />
        <span className="text-xs text-text-dim tracking-wider">SYS-SENTINEL-v2</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location */}
        <div>
          <label className="text-xs text-text-dim tracking-widest uppercase block mb-1.5">
            Target Area
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan text-xs select-none">›</span>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA  |  London, UK  |  Berlin"
              className="intel-input w-full pl-6 pr-3 py-2.5 text-sm rounded"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Radius */}
          <div>
            <label className="text-xs text-text-dim tracking-widest uppercase block mb-1.5">
              Radius
            </label>
            <select
              value={radius}
              onChange={e => setRadius(e.target.value)}
              className="intel-input w-full px-3 py-2.5 text-sm rounded appearance-none"
            >
              <option value="">Any range</option>
              <option value="10km">10 km</option>
              <option value="25km">25 km</option>
              <option value="50km">50 km</option>
              <option value="100km">100 km</option>
              <option value="national">National</option>
            </select>
          </div>

          {/* Empty col for alignment */}
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-dim tracking-widest uppercase block mb-1.5">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="intel-input w-full px-3 py-2.5 text-sm rounded"
            />
          </div>
          <div>
            <label className="text-xs text-text-dim tracking-widest uppercase block mb-1.5">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="intel-input w-full px-3 py-2.5 text-sm rounded"
            />
          </div>
        </div>

        {/* Topics */}
        <div>
          <label className="text-xs text-text-dim tracking-widest uppercase block mb-2">
            Focus Topics <span className="text-text-muted">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {AI_TOPICS.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`tag cursor-pointer transition-all ${
                  selectedTopics.includes(topic)
                    ? 'tag-cyan glow-cyan scale-105'
                    : 'tag-cyan opacity-40 hover:opacity-70'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSearching || !location.trim()}
          className="btn-primary w-full py-3 text-sm font-semibold rounded mt-2"
        >
          {isSearching ? (
            <span className="flex items-center justify-center gap-2">
              <span className="status-dot status-scanning inline-block" />
              SCANNING INTELLIGENCE NETWORK...
            </span>
          ) : (
            '[ INITIATE RESEARCH SWEEP ]'
          )}
        </button>
      </form>
    </div>
  );
}

'use client';

import { AIEvent } from '@/lib/types';

interface EventCardProps {
  event: AIEvent;
  index: number;
}

const TYPE_COLORS: Record<string, string> = {
  conference: 'tag-cyan',
  meetup: 'tag-green',
  workshop: 'tag-amber',
  hackathon: 'tag-red',
  webinar: 'tag-purple',
  summit: 'tag-cyan',
  other: 'tag-amber',
};

const PRICE_LABELS: Record<string, { label: string; class: string }> = {
  free: { label: 'FREE', class: 'tag-green' },
  paid: { label: 'PAID', class: 'tag-amber' },
  unknown: { label: 'TBD', class: 'tag-amber' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  try {
    return new Date(dateStr).toLocaleDateString('en', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function EventCard({ event, index }: EventCardProps) {
  const typeColor = event.event_type ? TYPE_COLORS[event.event_type.toLowerCase()] || 'tag-amber' : 'tag-amber';
  const priceInfo = event.price_range ? PRICE_LABELS[event.price_range.toLowerCase()] || PRICE_LABELS.unknown : PRICE_LABELS.unknown;

  return (
    <div
      className="event-card rounded p-4 animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 30, 500)}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-primary leading-snug flex-1">
          {event.title}
        </h3>
        <div className="flex gap-1 shrink-0">
          {event.event_type && (
            <span className={`tag ${typeColor}`}>{event.event_type}</span>
          )}
          {event.is_online && (
            <span className="tag tag-green">ONLINE</span>
          )}
        </div>
      </div>

      {/* Location & Date */}
      <div className="flex items-center gap-4 mb-2 text-[10px] text-text-dim">
        {(event.city || event.location) && (
          <span className="flex items-center gap-1">
            <span className="text-cyan">◈</span>
            {event.city || event.location}
            {event.country && `, ${event.country}`}
          </span>
        )}
        {event.start_date && (
          <span className="flex items-center gap-1">
            <span className="text-cyan">◷</span>
            {formatDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && ` → ${formatDate(event.end_date)}`}
          </span>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-[10px] text-text-dim leading-relaxed mb-3 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Topics */}
      {event.topics && event.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {event.topics.slice(0, 5).map(topic => (
            <span key={topic} className="tag tag-cyan opacity-70">{topic}</span>
          ))}
          {event.topics.length > 5 && (
            <span className="tag tag-cyan opacity-40">+{event.topics.length - 5}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border-dim">
        <div className="flex items-center gap-2">
          {event.organizer && (
            <span className="text-[10px] text-text-muted truncate max-w-[140px]">
              {event.organizer}
            </span>
          )}
          <span className={`tag ${priceInfo.class}`}>{priceInfo.label}</span>
        </div>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-cyan hover:text-text-primary transition-colors tracking-wider uppercase"
          >
            ACCESS →
          </a>
        )}
      </div>
    </div>
  );
}

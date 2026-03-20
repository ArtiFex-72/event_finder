export interface AIEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  event_type: string | null;
  url: string | null;
  organizer: string | null;
  topics: string[];
  is_online: boolean;
  price_range: string | null;
  source: string | null;
  search_area: string | null;
  created_at: string;
}

export interface ResearchQuery {
  location: string;
  radius?: string;
  dateFrom?: string;
  dateTo?: string;
  topics?: string[];
}

export interface ResearchResult {
  events: AIEvent[];
  totalFound: number;
  sources: string[];
  searchQueries: string[];
  researchLog: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'SCAN' | 'FOUND' | 'STORED' | 'ERROR' | 'COMPLETE';
  message: string;
}

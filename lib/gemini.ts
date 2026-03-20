import { LogEntry, ResearchQuery } from './types';

export interface ParsedEvent {
  title: string;
  description: string;
  location: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  event_type: string;
  url: string;
  organizer: string;
  topics: string[];
  is_online: boolean;
  price_range: string;
  source: string;
}

const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const JSON_ENVELOPE = `
Return ONLY a raw JSON object — no markdown, no code fences, no explanation:
{
  "events": [
    {
      "title": "string",
      "description": "string",
      "location": "full venue / address",
      "city": "string",
      "country": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "event_type": "conference|meetup|workshop|hackathon|webinar|summit|other",
      "url": "https://...",
      "organizer": "string",
      "topics": ["AI", "Machine Learning"],
      "is_online": false,
      "price_range": "free|paid|unknown",
      "source": "domain.com"
    }
  ]
}`;

// ── Robust JSON extractor ────────────────────────────────────────────────────
function extractEvents(text: string): ParsedEvent[] {
  // 1. Strip markdown code fences
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. Try the whole text as JSON
  for (const candidate of [stripped, text]) {
    try {
      const j = JSON.parse(candidate);
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.events)) return j.events;
    } catch { /* continue */ }
  }

  // 3. Find the first { } block that contains "events"
  const brace = stripped.indexOf('{');
  if (brace !== -1) {
    let depth = 0, end = -1;
    for (let i = brace; i < stripped.length; i++) {
      if (stripped[i] === '{') depth++;
      else if (stripped[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try {
        const j = JSON.parse(stripped.slice(brace, end + 1));
        if (Array.isArray(j?.events)) return j.events;
      } catch { /* continue */ }
    }
  }

  // 4. Find a JSON array directly
  const bracket = stripped.indexOf('[');
  if (bracket !== -1) {
    let depth = 0, end = -1;
    for (let i = bracket; i < stripped.length; i++) {
      if (stripped[i] === '[') depth++;
      else if (stripped[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try {
        const j = JSON.parse(stripped.slice(bracket, end + 1));
        if (Array.isArray(j)) return j;
      } catch { /* continue */ }
    }
  }

  return [];
}

// ── Gemini REST call with Google Search grounding ────────────────────────────
async function geminiSearch(prompt: string): Promise<ParsedEvent[]> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tools: [{ google_search: {} }],
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'text/plain',
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('') ?? '';

  return extractEvents(text);
}

// ── OpenAI Responses API with web_search_preview ─────────────────────────────
async function openaiSearch(prompt: string): Promise<ParsedEvent[]> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await (openai.responses as { create: (p: Record<string, unknown>) => Promise<{ output_text?: string }> }).create({
    model: 'gpt-4o',
    tools: [{ type: 'web_search_preview' }],
    input: prompt,
  });

  const text = response.output_text ?? '';
  return extractEvents(text);
}

// ── Deduplication ─────────────────────────────────────────────────────────────
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
}

function deduplicate(events: ParsedEvent[]): ParsedEvent[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: ParsedEvent[] = [];

  for (const e of events) {
    const urlKey = e.url ? normalizeUrl(e.url) : '';
    const titleKey = normalizeTitle(e.title || '');

    if (!e.title) continue;
    if (urlKey && seenUrls.has(urlKey)) continue;
    if (seenTitles.has(titleKey)) continue;

    if (urlKey) seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    result.push(e);
  }

  return result;
}

// ── Main research orchestrator ───────────────────────────────────────────────
export async function researchAIEvents(
  query: ResearchQuery,
  onLog: (entry: LogEntry) => void
): Promise<ParsedEvent[]> {
  const log = (level: LogEntry['level'], message: string) => {
    onLog({ timestamp: new Date().toISOString(), level, message });
  };

  const { location, radius, dateFrom, dateTo, topics } = query;
  const areaStr = radius ? `${location} (within ${radius})` : location;
  const dateStr = dateFrom && dateTo
    ? `between ${dateFrom} and ${dateTo}`
    : dateFrom ? `from ${dateFrom} onwards`
    : 'upcoming in the next 6 months';
  const topicStr = topics?.length ? `Focus on: ${topics.join(', ')}.` : '';

  log('INFO', `Orchestrating parallel research sweep for: ${areaStr}`);
  log('SCAN', 'Launching 7 concurrent search agents (5× Gemini + 2× OpenAI)...');

  // ── 5 Gemini queries (different angles) ─────────────────────────────────
  const geminiQueries = [
    `You are an event research agent. Search the web for AI and machine learning CONFERENCES and SUMMITS in ${areaStr}, ${dateStr}. ${topicStr} Find real, verifiable events on eventbrite.com, meetup.com, lu.ma, and official conference sites. ${JSON_ENVELOPE}`,

    `You are an event research agent. Search the web for AI and machine learning MEETUPS and NETWORKING EVENTS in ${areaStr}, ${dateStr}. ${topicStr} Search meetup.com, eventbrite.com, lu.ma, and local tech community sites. ${JSON_ENVELOPE}`,

    `You are an event research agent. Search the web for AI HACKATHONS, WORKSHOPS, and BOOTCAMPS in ${areaStr}, ${dateStr}. ${topicStr} Search devpost.com, eventbrite.com, and tech organization sites. ${JSON_ENVELOPE}`,

    `You are an event research agent. Search the web for specialized AI events covering LLM, NLP, Computer Vision, Generative AI, and Robotics in ${areaStr}, ${dateStr}. ${topicStr} Search academic sites, IEEE, ACM, and tech conference aggregators. ${JSON_ENVELOPE}`,

    `You are an event research agent. Search the web for AI STARTUP, ENTREPRENEURSHIP, and VENTURE events in ${areaStr}, ${dateStr}. ${topicStr} Also search for ONLINE/VIRTUAL AI events accessible to people in ${location}. Search techcrunch, venturebeat, and startup event sites. ${JSON_ENVELOPE}`,
  ];

  // ── 2 OpenAI queries (broader sweep) ────────────────────────────────────
  const openaiQueries = [
    `Search the web for ALL upcoming AI and machine learning events in ${areaStr}, ${dateStr}. ${topicStr} Search eventbrite.com, meetup.com, lu.ma, and local tech community sites. For each event return structured data as a JSON object with this exact format: ${JSON_ENVELOPE}`,

    `Search the web for AI research conferences, academic workshops, and specialized AI tech events (computer vision, NLP, robotics, autonomous systems, AI safety) in ${areaStr}, ${dateStr}. ${topicStr} Return JSON: ${JSON_ENVELOPE}`,
  ];

  // ── Run all 7 in parallel ────────────────────────────────────────────────
  const geminiLabels = ['Conferences', 'Meetups', 'Hackathons', 'Specialized', 'Startups/Virtual'];
  const openaiLabels = ['General sweep', 'Research/Academic'];

  const allPromises: Promise<{ label: string; events: ParsedEvent[]; engine: string }>[] = [
    ...geminiQueries.map((q, i) =>
      geminiSearch(q)
        .then(events => {
          log('FOUND', `Gemini [${geminiLabels[i]}]: ${events.length} events found`);
          return { label: geminiLabels[i], events, engine: 'gemini' };
        })
        .catch(err => {
          log('ERROR', `Gemini [${geminiLabels[i]}] failed: ${err.message}`);
          return { label: geminiLabels[i], events: [], engine: 'gemini' };
        })
    ),
    ...openaiQueries.map((q, i) =>
      openaiSearch(q)
        .then(events => {
          log('FOUND', `OpenAI [${openaiLabels[i]}]: ${events.length} events found`);
          return { label: openaiLabels[i], events, engine: 'openai' };
        })
        .catch(err => {
          log('ERROR', `OpenAI [${openaiLabels[i]}] failed: ${err.message}`);
          return { label: openaiLabels[i], events: [], engine: 'openai' };
        })
    ),
  ];

  const results = await Promise.all(allPromises);

  const raw = results.flatMap(r => r.events);
  log('SCAN', `Raw total across all agents: ${raw.length} events — running deduplication...`);

  const deduped = deduplicate(raw);
  log('COMPLETE', `Deduplication complete: ${raw.length} → ${deduped.length} unique events`);

  return deduped;
}

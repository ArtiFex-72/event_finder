import { GoogleGenerativeAI } from '@google/generative-ai';
import { LogEntry, ResearchQuery } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function researchAIEvents(
  query: ResearchQuery,
  onLog: (entry: LogEntry) => void
): Promise<ParsedEvent[]> {
  const log = (level: LogEntry['level'], message: string) => {
    onLog({ timestamp: new Date().toISOString(), level, message });
  };

  log('INFO', `Initializing research engine for area: ${query.location}`);
  log('SCAN', `Configuring Gemini with Google Search grounding...`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearch: {} } as never],
  });

  const dateRange = query.dateFrom && query.dateTo
    ? `between ${query.dateFrom} and ${query.dateTo}`
    : query.dateFrom
    ? `from ${query.dateFrom} onwards`
    : 'upcoming (next 6 months)';

  const topicsStr = query.topics?.length
    ? `with focus on: ${query.topics.join(', ')}`
    : 'covering all AI topics';

  const prompt = `You are an AI event intelligence analyst. Search the web comprehensively for AI-related events in ${query.location}${query.radius ? ` within ${query.radius}` : ''}, ${dateRange}, ${topicsStr}.

Search for:
1. AI/ML conferences and summits
2. Machine learning workshops and hackathons
3. AI meetups and networking events
4. Data science and deep learning events
5. LLM, NLP, Computer Vision events
6. Robotics and AI research symposiums
7. Startup events focused on AI
8. Online/virtual AI events accessible to ${query.location} residents

For each event found, extract ALL available details. Return a valid JSON array with this exact structure:
{
  "events": [
    {
      "title": "Event title",
      "description": "Full description",
      "location": "Full address or venue",
      "city": "City name",
      "country": "Country",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "event_type": "conference|meetup|workshop|hackathon|webinar|summit|other",
      "url": "https://...",
      "organizer": "Organization name",
      "topics": ["AI", "Machine Learning", "NLP"],
      "is_online": false,
      "price_range": "free|paid|unknown",
      "source": "website where found"
    }
  ],
  "search_queries_used": ["query1", "query2"],
  "sources_checked": ["site1", "site2"]
}

Return ONLY the JSON. No markdown, no explanation. Find as many real, verifiable events as possible.`;

  log('SCAN', `Executing web search for AI events in ${query.location}...`);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    log('SCAN', `Processing search results from Gemini...`);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('ERROR', 'Failed to parse structured data from research response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const events: ParsedEvent[] = parsed.events || [];

    log('FOUND', `Discovered ${events.length} AI events in research sweep`);

    if (parsed.search_queries_used) {
      for (const q of parsed.search_queries_used.slice(0, 3)) {
        log('SCAN', `Query executed: "${q}"`);
      }
    }

    if (parsed.sources_checked) {
      for (const s of parsed.sources_checked.slice(0, 5)) {
        log('INFO', `Source analyzed: ${s}`);
      }
    }

    return events;
  } catch (error) {
    log('ERROR', `Research engine error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // Fallback to OpenAI if Gemini fails
    log('INFO', 'Switching to OpenAI fallback research engine...');
    return await researchWithOpenAI(query, onLog);
  }
}

async function researchWithOpenAI(
  query: ResearchQuery,
  onLog: (entry: LogEntry) => void
): Promise<ParsedEvent[]> {
  const log = (level: LogEntry['level'], message: string) => {
    onLog({ timestamp: new Date().toISOString(), level, message });
  };

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    log('SCAN', 'OpenAI research engine activated...');

    const dateRange = query.dateFrom && query.dateTo
      ? `between ${query.dateFrom} and ${query.dateTo}`
      : 'in the next 6 months';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an AI event intelligence analyst. Based on your knowledge, provide information about AI events. Always return valid JSON.',
        },
        {
          role: 'user',
          content: `List AI-related events in ${query.location} ${dateRange}. Return JSON array: {"events": [{title, description, location, city, country, start_date (YYYY-MM-DD), end_date, event_type, url, organizer, topics[], is_online, price_range, source}], "search_queries_used": [], "sources_checked": []}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{"events":[]}');
    const events: ParsedEvent[] = parsed.events || [];
    log('FOUND', `OpenAI fallback found ${events.length} events`);
    return events;
  } catch (err) {
    log('ERROR', `OpenAI fallback failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    return [];
  }
}

import { NextRequest } from 'next/server';
import { researchAIEvents } from '@/lib/gemini';
import { initDB, saveEvents } from '@/lib/db';
import { LogEntry, ResearchQuery } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const query: ResearchQuery = await req.json();

  if (!query.location) {
    return new Response(JSON.stringify({ error: 'Location is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: object) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await initDB();

      const logs: LogEntry[] = [];

      const events = await researchAIEvents(query, async (entry) => {
        logs.push(entry);
        await send({ type: 'log', entry });
      });

      await send({ type: 'log', entry: { timestamp: new Date().toISOString(), level: 'STORED', message: `Persisting ${events.length} events to intelligence database...` } });

      const eventsWithArea = events.map(e => ({ ...e, search_area: query.location }));
      const saved = await saveEvents(eventsWithArea);

      await send({
        type: 'complete',
        events: saved,
        totalFound: events.length,
        totalSaved: saved.length,
      });
    } catch (error) {
      await send({
        type: 'error',
        message: error instanceof Error ? error.message : 'Research failed',
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

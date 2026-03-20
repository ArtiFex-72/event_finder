import { neon } from '@neondatabase/serverless';

function getSQL() {
  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS ai_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      city TEXT,
      country TEXT,
      start_date TEXT,
      end_date TEXT,
      event_type TEXT,
      url TEXT,
      organizer TEXT,
      topics TEXT[],
      is_online BOOLEAN DEFAULT false,
      price_range TEXT,
      source TEXT,
      search_area TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function saveEvents(events: {
  title: string;
  description?: string;
  location?: string;
  city?: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  event_type?: string;
  url?: string;
  organizer?: string;
  topics?: string[];
  is_online?: boolean;
  price_range?: string;
  source?: string;
  search_area?: string;
}[]) {
  const sql = getSQL();
  const saved = [];
  for (const event of events) {
    const result = await sql`
      INSERT INTO ai_events (
        title, description, location, city, country,
        start_date, end_date, event_type, url, organizer,
        topics, is_online, price_range, source, search_area
      ) VALUES (
        ${event.title},
        ${event.description ?? null},
        ${event.location ?? null},
        ${event.city ?? null},
        ${event.country ?? null},
        ${event.start_date ?? null},
        ${event.end_date ?? null},
        ${event.event_type ?? null},
        ${event.url ?? null},
        ${event.organizer ?? null},
        ${event.topics ?? []},
        ${event.is_online ?? false},
        ${event.price_range ?? null},
        ${event.source ?? null},
        ${event.search_area ?? null}
      )
      RETURNING *
    `;
    if (result[0]) saved.push(result[0]);
  }
  return saved;
}

export async function getEvents(searchArea?: string, limit = 200) {
  const sql = getSQL();
  if (searchArea) {
    return sql`
      SELECT * FROM ai_events
      WHERE search_area ILIKE ${'%' + searchArea + '%'}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }
  return sql`
    SELECT * FROM ai_events
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function deleteEvent(id: string) {
  const sql = getSQL();
  return sql`DELETE FROM ai_events WHERE id = ${id}`;
}

export async function clearEvents(searchArea?: string) {
  const sql = getSQL();
  if (searchArea) {
    return sql`DELETE FROM ai_events WHERE search_area ILIKE ${'%' + searchArea + '%'}`;
  }
  return sql`DELETE FROM ai_events`;
}

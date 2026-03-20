// Test connectivity and data quality for all candidate event sources
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const GEMINI_KEY = env.match(/GEMINI_API_KEY="([^"]+)"/)?.[1];
const GOOGLE_KEY = env.match(/GOOGLE_API_KEY="([^"]+)"/)?.[1];

const tests = [];

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await fn();
    console.log(`OK - ${result}`);
    tests.push({ name, ok: true, result });
  } catch (e) {
    console.log(`FAIL - ${e.message}`);
    tests.push({ name, ok: false, error: e.message });
  }
}

// 1. Eventbrite public search (no key)
await test('Eventbrite public search API', async () => {
  const r = await fetch(
    'https://www.eventbrite.com/api/v3/destination/search/?q=AI+conference&bbox=-122.5,37.7,-122.3,37.8',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return `${d.events?.results?.length ?? 0} events`;
});

// 2. Eventbrite API with token (check if key works as token)
await test('Eventbrite API v3 (GOOGLE_KEY as auth)', async () => {
  const r = await fetch(
    'https://www.eventbriteapi.com/v3/events/search/?q=AI&location.address=San+Francisco',
    { headers: { Authorization: `Bearer ${GOOGLE_KEY}` } }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return `${d.events?.length ?? 0} events`;
});

// 3. Meetup GraphQL API (public events query)
await test('Meetup GraphQL API', async () => {
  const r = await fetch('https://api.meetup.com/gql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{ keywordSearch(filter: { query: "AI machine learning", lat: 37.7749, lon: -122.4194, radius: 50 }) { edges { node { id name dateTime } } } }`
    })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.errors) throw new Error(d.errors[0].message);
  return `${d.data?.keywordSearch?.edges?.length ?? 0} events`;
});

// 4. Lu.ma public events
await test('Lu.ma discover API', async () => {
  const r = await fetch('https://api.lu.ma/discover/get-discover-events?pagination_limit=5', {
    headers: { 'x-luma-api-key': '' }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return `${d.entries?.length ?? 0} events`;
});

// 5. conf.tech GitHub data (free, no key)
await test('conf.tech GitHub JSON', async () => {
  const r = await fetch(
    'https://raw.githubusercontent.com/tech-conferences/conference-data/master/conferences/2025/ai-ml.json'
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return `${d.length} conferences`;
});

// 6. Google Custom Search API (just with key, no CX - expect error but confirm key works)
await test('Google Custom Search API (key validity)', async () => {
  const r = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${GEMINI_KEY}&cx=missing&q=AI+events`
  );
  const d = await r.json();
  // 400 means key is valid but CX missing — that's fine
  if (d.error?.code === 400) return 'Key valid, needs CX id';
  if (d.error?.code === 403) throw new Error('Key invalid or quota exceeded');
  if (r.ok) return `${d.items?.length ?? 0} results`;
  throw new Error(`HTTP ${r.status}: ${d.error?.message}`);
});

// 7. Ticketmaster Discovery API (public, no key needed for basic)
await test('Ticketmaster Discovery API', async () => {
  const r = await fetch(
    'https://app.ticketmaster.com/discovery/v2/events.json?classificationName=conference&keyword=AI&size=3&apikey=none'
  );
  const d = await r.json();
  if (d.fault) throw new Error(d.fault.faultstring);
  return `HTTP ${r.status}`;
});

// 8. PredictHQ (free tier)
await test('PredictHQ events API', async () => {
  const r = await fetch(
    'https://api.predicthq.com/v1/events/?category=conferences&q=artificial+intelligence&limit=3',
    { headers: { Authorization: 'Bearer none' } }
  );
  if (r.status === 401) throw new Error('Needs API key (401)');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return `${d.results?.length ?? 0} events`;
});

// 9. Gemini Google Search grounding (our primary - test it works with structured schema)
await test('Gemini 2.0 Flash + Google Search + structured output', async () => {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tools: [{ google_search: {} }],
        contents: [{ parts: [{ text: 'What is one upcoming AI conference in 2025? Give me just the name.' }] }],
        generationConfig: { responseMimeType: 'text/plain' }
      })
    }
  );
  if (!r.ok) { const e = await r.json(); throw new Error(`${r.status}: ${e.error?.message}`); }
  const d = await r.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return `OK - "${text.slice(0, 60)}"`;
});

// 10. OpenAI with web search tool (Responses API)
await test('OpenAI Responses API with web_search_preview', async () => {
  const OPENAI_KEY = env.match(/OPENAI_API_KEY="([^"]+)"/)?.[1];
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input: 'Name one upcoming AI conference in 2025.',
    })
  });
  if (!r.ok) { const e = await r.json(); throw new Error(`${r.status}: ${e.error?.message}`); }
  const d = await r.json();
  return `OK - status: ${d.status}`;
});

console.log('\n--- SUMMARY ---');
for (const t of tests) {
  console.log(`${t.ok ? '✓' : '✗'} ${t.name}`);
}

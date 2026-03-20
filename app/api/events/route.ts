import { NextRequest, NextResponse } from 'next/server';
import { initDB, getEvents, clearEvents } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await initDB();
    const { searchParams } = new URL(req.url);
    const area = searchParams.get('area') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200');
    const events = await getEvents(area, limit);
    return NextResponse.json({ events, total: events.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const area = searchParams.get('area') || undefined;
    await clearEvents(area);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear events' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Optionally filter by sessionId
  const { searchParams } = new URL(req.url!);
  const sessionId = searchParams.get('sessionId');
  const where = sessionId ? { sessionId } : {};
  const notes = await prisma.sessionNote.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Required: sessionId, content
  if (!data.sessionId || !data.content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const note = await prisma.sessionNote.create({
    data: {
      sessionId: data.sessionId,
      content: data.content,
      isQuickNote: data.isQuickNote ?? false,
      category: data.category ?? null,
    },
  });
  return NextResponse.json(note);
}

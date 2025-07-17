import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const sessions = await prisma.coachingSession.findMany({
    include: { teamLeader: true, agent: true, notes: true, evaluations: true, goals: true, actionItems: true, agentResponse: true }
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const session = await prisma.coachingSession.create({ data });
  return NextResponse.json(session);
}

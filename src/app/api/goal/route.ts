import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const where = sessionId ? { sessionId } : {};
  const goals = await prisma.goal.findMany({ where, include: { session: true } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  
  // Get current user from session or set default
  let createdById = data.createdById;
  let assignedToId = data.assignedToId;
  
  // If no user IDs provided, get first available user
  if (!createdById || !assignedToId) {
    const users = await prisma.user.findMany({ take: 2 });
    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found in system' }, { status: 400 });
    }
    createdById = createdById || users[0].id;
    assignedToId = assignedToId || users[0].id;
  }
  
  // Ensure required fields are present
  const goalData = {
    title: data.title,
    description: data.description || '',
    category: data.category || 'general',
    targetValue: data.targetValue ? String(data.targetValue) : null,
    currentValue: data.currentValue ? String(data.currentValue) : null,
    status: data.status || 'ACTIVE',
    targetDate: data.targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdById,
    assignedToId,
    sessionId: data.sessionId || null
  };
  
  const goal = await prisma.goal.create({ data: goalData });
  return NextResponse.json(goal);
}

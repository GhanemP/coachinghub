import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ActionItemStatus, ActionItemPriority } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const items = await prisma.actionItem.findMany({
    include: { session: true, createdBy: true, assignedTo: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Required: title, createdById, assignedToId. Optional: sessionId, description, dueDate, priority, status
  if (!data.title || !data.createdById || !data.assignedToId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const item = await prisma.actionItem.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? ActionItemStatus.PENDING,
      priority: data.priority ?? ActionItemPriority.MEDIUM,
      dueDate: data.dueDate ?? null,
      sessionId: data.sessionId ?? null,
      createdById: data.createdById,
      assignedToId: data.assignedToId,
    },
  });
  return NextResponse.json(item);
}

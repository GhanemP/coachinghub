import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ActionItemStatus, ActionItemPriority } from '@prisma/client';

const prisma = new PrismaClient();


export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const item = await prisma.actionItem.findUnique({
    where: { id: resolvedParams.id },
    include: { session: true, createdBy: true, assignedTo: true },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}


export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  // Only allow updating certain fields
  const updateData: Partial<{
    title: string;
    description: string;
    status: ActionItemStatus;
    priority: ActionItemPriority;
    dueDate: Date;
    completedDate: Date;
    sessionId: string;
    assignedToId: string;
  }> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.completedDate !== undefined) updateData.completedDate = data.completedDate;
  if (data.sessionId !== undefined) updateData.sessionId = data.sessionId;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  const item = await prisma.actionItem.update({ where: { id: resolvedParams.id }, data: updateData });
  return NextResponse.json(item);
}


export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.actionItem.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

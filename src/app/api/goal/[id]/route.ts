import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const goal = await prisma.goal.findUnique({ where: { id: resolvedParams.id }, include: { session: true } });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  const goal = await prisma.goal.update({ where: { id: resolvedParams.id }, data });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.goal.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

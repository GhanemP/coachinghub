import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const evaluation = await prisma.evaluation.findUnique({ where: { id: resolvedParams.id }, include: { session: true } });
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(evaluation);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  const evaluation = await prisma.evaluation.update({ where: { id: resolvedParams.id }, data });
  return NextResponse.json(evaluation);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.evaluation.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

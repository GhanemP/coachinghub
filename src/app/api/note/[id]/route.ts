import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const note = await prisma.sessionNote.findUnique({ where: { id: resolvedParams.id }, include: { session: true } });
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  const note = await prisma.sessionNote.update({ where: { id: resolvedParams.id }, data });
  return NextResponse.json(note);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.sessionNote.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

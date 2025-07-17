import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const user = await prisma.user.findUnique({ where: { id: resolvedParams.id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  const user = await prisma.user.update({ where: { id: resolvedParams.id }, data });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.user.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

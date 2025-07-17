import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const notes = await prisma.sessionNote.findMany({ include: { session: true } });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const note = await prisma.sessionNote.create({ data });
  return NextResponse.json(note);
}

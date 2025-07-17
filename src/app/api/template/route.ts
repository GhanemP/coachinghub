import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const templates = await prisma.template.findMany({ include: { createdBy: true } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const template = await prisma.template.create({ data });
  return NextResponse.json(template);
}

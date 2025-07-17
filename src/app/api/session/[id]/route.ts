import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const session = await prisma.coachingSession.findUnique({
    where: { id: resolvedParams.id },
    include: { teamLeader: true, agent: true, notes: true, evaluations: true, goals: true, actionItems: true, agentResponse: true }
  });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(session);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  const data = await req.json();
  const updateData = { ...data };
  // Remove non-Prisma fields
  delete updateData.complete;
  // Always set status to COMPLETED if requested
  if (data.complete === true || data.status === "COMPLETED") {
    updateData.status = "COMPLETED";
    updateData.actualDate = new Date().toISOString();
  }
  // Defensive: If status is not set, keep previous status
  if (!updateData.status) {
    const existing = await prisma.coachingSession.findUnique({ where: { id: resolvedParams.id } });
    if (existing) updateData.status = existing.status;
  }
  // Debug logging
  console.log("PUT /api/session/[id]", { id: resolvedParams.id, updateData });
  try {
    const session = await prisma.coachingSession.update({ where: { id: resolvedParams.id }, data: updateData });
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error updating session", error);
    return NextResponse.json({ error: "Failed to update session", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = await params;
  await prisma.coachingSession.delete({ where: { id: resolvedParams.id } });
  return NextResponse.json({ success: true });
}

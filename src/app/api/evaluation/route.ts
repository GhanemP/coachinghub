import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const evaluations = await prisma.evaluation.findMany({ include: { session: true } });
  return NextResponse.json(evaluations);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  
  // Handle legacy evaluation creation (without criteriaId)
  if (data.criteria && !data.criteriaId) {
    // First, try to find existing criteria
    let criteriaRecord = await prisma.evaluationCriteria.findFirst({
      where: { name: data.criteria }
    });
    
    // If not found, create it
    if (!criteriaRecord) {
      criteriaRecord = await prisma.evaluationCriteria.create({
        data: {
          name: data.criteria,
          category: 'general',
          weight: 1.0,
          description: `Auto-created criteria for ${data.criteria}`
        }
      });
    }
    
    // Create evaluation with criteriaId using upsert to handle duplicates
    const evaluation = await prisma.evaluation.upsert({
      where: {
        sessionId_criteriaId: {
          sessionId: data.sessionId,
          criteriaId: criteriaRecord.id
        }
      },
      update: {
        score: data.score,
        trend: data.trend || 'STABLE',
        notes: data.comments || data.notes
      },
      create: {
        sessionId: data.sessionId,
        criteriaId: criteriaRecord.id,
        score: data.score,
        trend: data.trend || 'STABLE',
        notes: data.comments || data.notes
      }
    });
    
    return NextResponse.json(evaluation);
  } else {
    // Standard evaluation creation
    const evaluation = await prisma.evaluation.create({ data });
    return NextResponse.json(evaluation);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, KPIMetric } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has permission to view metrics
    if (session.user?.role !== 'TEAM_LEADER' && 
        session.user?.role !== 'MANAGER' && 
        session.user?.role !== 'ADMIN' &&
        session.user?.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the most recent period (current month)
    const now = new Date();
    const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all metrics for the user in the current period
    const metrics = await prisma.kPIMetric.findMany({
      where: {
        userId: userId,
        period: {
          gte: currentPeriod
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // If no metrics found for current period, get the most recent metrics
    let fallbackMetrics: KPIMetric[] = [];
    if (metrics.length === 0) {
      fallbackMetrics = await prisma.kPIMetric.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          period: 'desc'
        },
        take: 4
      });
    }

    const finalMetrics = metrics.length > 0 ? metrics : fallbackMetrics;

    // Transform metrics into a more usable format
    const metricsMap = finalMetrics.reduce((acc, metric) => {
      acc[metric.metricName] = {
        value: metric.value,
        unit: metric.unit,
        period: metric.period
      };
      return acc;
    }, {} as Record<string, { value: number; unit: string | null; period: Date }>);

    // Calculate overall performance score based on available metrics
    let overallScore = 0;
    let scoreCount = 0;

    // CSAT Score (weight: 25%)
    if (metricsMap['CSAT']) {
      overallScore += (metricsMap['CSAT'].value / 5) * 25;
      scoreCount++;
    }

    // First Call Resolution (weight: 25%)
    if (metricsMap['FCR']) {
      overallScore += (metricsMap['FCR'].value / 100) * 25;
      scoreCount++;
    }

    // Quality Score (weight: 30%)
    if (metricsMap['Quality Score']) {
      overallScore += (metricsMap['Quality Score'].value / 100) * 30;
      scoreCount++;
    }

    // Average Handle Time (weight: 20%, inverted - lower is better)
    if (metricsMap['AHT']) {
      // Assuming 5 minutes is optimal, 10+ minutes is poor
      const ahtScore = Math.max(0, Math.min(100, (600 - metricsMap['AHT'].value) / 600 * 100));
      overallScore += (ahtScore / 100) * 20;
      scoreCount++;
    }

    // Normalize the overall score
    const finalOverallScore = scoreCount > 0 ? Math.round(overallScore) : 0;

    return NextResponse.json({
      metrics: metricsMap,
      overallScore: finalOverallScore,
      period: currentPeriod
    });

  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can create/update metrics
    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, metricName, value, unit, period } = body;

    if (!userId || !metricName || value === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, metricName, value' 
      }, { status: 400 });
    }

    const metric = await prisma.kPIMetric.upsert({
      where: {
        userId_metricName_period: {
          userId,
          metricName,
          period: new Date(period || new Date())
        }
      },
      update: {
        value,
        unit
      },
      create: {
        userId,
        metricName,
        value,
        unit,
        period: new Date(period || new Date())
      }
    });

    return NextResponse.json(metric);

  } catch (error) {
    console.error('Error creating/updating metric:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleMetrics() {
  try {
    // Get all agents
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' }
    });

    if (agents.length === 0) {
      console.log('No agents found. Please create some agents first.');
      return;
    }

    const now = new Date();
    const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const agent of agents) {
      console.log(`Creating metrics for agent: ${agent.firstName} ${agent.lastName}`);

      // Generate realistic sample data
      const csatScore = Math.random() * 1.5 + 3.5; // 3.5 to 5.0
      const fcrRate = Math.random() * 30 + 70; // 70% to 100%
      const ahtSeconds = Math.random() * 180 + 240; // 4 to 7 minutes
      const qualityScore = Math.random() * 20 + 80; // 80% to 100%

      // Create CSAT metric
      await prisma.kPIMetric.upsert({
        where: {
          userId_metricName_period: {
            userId: agent.id,
            metricName: 'CSAT',
            period: currentPeriod
          }
        },
        update: {
          value: parseFloat(csatScore.toFixed(1)),
          unit: 'score'
        },
        create: {
          userId: agent.id,
          metricName: 'CSAT',
          value: parseFloat(csatScore.toFixed(1)),
          unit: 'score',
          period: currentPeriod
        }
      });

      // Create FCR metric
      await prisma.kPIMetric.upsert({
        where: {
          userId_metricName_period: {
            userId: agent.id,
            metricName: 'FCR',
            period: currentPeriod
          }
        },
        update: {
          value: parseFloat(fcrRate.toFixed(1)),
          unit: 'percentage'
        },
        create: {
          userId: agent.id,
          metricName: 'FCR',
          value: parseFloat(fcrRate.toFixed(1)),
          unit: 'percentage',
          period: currentPeriod
        }
      });

      // Create AHT metric
      await prisma.kPIMetric.upsert({
        where: {
          userId_metricName_period: {
            userId: agent.id,
            metricName: 'AHT',
            period: currentPeriod
          }
        },
        update: {
          value: parseFloat(ahtSeconds.toFixed(0)),
          unit: 'seconds'
        },
        create: {
          userId: agent.id,
          metricName: 'AHT',
          value: parseFloat(ahtSeconds.toFixed(0)),
          unit: 'seconds',
          period: currentPeriod
        }
      });

      // Create Quality Score metric
      await prisma.kPIMetric.upsert({
        where: {
          userId_metricName_period: {
            userId: agent.id,
            metricName: 'Quality Score',
            period: currentPeriod
          }
        },
        update: {
          value: parseFloat(qualityScore.toFixed(1)),
          unit: 'percentage'
        },
        create: {
          userId: agent.id,
          metricName: 'Quality Score',
          value: parseFloat(qualityScore.toFixed(1)),
          unit: 'percentage',
          period: currentPeriod
        }
      });

      console.log(`✓ Created metrics for ${agent.firstName} ${agent.lastName}`);
      console.log(`  CSAT: ${csatScore.toFixed(1)}, FCR: ${fcrRate.toFixed(1)}%, AHT: ${Math.floor(ahtSeconds/60)}:${Math.floor(ahtSeconds%60).toString().padStart(2,'0')}, Quality: ${qualityScore.toFixed(1)}%`);
    }

    console.log('\n✅ Sample metrics created successfully!');
  } catch (error) {
    console.error('Error creating sample metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleMetrics();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create users first
  const teamLeader = await prisma.user.upsert({
    where: { email: 'sarah.johnson@company.com' },
    update: {},
    create: {
      email: 'sarah.johnson@company.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'TEAM_LEADER',
      department: 'Customer Service',
      tenure: new Date('2020-01-15'),
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'michael.chen@company.com' },
    update: {},
    create: {
      email: 'michael.chen@company.com',
      firstName: 'Michael',
      lastName: 'Chen',
      role: 'AGENT',
      department: 'Customer Service',
      tenure: new Date('2023-05-01'),
    },
  });

  console.log('👥 Created users:', { teamLeader: teamLeader.id, agent: agent.id });

  // Create some previous sessions
  const session1 = await prisma.coachingSession.create({
    data: {
      sessionNumber: 1,
      type: 'PERFORMANCE_REVIEW',
      status: 'COMPLETED',
      scheduledDate: new Date('2024-02-05'),
      actualDate: new Date('2024-02-05'),
      duration: 45,
      teamLeaderId: teamLeader.id,
      agentId: agent.id,
      overallScore: 3.2,
      callsReviewed: 5,
      callTypes: ['SUPPORT', 'BILLING'],
    },
  });

  const session2 = await prisma.coachingSession.create({
    data: {
      sessionNumber: 2,
      type: 'FOLLOW_UP',
      status: 'COMPLETED',
      scheduledDate: new Date('2024-02-20'),
      actualDate: new Date('2024-02-20'),
      duration: 30,
      teamLeaderId: teamLeader.id,
      agentId: agent.id,
      overallScore: 3.0,
      callsReviewed: 3,
      callTypes: ['COMPLAINT', 'SUPPORT'],
    },
  });

  const session3 = await prisma.coachingSession.create({
    data: {
      sessionNumber: 3,
      type: 'PERFORMANCE_REVIEW',
      status: 'COMPLETED',
      scheduledDate: new Date('2024-03-05'),
      actualDate: new Date('2024-03-05'),
      duration: 32,
      teamLeaderId: teamLeader.id,
      agentId: agent.id,
      overallScore: 4.2,
      callsReviewed: 8,
      callTypes: ['SUPPORT', 'BILLING', 'SALES'],
    },
  });

  console.log('📋 Created sessions:', [session1.id, session2.id, session3.id]);

  // Create some goals
  const goal1 = await prisma.goal.create({
    data: {
      title: 'Improve First Call Resolution',
      description: 'Target: Achieve 85% FCR by end of quarter',
      category: 'metrics',
      targetValue: '85%',
      currentValue: '78%',
      status: 'ACTIVE',
      targetDate: new Date('2024-12-31'),
      sessionId: session3.id,
      createdById: teamLeader.id,
      assignedToId: agent.id,
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      title: 'Reduce Average Handle Time',
      description: 'Target: Reduce AHT to under 6 minutes',
      category: 'metrics',
      targetValue: '6 minutes',
      currentValue: '6.75 minutes',
      status: 'ACTIVE',
      targetDate: new Date('2024-12-31'),
      sessionId: session2.id,
      createdById: teamLeader.id,
      assignedToId: agent.id,
    },
  });

  console.log('🎯 Created goals:', [goal1.id, goal2.id]);

  // Create some action items
  const actionItem1 = await prisma.actionItem.create({
    data: {
      title: 'Complete empathy training',
      description: 'Enroll in advanced customer empathy course',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date('2024-01-20'),
      sessionId: session2.id,
      createdById: teamLeader.id,
      assignedToId: agent.id,
    },
  });

  const actionItem2 = await prisma.actionItem.create({
    data: {
      title: 'Shadow senior agent',
      description: '2 hours with Alex Thompson on complex calls',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: new Date('2024-01-25'),
      sessionId: session1.id,
      createdById: teamLeader.id,
      assignedToId: agent.id,
    },
  });

  const actionItem3 = await prisma.actionItem.create({
    data: {
      title: 'Product knowledge quiz',
      description: 'Complete comprehensive product knowledge assessment',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueDate: new Date('2024-01-10'),
      completedDate: new Date('2024-01-10'),
      sessionId: session1.id,
      createdById: teamLeader.id,
      assignedToId: agent.id,
    },
  });

  console.log('✅ Created action items:', [actionItem1.id, actionItem2.id, actionItem3.id]);

  // Create evaluation criteria first
  const criteria1 = await prisma.evaluationCriteria.create({
    data: {
      name: 'Communication Skills',
      category: 'communication',
      weight: 20.0,
      description: 'Clarity, tone, and effectiveness in verbal communication',
    },
  });

  const criteria2 = await prisma.evaluationCriteria.create({
    data: {
      name: 'Technical Knowledge',
      category: 'technical',
      weight: 25.0,
      description: 'Understanding of products, systems, and procedures',
    },
  });

  const criteria3 = await prisma.evaluationCriteria.create({
    data: {
      name: 'Problem Solving',
      category: 'customer_service',
      weight: 20.0,
      description: 'Ability to identify and resolve customer issues',
    },
  });

  const criteria4 = await prisma.evaluationCriteria.create({
    data: {
      name: 'Customer Focus',
      category: 'customer_service',
      weight: 15.0,
      description: 'Empathy and responsiveness to customer needs',
    },
  });

  const criteria5 = await prisma.evaluationCriteria.create({
    data: {
      name: 'Process Compliance',
      category: 'process',
      weight: 20.0,
      description: 'Adherence to company policies and procedures',
    },
  });

  console.log('📊 Created evaluation criteria');

  // Create some evaluations
  const evaluationData = [
    { criteriaId: criteria1.id, score: 4 },
    { criteriaId: criteria2.id, score: 3 },
    { criteriaId: criteria3.id, score: 4 },
    { criteriaId: criteria4.id, score: 3 },
    { criteriaId: criteria5.id, score: 5 },
  ];

  for (const evaluation of evaluationData) {
    await prisma.evaluation.create({
      data: {
        sessionId: session3.id,
        criteriaId: evaluation.criteriaId,
        score: evaluation.score,
        trend: 'IMPROVING',
      },
    });
  }

  console.log('⭐ Created evaluations for session 3');

  // Create some session notes
  await prisma.sessionNote.create({
    data: {
      sessionId: session3.id,
      content: 'Michael showed excellent improvement in call handling efficiency. His confidence has grown significantly.',
      isQuickNote: false,
      category: 'SESSION_SUMMARY',
    },
  });

  await prisma.sessionNote.create({
    data: {
      sessionId: session3.id,
      content: 'Great active listening during customer interaction',
      isQuickNote: true,
      category: 'COACHING_NOTE',
    },
  });

  console.log('📝 Created session notes');

  console.log('✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessibleSessions, prisma } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user from database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get sessions accessible to the current user based on their role
    const sessions = await getAccessibleSessions(currentUser.id, currentUser.role);
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user from database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await req.json();
    
    // Add the current user as the creator
    const sessionData = {
      ...data,
      teamLeaderId: currentUser.role === 'TEAM_LEADER' ? currentUser.id : data.teamLeaderId,
      createdAt: new Date()
    };
    
    const coachingSession = await prisma.coachingSession.create({ 
      data: sessionData,
      include: { 
        teamLeader: true, 
        agent: true, 
        notes: true, 
        evaluations: true, 
        goals: true, 
        actionItems: true, 
        agentResponse: true 
      }
    });
    
    return NextResponse.json(coachingSession);
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

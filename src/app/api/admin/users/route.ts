import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFilteredUsers, prisma } from '@/lib/rbac';

export async function GET() {
  try {
    console.log('Users API called - checking session...');
    const session = await getServerSession(authOptions);
    console.log('Session in users API:', session?.user);
    
    if (!session?.user?.email) {
      console.log('No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user from database
    console.log('Looking up user in database:', session.user.email);
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      console.log('User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('Current user found:', currentUser.id, currentUser.role);
    
    // Check if user has admin or manager role
    if (!['ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(currentUser.role)) {
      console.log('User role not authorized:', currentUser.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('Getting filtered users...');
    // Get accessible users based on role and hierarchy
    const accessibleUsers = await getFilteredUsers(currentUser.id, currentUser.role);
    console.log('Found accessible users:', accessibleUsers.length);

    return NextResponse.json(accessibleUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

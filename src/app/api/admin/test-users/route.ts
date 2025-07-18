import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('Test Users API called');
    
    // For debugging: temporarily bypass session check
    // TODO: Fix session handling in production
    
    // const session = await getServerSession(authOptions);
    // console.log('Session:', session);
    
    // if (!session?.user?.email) {
    //   console.log('No session found');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Fetching all users for testing...');

    // For testing, just return all users
    const allUsers = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    });

    console.log('Found users:', allUsers.length);

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error in test users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

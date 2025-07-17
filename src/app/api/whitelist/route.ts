import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to view whitelisted emails
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whitelistedEmails = await prisma.whitelistedEmail.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(whitelistedEmails);
  } catch (error) {
    console.error('Error fetching whitelisted emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to add whitelisted emails
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    const { email, domain, notes } = data;

    if (!email && !domain) {
      return NextResponse.json({ error: 'Either email or domain is required' }, { status: 400 });
    }

    const whitelistedEmail = await prisma.whitelistedEmail.create({
      data: {
        email: email || '',
        domain,
        notes,
        addedById: user.id
      }
    });

    return NextResponse.json(whitelistedEmail);
  } catch (error: unknown) {
    console.error('Error creating whitelisted email:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already whitelisted' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

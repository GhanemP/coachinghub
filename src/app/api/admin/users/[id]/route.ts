import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can modify users
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { params } = context;
    const resolvedParams = await params;
    const data = await req.json();

    // Only ADMIN can promote to ADMIN role
    if (data.role === 'ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create other admins' }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        role: data.role,
        isActive: data.isActive,
        department: data.department,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 });
    }

    const { params } = context;
    const resolvedParams = await params;

    // Prevent deleting yourself
    if (resolvedParams.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Check for existing relationships before deletion
    const userRelationships = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        ledSessions: true,
        receivedSessions: true,
        createdActions: true,
        assignedActions: true,
        templates: true,
      }
    });

    if (!userRelationships) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has active relationships, mark as inactive instead of deleting
    const hasActiveRelationships = 
      userRelationships.ledSessions.length > 0 ||
      userRelationships.receivedSessions.length > 0 ||
      userRelationships.createdActions.length > 0 ||
      userRelationships.assignedActions.length > 0 ||
      userRelationships.templates.length > 0;

    if (hasActiveRelationships) {
      // Instead of deleting, mark user as inactive
      const updatedUser = await prisma.user.update({
        where: { id: resolvedParams.id },
        data: { 
          isActive: false,
          email: `deleted_${Date.now()}_${userRelationships.email}` // Prevent email conflicts
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'User deactivated due to existing relationships',
        user: updatedUser 
      });
    } else {
      // Safe to delete if no relationships exist
      await prisma.user.delete({
        where: { id: resolvedParams.id },
      });
      
      return NextResponse.json({ success: true, message: 'User deleted' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canModifyUser, canAccessUser, prisma } from '@/lib/rbac';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { params } = context;
    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;

    // Check if current user can modify this user
    const canModify = await canModifyUser(currentUser.id, currentUser.role, targetUserId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify this user' }, { status: 403 });
    }

    const data = await req.json();

    // Only ADMIN can promote to ADMIN role
    if (data.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create other admins' }, { status: 403 });
    }

    // Managers cannot promote users to their own level or higher
    if (currentUser.role === 'MANAGER' && ['MANAGER', 'ADMIN'].includes(data.role)) {
      return NextResponse.json({ error: 'Managers cannot promote users to manager or admin level' }, { status: 403 });
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    
    if (data.role !== undefined) {
      updateData.role = data.role;
      
      // Handle hierarchy assignment based on role changes (only if no explicit managerId provided)
      if (data.managerId === undefined) {
        if (data.role === 'TEAM_LEADER' && currentUser.role === 'MANAGER') {
          updateData.managerId = currentUser.id;
        } else if (data.role === 'AGENT' && currentUser.role === 'TEAM_LEADER') {
          updateData.managerId = currentUser.id;
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { params } = context;
    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;

    // Only ADMIN can delete users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Check if current user can access this user
    const canAccess = await canAccessUser(currentUser.id, currentUser.role, targetUserId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden: Cannot access this user' }, { status: 403 });
    }

    // Check for existing relationships before deletion
    const userRelationships = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        ledSessions: true,
        receivedSessions: true,
        createdActions: true,
        assignedActions: true,
        templates: true,
        subordinates: true,
      }
    });

    if (!userRelationships) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has subordinates, reassign them to current user or remove manager
    if (userRelationships.subordinates.length > 0) {
      await prisma.user.updateMany({
        where: { managerId: targetUserId },
        data: { managerId: currentUser.id } // Reassign to current admin
      });
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

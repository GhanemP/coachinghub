import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

const prisma = new PrismaClient();

export interface UserWithHierarchy {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  isActive: boolean;
  managerId?: string;
  subordinates?: UserWithHierarchy[];
}

/**
 * Get current user with session validation
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized: No valid session");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      subordinates: true,
      manager: true
    }
  });

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Get all users that the current user can access based on their role
 */
export async function getAccessibleUsers(currentUserId: string, currentUserRole: string): Promise<string[]> {
  switch (currentUserRole) {
    case 'ADMIN':
      // Admin can access all users
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      return allUsers.map(u => u.id);

    case 'MANAGER':
      // Manager can access their subordinates (team leaders) and agents under those team leaders
      const managerSubordinates = await prisma.user.findMany({
        where: { managerId: currentUserId },
        include: {
          subordinates: true // Get agents under team leaders
        }
      });
      
      const accessibleIds = [currentUserId];
      managerSubordinates.forEach(teamLeader => {
        accessibleIds.push(teamLeader.id);
        teamLeader.subordinates.forEach(agent => {
          accessibleIds.push(agent.id);
        });
      });
      return accessibleIds;

    case 'TEAM_LEADER':
      // Team leader can access their subordinates (agents)
      const teamLeaderSubordinates = await prisma.user.findMany({
        where: { managerId: currentUserId },
        select: { id: true }
      });
      return [currentUserId, ...teamLeaderSubordinates.map(u => u.id)];

    case 'AGENT':
      // Agent can only access themselves
      return [currentUserId];

    default:
      return [currentUserId];
  }
}

/**
 * Get all sessions that the current user can access
 */
export async function getAccessibleSessions(currentUserId: string, currentUserRole: string) {
  const accessibleUserIds = await getAccessibleUsers(currentUserId, currentUserRole);
  
  return await prisma.coachingSession.findMany({
    where: {
      OR: [
        { teamLeaderId: { in: accessibleUserIds } },
        { agentId: { in: accessibleUserIds } }
      ]
    },
    include: {
      teamLeader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      agent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      notes: true,
      actionItems: {
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: {
      scheduledDate: 'desc'
    }
  });
}

/**
 * Get all action items that the current user can access
 */
export async function getAccessibleActionItems(currentUserId: string, currentUserRole: string) {
  const accessibleUserIds = await getAccessibleUsers(currentUserId, currentUserRole);
  
  return await prisma.actionItem.findMany({
    where: {
      OR: [
        { assignedToId: { in: accessibleUserIds } },
        { createdById: { in: accessibleUserIds } }
      ]
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      session: {
        select: {
          id: true,
          sessionNumber: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Check if current user can access a specific user
 */
export async function canAccessUser(currentUserId: string, currentUserRole: string, targetUserId: string): Promise<boolean> {
  const accessibleUserIds = await getAccessibleUsers(currentUserId, currentUserRole);
  return accessibleUserIds.includes(targetUserId);
}

/**
 * Check if current user can access a specific session
 */
export async function canAccessSession(currentUserId: string, currentUserRole: string, sessionId: string): Promise<boolean> {
  const session = await prisma.coachingSession.findUnique({
    where: { id: sessionId },
    select: { teamLeaderId: true, agentId: true }
  });
  
  if (!session) return false;
  
  const canAccessTeamLeader = await canAccessUser(currentUserId, currentUserRole, session.teamLeaderId);
  const canAccessAgent = await canAccessUser(currentUserId, currentUserRole, session.agentId);
  
  return canAccessTeamLeader || canAccessAgent;
}

/**
 * Check if current user can modify a specific user (role changes, etc.)
 */
export async function canModifyUser(currentUserId: string, currentUserRole: string, targetUserId: string): Promise<boolean> {
  // Only admins and managers can modify users
  if (currentUserRole === 'ADMIN') return true;
  
  if (currentUserRole === 'MANAGER') {
    // Managers can modify their direct subordinates and agents under those subordinates
    return await canAccessUser(currentUserId, currentUserRole, targetUserId);
  }
  
  return false;
}

/**
 * Get filtered users based on role-based access control
 */
export async function getFilteredUsers(currentUserId: string, currentUserRole: string) {
  const accessibleUserIds = await getAccessibleUsers(currentUserId, currentUserRole);
  
  return await prisma.user.findMany({
    where: {
      id: { in: accessibleUserIds }
    },
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      },
      subordinates: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    },
    orderBy: [
      { role: 'asc' },
      { firstName: 'asc' }
    ]
  });
}

export { prisma };

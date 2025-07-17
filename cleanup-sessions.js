// Emergency cleanup script to delete excess sessions
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupSessions() {
  try {
    console.log('Starting session cleanup...');
    
    // Get total count first
    const totalCount = await prisma.coachingSession.count();
    console.log(`Total coaching sessions found: ${totalCount}`);
    
    if (totalCount > 10) {
      // Keep only the latest 5 sessions, delete the rest
      const sessionsToKeep = await prisma.coachingSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true }
      });
      
      const idsToKeep = sessionsToKeep.map(s => s.id);
      
      // Delete related records first
      await prisma.sessionNote.deleteMany({
        where: {
          sessionId: {
            notIn: idsToKeep
          }
        }
      });
      
      // Delete all sessions except the ones we want to keep
      const deleteResult = await prisma.coachingSession.deleteMany({
        where: {
          id: {
            notIn: idsToKeep
          }
        }
      });
      
      console.log(`Deleted ${deleteResult.count} excess sessions`);
      console.log(`Kept ${idsToKeep.length} most recent sessions`);
    } else {
      console.log('No cleanup needed - session count is reasonable');
    }
    
    // Show final count
    const finalCount = await prisma.coachingSession.count();
    console.log(`Final coaching session count: ${finalCount}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSessions();

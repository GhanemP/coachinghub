const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const updatedUser = await prisma.user.update({
      where: { email: 'ghanemp@gmail.com' },
      data: { role: 'ADMIN' },
    });
    
    console.log('✅ Successfully updated user to ADMIN:', updatedUser);
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

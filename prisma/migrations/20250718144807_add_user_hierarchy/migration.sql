/*
  Warnings:

  - You are about to drop the `CoachingHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthlyScorecard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceTrend` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoachingHistory" DROP CONSTRAINT "CoachingHistory_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyScorecard" DROP CONSTRAINT "MonthlyScorecard_userId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceTrend" DROP CONSTRAINT "PerformanceTrend_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT;

-- DropTable
DROP TABLE "CoachingHistory";

-- DropTable
DROP TABLE "MonthlyScorecard";

-- DropTable
DROP TABLE "PerformanceTrend";

-- DropEnum
DROP TYPE "PerformanceCategory";

-- DropEnum
DROP TYPE "ScorecardRating";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

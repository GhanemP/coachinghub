/*
  Warnings:

  - The values [PENDING,IN_PROGRESS] on the enum `GoalStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [COACH,CLIENT] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `ActionItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `comment` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `criteria` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Note` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sessionId,criteriaId]` on the table `Evaluation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assignedToId` to the `ActionItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `ActionItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `criteriaId` to the `Evaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `Evaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedToId` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetDate` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Template` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Template` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `content` on the `Template` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SCHEDULED', 'IMPROMPTU', 'FOLLOW_UP', 'PERFORMANCE_REVIEW', 'GOAL_SETTING', 'INCIDENT_REVIEW');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentResponseType" AS ENUM ('AGREE', 'DISAGREE', 'PARTIAL_AGREE');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

-- AlterEnum
BEGIN;
CREATE TYPE "GoalStatus_new" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
ALTER TABLE "Goal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Goal" ALTER COLUMN "status" TYPE "GoalStatus_new" USING ("status"::text::"GoalStatus_new");
ALTER TYPE "GoalStatus" RENAME TO "GoalStatus_old";
ALTER TYPE "GoalStatus_new" RENAME TO "GoalStatus";
DROP TYPE "GoalStatus_old";
ALTER TABLE "Goal" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('AGENT', 'TEAM_LEADER', 'MANAGER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActionItem" DROP CONSTRAINT "ActionItem_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_sessionId_fkey";

-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "assignedToId" TEXT NOT NULL,
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "priority" "ActionItemPriority" NOT NULL DEFAULT 'MEDIUM',
ALTER COLUMN "sessionId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ActionItemStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Evaluation" DROP COLUMN "comment",
DROP COLUMN "criteria",
DROP COLUMN "rating",
ADD COLUMN     "criteriaId" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL,
ADD COLUMN     "trend" "TrendDirection" NOT NULL DEFAULT 'STABLE';

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "assignedToId" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "currentValue" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "targetDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "targetValue" TEXT,
ALTER COLUMN "sessionId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "sessionId",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "SessionType" NOT NULL,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarUrl",
DROP COLUMN "name",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "tenure" TIMESTAMP(3);

-- DropTable
DROP TABLE "Note";

-- DropTable
DROP TABLE "Session";

-- DropEnum
DROP TYPE "ActionStatus";

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingSession" (
    "id" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "type" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "duration" INTEGER,
    "teamLeaderId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "callsReviewed" INTEGER,
    "callTypes" TEXT[],
    "overallScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionNote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isQuickNote" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCriteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "responseType" "AgentResponseType" NOT NULL,
    "comments" TEXT,
    "agreedPoints" TEXT[],
    "disputedPoints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "period" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_teamId_key" ON "TeamMember"("userId", "teamId");

-- CreateIndex
CREATE INDEX "CoachingSession_teamLeaderId_idx" ON "CoachingSession"("teamLeaderId");

-- CreateIndex
CREATE INDEX "CoachingSession_agentId_idx" ON "CoachingSession"("agentId");

-- CreateIndex
CREATE INDEX "CoachingSession_scheduledDate_idx" ON "CoachingSession"("scheduledDate");

-- CreateIndex
CREATE INDEX "CoachingSession_status_idx" ON "CoachingSession"("status");

-- CreateIndex
CREATE INDEX "SessionNote_sessionId_idx" ON "SessionNote"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCriteria_name_key" ON "EvaluationCriteria"("name");

-- CreateIndex
CREATE INDEX "EvaluationCriteria_category_idx" ON "EvaluationCriteria"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AgentResponse_sessionId_key" ON "AgentResponse"("sessionId");

-- CreateIndex
CREATE INDEX "KPIMetric_userId_idx" ON "KPIMetric"("userId");

-- CreateIndex
CREATE INDEX "KPIMetric_period_idx" ON "KPIMetric"("period");

-- CreateIndex
CREATE UNIQUE INDEX "KPIMetric_userId_metricName_period_key" ON "KPIMetric"("userId", "metricName", "period");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActionItem_sessionId_idx" ON "ActionItem"("sessionId");

-- CreateIndex
CREATE INDEX "ActionItem_assignedToId_idx" ON "ActionItem"("assignedToId");

-- CreateIndex
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- CreateIndex
CREATE INDEX "ActionItem_dueDate_idx" ON "ActionItem"("dueDate");

-- CreateIndex
CREATE INDEX "Evaluation_sessionId_idx" ON "Evaluation"("sessionId");

-- CreateIndex
CREATE INDEX "Evaluation_criteriaId_idx" ON "Evaluation"("criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_sessionId_criteriaId_key" ON "Evaluation"("sessionId", "criteriaId");

-- CreateIndex
CREATE INDEX "Goal_assignedToId_idx" ON "Goal"("assignedToId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_category_idx" ON "Goal"("category");

-- CreateIndex
CREATE INDEX "Template_type_idx" ON "Template"("type");

-- CreateIndex
CREATE INDEX "Template_createdById_idx" ON "Template"("createdById");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingSession" ADD CONSTRAINT "CoachingSession_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingSession" ADD CONSTRAINT "CoachingSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "EvaluationCriteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentResponse" ADD CONSTRAINT "AgentResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

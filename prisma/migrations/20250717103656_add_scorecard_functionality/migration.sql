-- CreateEnum
CREATE TYPE "PerformanceCategory" AS ENUM ('SERVICE', 'PRODUCTIVITY', 'QUALITY', 'ASSIDUITY', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "ScorecardRating" AS ENUM ('POOR', 'BELOW_AVERAGE', 'AVERAGE', 'GOOD', 'EXCELLENT');

-- CreateTable
CREATE TABLE "MonthlyScorecard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "service" "ScorecardRating",
    "productivity" "ScorecardRating",
    "quality" "ScorecardRating",
    "assiduity" "ScorecardRating",
    "performance" "ScorecardRating",
    "overallScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "whatWentWell" TEXT[],
    "improvementAreas" TEXT[],
    "otherAgreements" TEXT[],
    "improvementsImplemented" BOOLEAN NOT NULL DEFAULT false,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT true,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTrend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "PerformanceCategory" NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "trend" "TrendDirection" NOT NULL DEFAULT 'STABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyScorecard_userId_idx" ON "MonthlyScorecard"("userId");

-- CreateIndex
CREATE INDEX "MonthlyScorecard_year_month_idx" ON "MonthlyScorecard"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyScorecard_userId_year_month_key" ON "MonthlyScorecard"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingHistory_sessionId_key" ON "CoachingHistory"("sessionId");

-- CreateIndex
CREATE INDEX "CoachingHistory_sessionId_idx" ON "CoachingHistory"("sessionId");

-- CreateIndex
CREATE INDEX "PerformanceTrend_userId_idx" ON "PerformanceTrend"("userId");

-- CreateIndex
CREATE INDEX "PerformanceTrend_category_idx" ON "PerformanceTrend"("category");

-- CreateIndex
CREATE INDEX "PerformanceTrend_period_idx" ON "PerformanceTrend"("period");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceTrend_userId_category_period_key" ON "PerformanceTrend"("userId", "category", "period");

-- AddForeignKey
ALTER TABLE "MonthlyScorecard" ADD CONSTRAINT "MonthlyScorecard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingHistory" ADD CONSTRAINT "CoachingHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTrend" ADD CONSTRAINT "PerformanceTrend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

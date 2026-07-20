-- AlterTable
ALTER TABLE "Policy" ADD COLUMN "seasons" JSONB;

-- CreateTable
CREATE TABLE "PolicyTiming" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "description" TEXT,
    "optimalMonth" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PolicyTiming_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyTiming_policyId_season_key" ON "PolicyTiming"("policyId", "season");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "regionCodes" JSONB,
    "jobStatusCodes" JSONB,
    "incomeCondition" JSONB,
    "rawConditionText" TEXT,
    "conditionsVerified" BOOLEAN NOT NULL DEFAULT true,
    "applyStart" DATETIME,
    "applyEnd" DATETIME,
    "applyUrl" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Policy" ("ageMax", "ageMin", "applyEnd", "applyStart", "applyUrl", "category", "id", "incomeCondition", "jobStatusCodes", "rawConditionText", "regionCodes", "sourceId", "sourceSystem", "syncedAt", "title") SELECT "ageMax", "ageMin", "applyEnd", "applyStart", "applyUrl", "category", "id", "incomeCondition", "jobStatusCodes", "rawConditionText", "regionCodes", "sourceId", "sourceSystem", "syncedAt", "title" FROM "Policy";
DROP TABLE "Policy";
ALTER TABLE "new_Policy" RENAME TO "Policy";
CREATE UNIQUE INDEX "Policy_sourceSystem_sourceId_key" ON "Policy"("sourceSystem", "sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

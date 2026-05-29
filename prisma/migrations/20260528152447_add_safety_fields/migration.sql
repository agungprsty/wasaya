-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "enterpriseCustomSettings" JSONB,
ADD COLUMN     "safetyMode" TEXT NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "WhatsAppSession" ADD COLUMN     "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastViolationAt" TIMESTAMP(3),
ADD COLUMN     "safetyViolations" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ScheduledMessage" ADD COLUMN     "cronExpr" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "interval" INTEGER,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxRepeats" INTEGER,
ADD COLUMN     "nextRunAt" TIMESTAMP(3),
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "repeatCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "autoReplyActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyText" TEXT,
ADD COLUMN     "watermarkActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watermarkText" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "deviceId" TEXT NOT NULL DEFAULT 'main';

-- CreateTable
CREATE TABLE "AutoReplyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "repliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoReplyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoReplyLog_userId_contact_idx" ON "AutoReplyLog"("userId", "contact");

-- AddForeignKey
ALTER TABLE "AutoReplyLog" ADD CONSTRAINT "AutoReplyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

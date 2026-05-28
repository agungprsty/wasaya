-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "adminNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "broadcastEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "concurrency" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "msPerChar" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "readDelayMs" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "typingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WhatsAppSession" ADD COLUMN     "dailyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inboundCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outboundCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proxyUrl" TEXT;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "monthlySentCount" INTEGER NOT NULL DEFAULT 0,
    "dailySentCount" INTEGER NOT NULL DEFAULT 0,
    "lastDailyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonthlyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountAge" TEXT NOT NULL DEFAULT 'newborn',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

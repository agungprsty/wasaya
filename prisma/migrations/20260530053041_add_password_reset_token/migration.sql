/*
  Warnings:

  - You are about to drop the column `dailySentCount` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `lastDailyReset` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `lastMonthlyReset` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `monthlySentCount` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "dailySentCount",
DROP COLUMN "lastDailyReset",
DROP COLUMN "lastMonthlyReset",
DROP COLUMN "monthlySentCount";

-- AlterTable
ALTER TABLE "WhatsAppSession" ADD COLUMN     "lastError" TEXT;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

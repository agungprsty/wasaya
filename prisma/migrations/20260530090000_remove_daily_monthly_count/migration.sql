-- Drop unused columns from WhatsAppSession
ALTER TABLE "WhatsAppSession" DROP COLUMN "dailyCount";
ALTER TABLE "WhatsAppSession" DROP COLUMN "monthlyCount";

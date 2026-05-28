-- AlterTable: Change BaileysAuthCred.data from JSONB to TEXT
ALTER TABLE "baileys_auth_cred" ALTER COLUMN "data" SET DATA TYPE TEXT USING "data"::text;

-- AlterTable: Add deviceId, name columns to WhatsAppSession, change unique constraint
ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "deviceId" TEXT NOT NULL DEFAULT 'main';
ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Main Device';
DROP INDEX IF EXISTS "WhatsAppSession_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_userId_deviceId_key" ON "WhatsAppSession"("userId", "deviceId");

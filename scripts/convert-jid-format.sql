-- JID Format Migration: @c.us → @s.whatsapp.net
-- Run this AFTER deploying the Baileys code and BEFORE reconnecting devices.
--
-- Usage:
--   psql -d your_database -f scripts/convert-jid-format.sql
--
-- Or via Prisma:
--   npx prisma db execute --file scripts/convert-jid-format.sql

BEGIN;

UPDATE "WhatsAppMessage"
SET "to" = REPLACE("to", '@c.us', '@s.whatsapp.net')
WHERE "to" LIKE '%@c.us';

UPDATE "WhatsAppMessage"
SET "from" = REPLACE("from", '@c.us', '@s.whatsapp.net')
WHERE "from" LIKE '%@c.us';

COMMIT;

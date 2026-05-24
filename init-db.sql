-- Create tables for WhatsApp Gateway Service

-- WhatsAppMessage table
CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "to" VARCHAR(255) NOT NULL,
    "from" VARCHAR(255) NOT NULL,
    messageId VARCHAR(255) UNIQUE NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    mediaUrl TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WebhookEvent table
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eventType VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processedAt TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_to ON "WhatsAppMessage"("to");
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_from ON "WhatsAppMessage"("from");
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status ON "WhatsAppMessage"(status);
CREATE INDEX IF NOT EXISTS idx_webhook_event_processed ON "WebhookEvent"(processed);
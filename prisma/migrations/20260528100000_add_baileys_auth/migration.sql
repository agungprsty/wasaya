-- CreateTable
CREATE TABLE "baileys_auth_cred" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keyId" TEXT,
    "data" JSONB NOT NULL,

    CONSTRAINT "baileys_auth_cred_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "baileys_auth_cred_userId_deviceId_idx" ON "baileys_auth_cred"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "baileys_auth_cred_userId_deviceId_category_keyId_key" ON "baileys_auth_cred"("userId", "deviceId", "category", "keyId");

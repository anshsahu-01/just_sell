-- DropIndex
DROP INDEX IF EXISTS "Conversation_productId_buyerId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_buyerId_sellerId_productId_key" ON "Conversation"("buyerId", "sellerId", "productId");

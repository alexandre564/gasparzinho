-- Add payment due date to orders.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "paymentDueDate" TIMESTAMP(3);

-- Add renegotiation and payment tracking to debts.
ALTER TABLE "Debt"
ADD COLUMN IF NOT EXISTS "originalDueDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "renegotiatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "renegotiatedValue" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

UPDATE "Debt"
SET "originalDueDate" = "dueDate"
WHERE "originalDueDate" IS NULL;

-- Store editable system texts and other small settings.
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

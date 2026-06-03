CREATE TABLE IF NOT EXISTS "CashEntry" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ENTRADA',
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "debtId" TEXT,
  "orderId" TEXT,
  "customerId" TEXT,
  "paymentMethod" TEXT,
  "responsible" TEXT,
  "notes" TEXT,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CashEntry_date_idx" ON "CashEntry"("date");
CREATE INDEX IF NOT EXISTS "CashEntry_source_idx" ON "CashEntry"("source");
CREATE INDEX IF NOT EXISTS "CashEntry_debtId_idx" ON "CashEntry"("debtId");
CREATE INDEX IF NOT EXISTS "CashEntry_orderId_idx" ON "CashEntry"("orderId");
CREATE INDEX IF NOT EXISTS "CashEntry_customerId_idx" ON "CashEntry"("customerId");
CREATE INDEX IF NOT EXISTS "CashEntry_branchId_idx" ON "CashEntry"("branchId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashEntry_branchId_fkey') THEN
    ALTER TABLE "CashEntry"
      ADD CONSTRAINT "CashEntry_branchId_fkey"
      FOREIGN KEY ("branchId")
      REFERENCES "Branch"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

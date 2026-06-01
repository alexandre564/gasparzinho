INSERT INTO "Organization" ("id", "name", "status", "notes", "createdAt", "updatedAt")
VALUES ('org_gas_default', 'Gas', 'ATIVA', 'Organizacao padrao criada para evolucao multifilial.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Branch" (
  "id",
  "organizationId",
  "name",
  "tradingName",
  "city",
  "status",
  "contractStatus",
  "notes",
  "createdAt",
  "updatedAt"
)
VALUES (
  'branch_gasparzinho_default',
  'org_gas_default',
  'Gás Gasparzinho',
  'Gás Gasparzinho',
  'Lavras',
  'ATIVA',
  'PROPRIA',
  'Filial padrao para os dados existentes antes do isolamento por branchId.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_gas_default',
  ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "ButaneCylinder" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'branch_gasparzinho_default';

ALTER TABLE "User" ALTER COLUMN "organizationId" SET DEFAULT 'org_gas_default';
ALTER TABLE "User" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Customer" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Product" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "ButaneCylinder" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "InventoryMovement" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Order" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Delivery" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Debt" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Expense" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "Vehicle" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';
ALTER TABLE "DailyClosing" ALTER COLUMN "branchId" SET DEFAULT 'branch_gasparzinho_default';

UPDATE "User"
SET "organizationId" = COALESCE("organizationId", 'org_gas_default'),
    "branchId" = COALESCE("branchId", 'branch_gasparzinho_default');

UPDATE "Customer" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Product" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "ButaneCylinder" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "InventoryMovement" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Order" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Delivery" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Debt" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Expense" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Vehicle" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "DailyClosing" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;

CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON "User"("branchId");
CREATE INDEX IF NOT EXISTS "Customer_branchId_idx" ON "Customer"("branchId");
CREATE INDEX IF NOT EXISTS "Product_branchId_idx" ON "Product"("branchId");
CREATE INDEX IF NOT EXISTS "ButaneCylinder_branchId_idx" ON "ButaneCylinder"("branchId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_branchId_idx" ON "InventoryMovement"("branchId");
CREATE INDEX IF NOT EXISTS "Order_branchId_idx" ON "Order"("branchId");
CREATE INDEX IF NOT EXISTS "Delivery_branchId_idx" ON "Delivery"("branchId");
CREATE INDEX IF NOT EXISTS "Debt_branchId_idx" ON "Debt"("branchId");
CREATE INDEX IF NOT EXISTS "Expense_branchId_idx" ON "Expense"("branchId");
CREATE INDEX IF NOT EXISTS "Vehicle_branchId_idx" ON "Vehicle"("branchId");
CREATE INDEX IF NOT EXISTS "DailyClosing_branchId_idx" ON "DailyClosing"("branchId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_organizationId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_branchId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_branchId_fkey') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_branchId_fkey') THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ButaneCylinder_branchId_fkey') THEN
    ALTER TABLE "ButaneCylinder" ADD CONSTRAINT "ButaneCylinder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryMovement_branchId_fkey') THEN
    ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_branchId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Delivery_branchId_fkey') THEN
    ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Debt_branchId_fkey') THEN
    ALTER TABLE "Debt" ADD CONSTRAINT "Debt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_branchId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Vehicle_branchId_fkey') THEN
    ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyClosing_branchId_fkey') THEN
    ALTER TABLE "DailyClosing" ADD CONSTRAINT "DailyClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Delivery address selected for each order.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryReference" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryAddressChanged" BOOLEAN NOT NULL DEFAULT false;

-- Cost center details for expenses/gastos.
ALTER TABLE "Expense"
ADD COLUMN IF NOT EXISTS "subCategory" TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "responsible" TEXT,
ADD COLUMN IF NOT EXISTS "vehicleLabel" TEXT;

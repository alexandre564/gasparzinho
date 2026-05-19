/*
  Warnings:

  - You are about to drop the column `deliveryPersonId` on the `Order` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "stockKind" TEXT NOT NULL DEFAULT 'UNICO'
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventorySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "fullUnits" INTEGER NOT NULL DEFAULT 0,
    "emptyUnits" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InventorySummary_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'AGUARDANDO_ENVIO',
    "trackingCode" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "paymentMethod" TEXT,
    "amountTotal" DECIMAL NOT NULL,
    "amountPaid" DECIMAL NOT NULL DEFAULT 0,
    "amountOpen" DECIMAL NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amountOpen", "amountPaid", "amountTotal", "createdAt", "customerId", "deliveryStatus", "id", "paymentMethod", "paymentStatus", "sellerId", "status", "trackingCode", "updatedAt", "vehicleId") SELECT "amountOpen", "amountPaid", "amountTotal", "createdAt", "customerId", "deliveryStatus", "id", "paymentMethod", "paymentStatus", "sellerId", "status", "trackingCode", "updatedAt", "vehicleId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySummary_productId_key" ON "InventorySummary"("productId");

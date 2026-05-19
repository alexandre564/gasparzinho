-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyClosing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalSales" DECIMAL NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "netBalance" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DailyClosing" ("closedBy", "createdAt", "date", "id", "notes", "ordersCount", "totalExpenses", "totalRevenue", "totalSales", "updatedAt") SELECT "closedBy", "createdAt", "date", "id", "notes", "ordersCount", "totalExpenses", "totalRevenue", "totalSales", "updatedAt" FROM "DailyClosing";
DROP TABLE "DailyClosing";
ALTER TABLE "new_DailyClosing" RENAME TO "DailyClosing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

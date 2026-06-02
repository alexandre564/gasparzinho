UPDATE "Customer" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Product" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;
UPDATE "Vehicle" SET "branchId" = 'branch_gasparzinho_default' WHERE "branchId" IS NULL;

DROP INDEX IF EXISTS "Customer_phone_key";
DROP INDEX IF EXISTS "Product_name_key";
DROP INDEX IF EXISTS "Vehicle_placa_key";

WITH scored AS (
  SELECT
    c."id",
    c."branchId",
    c."phone",
    c."createdAt",
    (SELECT COUNT(*)::int FROM "Order" o WHERE o."customerId" = c."id") +
    (SELECT COUNT(*)::int FROM "Debt" d WHERE d."customerId" = c."id") AS score
  FROM "Customer" c
),
ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "phone"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "phone"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
UPDATE "Order" o
SET "customerId" = ranked.canonical_id
FROM ranked
WHERE ranked.row_number > 1
  AND o."customerId" = ranked."id";

WITH scored AS (
  SELECT
    c."id",
    c."branchId",
    c."phone",
    c."createdAt",
    (SELECT COUNT(*)::int FROM "Order" o WHERE o."customerId" = c."id") +
    (SELECT COUNT(*)::int FROM "Debt" d WHERE d."customerId" = c."id") AS score
  FROM "Customer" c
),
ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "phone"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "phone"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
UPDATE "Debt" d
SET "customerId" = ranked.canonical_id
FROM ranked
WHERE ranked.row_number > 1
  AND d."customerId" = ranked."id";

WITH scored AS (
  SELECT
    c."id",
    c."branchId",
    c."phone",
    c."createdAt",
    (SELECT COUNT(*)::int FROM "Order" o WHERE o."customerId" = c."id") +
    (SELECT COUNT(*)::int FROM "Debt" d WHERE d."customerId" = c."id") AS score
  FROM "Customer" c
),
ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "phone"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
DELETE FROM "Customer" c
USING ranked
WHERE ranked.row_number > 1
  AND c."id" = ranked."id";

WITH scored AS (
  SELECT
    p."id",
    p."branchId",
    p."name",
    p."createdAt",
    (SELECT COUNT(*)::int FROM "OrderItem" oi WHERE oi."productId" = p."id") +
    (SELECT COUNT(*)::int FROM "InventoryMovement" im WHERE im."productId" = p."id") AS score
  FROM "Product" p
),
ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
UPDATE "OrderItem" oi
SET "productId" = ranked.canonical_id
FROM ranked
WHERE ranked.row_number > 1
  AND oi."productId" = ranked."id";

WITH scored AS (
  SELECT
    p."id",
    p."branchId",
    p."name",
    p."createdAt",
    (SELECT COUNT(*)::int FROM "OrderItem" oi WHERE oi."productId" = p."id") +
    (SELECT COUNT(*)::int FROM "InventoryMovement" im WHERE im."productId" = p."id") AS score
  FROM "Product" p
),
ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
UPDATE "InventoryMovement" im
SET "productId" = ranked.canonical_id
FROM ranked
WHERE ranked.row_number > 1
  AND im."productId" = ranked."id";

WITH scored AS (
  SELECT
    p."id",
    p."branchId",
    p."name",
    p."createdAt",
    (SELECT COUNT(*)::int FROM "OrderItem" oi WHERE oi."productId" = p."id") +
    (SELECT COUNT(*)::int FROM "InventoryMovement" im WHERE im."productId" = p."id") AS score
  FROM "Product" p
),
ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
UPDATE "ButaneCylinder" bc
SET "productId" = ranked.canonical_id
FROM ranked
WHERE ranked.row_number > 1
  AND bc."productId" = ranked."id";

WITH scored AS (
  SELECT
    p."id",
    p."branchId",
    p."name",
    p."inventory",
    p."createdAt",
    (SELECT COUNT(*)::int FROM "OrderItem" oi WHERE oi."productId" = p."id") +
    (SELECT COUNT(*)::int FROM "InventoryMovement" im WHERE im."productId" = p."id") AS score
  FROM "Product" p
),
ranked AS (
  SELECT
    "id",
    "inventory",
    FIRST_VALUE("id") OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
),
inventory_to_merge AS (
  SELECT canonical_id, SUM("inventory")::int AS inventory_sum
  FROM ranked
  WHERE row_number > 1
  GROUP BY canonical_id
)
UPDATE "Product" p
SET "inventory" = p."inventory" + inventory_to_merge.inventory_sum
FROM inventory_to_merge
WHERE p."id" = inventory_to_merge.canonical_id;

WITH scored AS (
  SELECT
    p."id",
    p."branchId",
    p."name",
    p."createdAt",
    (SELECT COUNT(*)::int FROM "OrderItem" oi WHERE oi."productId" = p."id") +
    (SELECT COUNT(*)::int FROM "InventoryMovement" im WHERE im."productId" = p."id") AS score
  FROM "Product" p
),
ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "name"
      ORDER BY score DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM scored
)
DELETE FROM "Product" p
USING ranked
WHERE ranked.row_number > 1
  AND p."id" = ranked."id";

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "branchId", "placa"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "Vehicle"
)
DELETE FROM "Vehicle" v
USING ranked
WHERE ranked.row_number > 1
  AND v."id" = ranked."id";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_branchId_phone_key" ON "Customer"("branchId", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_branchId_name_key" ON "Product"("branchId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_branchId_placa_key" ON "Vehicle"("branchId", "placa");

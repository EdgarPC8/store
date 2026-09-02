-- Store: productos creados desde factura/compra como "raw" → "final"
-- No toca insumos genéricos (isGenericIngredient=1) ni ligados a genérico.
-- Uso:
--   mysql -u root store < scripts/promote-raw-purchase-products-to-final.sql

SELECT 'ANTES' AS etapa, type, COUNT(*) AS total
FROM ERP_inventory_products
WHERE isActive = 1
GROUP BY type;

-- Preview de lo que se va a cambiar
SELECT id, LEFT(name, 60) AS name, type, price, barcode
FROM ERP_inventory_products
WHERE type = 'raw'
  AND isActive = 1
  AND isGenericIngredient = 0
  AND genericProductId IS NULL
ORDER BY id;

UPDATE ERP_inventory_products
SET type = 'final',
    updatedAt = NOW()
WHERE type = 'raw'
  AND isActive = 1
  AND isGenericIngredient = 0
  AND genericProductId IS NULL;

SELECT ROW_COUNT() AS filas_actualizadas;

SELECT 'DESPUES' AS etapa, type, COUNT(*) AS total
FROM ERP_inventory_products
WHERE isActive = 1
GROUP BY type;

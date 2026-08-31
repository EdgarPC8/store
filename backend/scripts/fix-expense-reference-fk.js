/**
 * referenceId en ERP_finance_expenses es polimórfico (supplier_order_payment, etc.).
 * Una FK antigua a ERP_inventory_products rompe pagos a proveedores.
 *
 * Uso: node scripts/fix-expense-reference-fk.js
 */
import "dotenv/config";
import { sequelize } from "../src/database/connection.js";

const TABLE = "ERP_finance_expenses";

async function dropFkIfExists(constraintName) {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    { replacements: [TABLE, constraintName] }
  );
  if (!rows.length) return false;
  await sequelize.query(`ALTER TABLE \`${TABLE}\` DROP FOREIGN KEY \`${constraintName}\``);
  return true;
}

try {
  await sequelize.authenticate();
  const dropped = await dropFkIfExists("ERP_finance_expenses_ibfk_7");
  if (dropped) {
    console.log("✅ FK ERP_finance_expenses_ibfk_7 eliminada (referenceId → producto).");
  } else {
    console.log("ℹ️  FK ERP_finance_expenses_ibfk_7 no existe; nada que hacer.");
  }
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error?.message || error);
  process.exit(1);
}

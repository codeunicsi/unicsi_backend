import sequelize from "../src/config/database.js";

const migrations = [
  `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mrp DECIMAL(12,2) DEFAULT NULL`,
  `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bulk_price DECIMAL(12,2) DEFAULT NULL`,
  `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS transfer_price DECIMAL(12,2) DEFAULT NULL`,
  `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bulk_price_updated_at TIMESTAMPTZ DEFAULT NULL`,
  `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bulk_price_last_reminded_at TIMESTAMPTZ DEFAULT NULL`,
];

try {
  for (const sql of migrations) {
    await sequelize.query(sql);
    const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\S+)/)[1];
    console.log(`✅ ${colName} — OK`);
  }

  // Verify
  const [rows] = await sequelize.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='products' ORDER BY ordinal_position`,
  );
  console.log("\nFinal columns in products:");
  rows.forEach((r) => console.log(`  ${r.column_name} (${r.data_type})`));
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await sequelize.close();
}

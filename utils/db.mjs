/**
 * UAT DB connection for pricing snapshot.
 * DB type: PostgreSQL — using the `pg` (node-postgres) driver.
 *
 * Before first use:
 *   npm install pg
 *   cp .env.example .env  → fill in your UAT credentials
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TODO LIST — fill in your actual UAT table/column names below.
 * Search for every "TODO:" comment and replace with real values.
 * ────────────────────────────────────────────────────────────────────────────
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.UAT_DB_HOST     ?? '',
  port:     Number(process.env.UAT_DB_PORT ?? 5432),
  database: process.env.UAT_DB_NAME     ?? '',
  user:     process.env.UAT_DB_USER     ?? '',
  password: process.env.UAT_DB_PASSWORD ?? '',
  ssl:      process.env.UAT_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:      3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
});

export async function connectDb() {
  const missing = ['UAT_DB_HOST', 'UAT_DB_NAME', 'UAT_DB_USER', 'UAT_DB_PASSWORD']
    .filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}. Copy .env.example → .env and fill them in.`);
  }
  // Verify the connection is live before returning
  const client = await pool.connect();
  client.release();
  return pool;
}

export async function closeDb(pool) {
  await pool.end().catch(() => {});
}

// ─── PRICING SNAPSHOT QUERIES ─────────────────────────────────────────────────

/**
 * Pull all active pricing data needed for the test run.
 *
 * Each query below has a TODO comment — replace table/column names
 * with your actual UAT schema before running.
 */
export async function queryPricingSnapshot(pool) {
  const [products, metalRates, stoneRates, discounts] = await Promise.all([
    queryProducts(pool),
    queryMetalRates(pool),
    queryStoneRates(pool),
    queryDiscounts(pool),
  ]);
  return { products, metalRates, stoneRates, discounts };
}

async function queryProducts(pool) {
  // TODO: Replace "product_pricing" with your actual table name.
  // TODO: Replace each column alias with the real column name in your schema.
  //       The alias on the LEFT (e.g. SKUCode, MRPChecked) must stay as-is
  //       so the rest of the code can reference them by name.
  const { rows } = await pool.query(`
    SELECT
      p.sku_code          AS "SKUCode",
      p.mrp_checked       AS "MRPChecked",       -- TODO: real column for UCP flag (boolean)
      p.price             AS "Price",
      p.from_date         AS "FromDate",
      p.to_date           AS "ToDate",
      p.category          AS "Category",          -- TODO: 'Gold' / 'Diamond' / 'Silver' / 'Platinum'
      p.product_type      AS "ProductType",       -- TODO: 'Plain' / 'Studded' / 'Solitaire'
      p.metal_weight      AS "MetalWeight",
      p.op_type           AS "OpType",            -- TODO: 'Percentage' / 'Weight' / 'Total'
      p.making_value      AS "MakingValue",
      p.stone_type        AS "StoneType",         -- TODO: null for plain products
      p.stone_weight      AS "StoneWeight",
      p.stone_pcs         AS "StonePcs",
      p.is_active         AS "IsActive"
    FROM product_pricing p                        -- TODO: actual table name
    WHERE p.is_active = true
    ORDER BY p.sku_code
  `);
  return rows;
}

async function queryMetalRates(pool) {
  // TODO: Replace "metal_rates" with your actual table name.
  // rate_type values must include 'Sale' and 'Other Exchange' (TC-21 critical).
  const { rows } = await pool.query(`
    SELECT
      m.metal             AS "Metal",             -- TODO: 'Gold' / 'Silver' / 'Platinum'
      m.rate_type         AS "RateType",          -- TODO: 'Sale' / 'Other Exchange'
      m.rate              AS "Rate",
      m.is_retail         AS "IsRetail",
      m.is_active         AS "IsActive"
    FROM metal_rates m                            -- TODO: actual table name
    WHERE m.is_active = true
      AND m.is_retail = true
  `);
  return rows;
}

async function queryStoneRates(pool) {
  // TODO: Replace "stone_rates" with your actual table name.
  const { rows } = await pool.query(`
    SELECT
      s.stone_type              AS "StoneType",
      s.calc_type               AS "CalcType",    -- TODO: 'Quantity' / 'pcs' / 'Tot'
      s.unit_rate               AS "UnitRate",
      s.exchange_deduction_pct  AS "ExchangeDeductionPct",
      s.buyback_deduction_pct   AS "BuybackDeductionPct",
      s.is_active               AS "IsActive"
    FROM stone_rates s                            -- TODO: actual table name
    WHERE s.is_active = true
  `);
  return rows;
}

async function queryDiscounts(pool) {
  // TODO: Replace "discount_config" with your actual table name.
  const { rows } = await pool.query(`
    SELECT
      d.category          AS "Category",
      d.slab_from         AS "SlabFrom",
      d.slab_to           AS "SlabTo",
      d.discount_pct      AS "DiscountPct",       -- TODO: general discount %
      d.rm_limit_pct      AS "RMLimitPct",        -- TODO: RM empowerment cap
      d.hod_limit_pct     AS "HODLimitPct",       -- TODO: HOD empowerment cap
      d.is_active         AS "IsActive"
    FROM discount_config d                        -- TODO: actual table name
    WHERE d.is_active = true
  `);
  return rows;
}

// ─── SYNC AUDIT ───────────────────────────────────────────────────────────────

/**
 * Returns the timestamp of the last successful on-prem → UAT sync.
 * Used by global-setup to enforce the 15-minute post-sync buffer.
 *
 * TODO: Replace "sync_audit" / "sync_completed_at" / "sync_status"
 *       with your actual audit table and column names.
 */
export async function getLastSyncTime(pool) {
  const { rows } = await pool.query(`
    SELECT sync_completed_at AS "SyncCompletedAt"  -- TODO: real timestamp column
    FROM sync_audit                                 -- TODO: real audit table name
    WHERE sync_status = 'SUCCESS'                   -- TODO: real status value
    ORDER BY sync_completed_at DESC
    LIMIT 1
  `);
  return rows[0]?.SyncCompletedAt ?? new Date(0);
}

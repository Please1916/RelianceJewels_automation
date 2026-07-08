/**
 * Playwright globalSetup — runs ONCE before any test worker starts.
 *
 * What it does:
 *   1. Connects to the UAT DB.
 *   2. Checks how long ago the last on-prem sync completed (warns if < 15 min).
 *   3. Pulls a point-in-time snapshot of all pricing tables.
 *   4. Writes fixtures/pricing-snapshot.json — tests read from this file.
 *
 * If the DB is unreachable (no credentials, VPN off, etc.) it writes an empty
 * fallback snapshot and lets tests run — those tests will skip themselves via
 * the `skipIfFallback` helper in pricing.spec.js.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { connectDb, queryPricingSnapshot, getLastSyncTime, closeDb } from './utils/db.mjs';

const SNAPSHOT_PATH  = path.resolve('fixtures/pricing-snapshot.json');
const SYNC_BUFFER_MS = 15 * 60 * 1000; // 15 min buffer after sync

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });

  let pool;
  try {
    pool = await connectDb();
  } catch (err) {
    console.warn(`\n[pricing] DB unreachable — ${err.message}`);
    console.warn('[pricing] Writing fallback snapshot. Pricing DB tests will be skipped.\n');
    writeFallback({ reason: err.message });
    return;
  }

  try {
    // ── Sync staleness guard ──────────────────────────────────────────────
    const lastSync    = await getLastSyncTime(pool);
    const msSinceSync = Date.now() - new Date(lastSync).getTime();
    const minSinceSync = Math.round(msSinceSync / 60_000);

    if (msSinceSync < SYNC_BUFFER_MS) {
      const waitMin = Math.ceil((SYNC_BUFFER_MS - msSinceSync) / 60_000);
      console.warn(
        `\n[pricing] WARN: UAT DB sync completed ${minSinceSync} min ago.` +
        ` Data may still be propagating. Consider re-running in ${waitMin} min.\n`
      );
    } else {
      console.log(`[pricing] Last sync: ${minSinceSync} min ago — data is stable.`);
    }

    // ── Pull snapshot ─────────────────────────────────────────────────────
    const snapshot = await queryPricingSnapshot(pool);

    const output = {
      ...snapshot,
      capturedAt:   new Date().toISOString(),
      lastSyncAt:   new Date(lastSync).toISOString(),
      msSinceSync,
      fallback:     false,
    };

    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(output, null, 2));
    console.log(
      `[pricing] Snapshot saved → ${snapshot.products.length} products, ` +
      `${snapshot.metalRates.length} metal rates, ` +
      `${snapshot.stoneRates.length} stone rates.`
    );
  } finally {
    await closeDb(pool);
  }
}

function writeFallback({ reason = 'unknown' } = {}) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({
    products:    [],
    metalRates:  [],
    stoneRates:  [],
    discounts:   [],
    capturedAt:  new Date().toISOString(),
    lastSyncAt:  null,
    msSinceSync: null,
    fallback:    true,
    fallbackReason: reason,
  }, null, 2));
}

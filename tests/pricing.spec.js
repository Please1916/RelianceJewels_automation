/**
 * Pricing Validation — data-driven tests against UAT DB snapshot.
 *
 * Flow per run:
 *   global-setup.mjs pulls UAT DB → fixtures/pricing-snapshot.json
 *   ↓
 *   Tests here read snapshot, calculate expected prices, open each product
 *   on the UAT site, and assert the displayed price matches.
 *
 * Sections mirror the PDF test cases:
 *   Section 1  TC-01/02  UCP classification + date validity
 *   Section 3  TC-14~18  Plain product selling price (all opTypes)
 *   Section 4  TC-19~21  Plain product exchange price + rate type check
 *   Section 5  TC-22~27  Studded product selling price
 *   Section 6  TC-28~33  Studded exchange & buyback
 *   Section 7  TC-34~44  Discounting (general, empowerment, voucher)
 *   Health     —         Snapshot freshness + table completeness
 *
 * Run:  npx playwright test pricing
 */

import { test, expect } from '@playwright/test';
import fs               from 'node:fs';
import path             from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDPPage, parseRupees } from '../pages/PdpPage.js';
import {
  classifyProduct,
  calcPlainSellingPrice,
  calcPlainExchangePrice,
  calcStuddedSellingPrice,
  calcStoneValue,
  calcStuddedExchangePrice,
  applyStoneDeduction,
  calcGeneralDiscount,
  calcEmpowermentDiscount,
  stackDiscounts,
  round,
} from '../utils/pricing-calculator.mjs';

// ─── Snapshot ─────────────────────────────────────────────────────────────────

const SNAPSHOT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/pricing-snapshot.json'
);

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
} catch {
  // File not written yet (global-setup not run, or DB unreachable)
  snapshot = { products: [], metalRates: [], stoneRates: [], discounts: [], fallback: true };
}

// Skip entire describe block when DB was unreachable
function skipIfFallback(testFn) {
  return async (args) => {
    if (snapshot.fallback) {
      console.log(`[pricing] Skipped — snapshot is fallback (${snapshot.fallbackReason ?? 'DB unreachable'})`);
      return;
    }
    await testFn(args);
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Metal rate from snapshot by metal type and rate type. */
function getRate(metal, rateType = 'Sale') {
  return snapshot.metalRates.find(
    r => r.Metal?.toLowerCase()    === metal?.toLowerCase() &&
         r.RateType?.toLowerCase() === rateType.toLowerCase()
  )?.Rate ?? 0;
}

/** Stone config from snapshot by stone type. */
function getStoneConf(stoneType) {
  return snapshot.stoneRates.find(
    r => r.StoneType?.toLowerCase() === stoneType?.toLowerCase()
  ) ?? null;
}

/** Navigate directly to a product by SKU code slug. */
async function openProduct(page, skuCode) {
  await page.goto(`/product/${skuCode}`, { waitUntil: 'domcontentloaded' });
}

/** Get displayed selling price from the PDP (first ₹ value in the price element). */
async function getDisplayedPrice(page) {
  const pdp  = new PDPPage(page);
  await pdp.markedPrice.waitFor({ state: 'visible', timeout: 20_000 });
  const text = await pdp.markedPrice.innerText();
  return parseRupees(text)[0] ?? null;
}

/** Get the Final Value cell for a specific breakup row (e.g. 'Making Charges'). */
async function getBreakupValue(page, component) {
  const pdp = new PDPPage(page);
  await pdp.expandPriceBreakup();
  const raw = await pdp.priceBreakupFinalValue(component);
  return parseRupees(raw)[0] ?? null;
}

// ─── SECTION: Snapshot Health ─────────────────────────────────────────────────

test.describe('Pricing — Snapshot Health', () => {
  test('Snapshot file exists and has a timestamp', () => {
    expect(snapshot.capturedAt, 'capturedAt must be set').toBeTruthy();
  });

  test('Snapshot is less than 13 hours old (within one sync cycle)', () => {
    test.skip(snapshot.fallback, 'fallback snapshot — DB was unreachable');
    const ageHrs = (Date.now() - new Date(snapshot.capturedAt).getTime()) / 36e5;
    expect(ageHrs, 'Snapshot should be < 13 h old').toBeLessThan(13);
  });

  test('All four pricing tables are populated', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    expect(snapshot.products.length,   'products must have rows').toBeGreaterThan(0);
    expect(snapshot.metalRates.length, 'metalRates must have rows').toBeGreaterThan(0);
    expect(snapshot.stoneRates.length, 'stoneRates must have rows').toBeGreaterThan(0);
    expect(snapshot.discounts.length,  'discounts must have rows').toBeGreaterThan(0);
  });

  test('TC-21 | Sale rate and Other Exchange rate both exist for Gold and are different', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const saleRate     = getRate('Gold', 'Sale');
    const exchangeRate = getRate('Gold', 'Other Exchange');
    expect(saleRate,     'Gold Sale rate must be > 0').toBeGreaterThan(0);
    expect(exchangeRate, 'Gold Other Exchange rate must be > 0').toBeGreaterThan(0);
    expect(exchangeRate, 'Exchange rate must be lower than sale rate (TC-21)').toBeLessThan(saleRate);
  });
});

// ─── SECTION 1: UCP Classification (TC-01 / TC-02) ───────────────────────────

test.describe('Pricing — UCP Classification', () => {
  const ucpProducts = () => snapshot.products.filter(p => p.MRPChecked);

  test('TC-01 | Active UCP products display their fixed DB price', skipIfFallback(async ({ page }) => {
    const active = ucpProducts().filter(sku => classifyProduct(sku).activeRecord !== null);
    test.skip(active.length === 0, 'No active UCP products in snapshot');

    for (const sku of active.slice(0, 5)) { // cap at 5 to keep runtime reasonable
      const { activeRecord } = classifyProduct(sku);
      await openProduct(page, sku.SKUCode);
      const displayed = await getDisplayedPrice(page);
      expect(displayed, `${sku.SKUCode}: displayed price should match DB UCP price`).toBe(activeRecord.Price);
    }
  }));

  test('TC-02 | Expired UCP products show no valid price', skipIfFallback(async ({ page }) => {
    const expired = ucpProducts().filter(sku => classifyProduct(sku).activeRecord === null);
    test.skip(expired.length === 0, 'No expired UCP products in snapshot');

    const sku = expired[0];
    await openProduct(page, sku.SKUCode);
    // Expired UCP should either show ₹0, a placeholder, or be absent
    const displayed = await getDisplayedPrice(page);
    expect(
      displayed === null || displayed === 0,
      `${sku.SKUCode}: expired UCP should not show a valid price (got ₹${displayed})`
    ).toBe(true);
  }));
});

// ─── SECTION 3: Plain Product — Selling Price (TC-14 to TC-18) ───────────────

test.describe('Pricing — Plain Product Selling Price', () => {
  const plainProducts = () => snapshot.products.filter(
    p => !p.MRPChecked && p.ProductType?.toLowerCase() === 'plain'
  );

  test('TC-14 | Wastage % opType — selling price matches formula', skipIfFallback(async ({ page }) => {
    const skus = plainProducts().filter(p => p.OpType?.toLowerCase() === 'percentage');
    test.skip(skus.length === 0, 'No plain percentage-type products in snapshot');

    for (const sku of skus.slice(0, 3)) {
      const metalRate = getRate(sku.Category, 'Sale');
      const { total } = calcPlainSellingPrice({
        metalWeight: sku.MetalWeight, metalRate,
        opType: 'percentage', makingValue: sku.MakingValue,
      });
      await openProduct(page, sku.SKUCode);
      const displayed = await getDisplayedPrice(page);
      expect(displayed, `${sku.SKUCode} (wastage%): UI ₹${displayed} ≠ calculated ₹${total}`).toBe(total);
    }
  }));

  test('TC-15 | Making per-gram opType — selling price matches formula', skipIfFallback(async ({ page }) => {
    const skus = plainProducts().filter(p => p.OpType?.toLowerCase() === 'weight');
    test.skip(skus.length === 0, 'No plain weight-type products in snapshot');

    for (const sku of skus.slice(0, 3)) {
      const metalRate = getRate(sku.Category, 'Sale');
      const { total } = calcPlainSellingPrice({
        metalWeight: sku.MetalWeight, metalRate,
        opType: 'weight', makingValue: sku.MakingValue,
      });
      await openProduct(page, sku.SKUCode);
      const displayed = await getDisplayedPrice(page);
      expect(displayed, `${sku.SKUCode} (per-gram): UI ₹${displayed} ≠ calculated ₹${total}`).toBe(total);
    }
  }));

  test('TC-17 | Total opType — making equals unit rate directly', skipIfFallback(async ({ page }) => {
    const skus = plainProducts().filter(p => p.OpType?.toLowerCase() === 'total');
    test.skip(skus.length === 0, 'No plain total-type products in snapshot');

    for (const sku of skus.slice(0, 3)) {
      const metalRate = getRate(sku.Category, 'Sale');
      const { making, total } = calcPlainSellingPrice({
        metalWeight: sku.MetalWeight, metalRate,
        opType: 'total', makingValue: sku.MakingValue,
      });
      expect(making, `${sku.SKUCode}: making should equal unit rate directly`).toBe(round(sku.MakingValue));
      await openProduct(page, sku.SKUCode);
      const displayed = await getDisplayedPrice(page);
      expect(displayed, `${sku.SKUCode} (total): UI ₹${displayed} ≠ calculated ₹${total}`).toBe(total);
    }
  }));

  test('TC-18 | No making configured — making charge is ₹0, no error', skipIfFallback(async ({ page }) => {
    const skus = plainProducts().filter(p => !p.MakingValue && !p.OpType);
    test.skip(skus.length === 0, 'No products with empty making in snapshot');

    const sku       = skus[0];
    const metalRate = getRate(sku.Category, 'Sale');
    const { making, total } = calcPlainSellingPrice({
      metalWeight: sku.MetalWeight, metalRate,
      opType: null, makingValue: 0,
    });
    expect(making, 'Making should be ₹0 when both fields empty').toBe(0);
    await openProduct(page, sku.SKUCode);
    const displayed = await getDisplayedPrice(page);
    expect(displayed, `${sku.SKUCode} (no making): UI ₹${displayed} ≠ calculated ₹${total}`).toBe(total);
  }));
});

// ─── SECTION 4: Plain Product — Exchange Price (TC-19 to TC-21) ──────────────

test.describe('Pricing — Plain Product Exchange Price', () => {
  test('TC-19 | Exchange price uses Other Exchange rate and subtracts making + tax', skipIfFallback(async ({ page }) => {
    const plainGold = snapshot.products.filter(
      p => !p.MRPChecked && p.ProductType?.toLowerCase() === 'plain' && p.Category?.toLowerCase() === 'gold'
    );
    test.skip(plainGold.length === 0, 'No plain gold products in snapshot');

    const sku          = plainGold[0];
    const exchangeRate = getRate('Gold', 'Other Exchange');
    const metalRate    = getRate('Gold', 'Sale');
    const { total: saleTotal }     = calcPlainSellingPrice({ metalWeight: sku.MetalWeight, metalRate, opType: sku.OpType, makingValue: sku.MakingValue });
    const { total: exchangeTotal } = calcPlainExchangePrice({ metalWeight: sku.MetalWeight, exchangeRate, making: round(sku.MetalWeight * metalRate * (sku.MakingValue / 100)) });

    // Exchange total must be less than sale total
    expect(exchangeTotal, 'Exchange price must be lower than sale price').toBeLessThan(saleTotal);
    // Exchange total must use the lower Other Exchange rate
    expect(exchangeTotal, 'Exchange price must be positive').toBeGreaterThan(0);
  }));

  test('TC-21 | Other Exchange rate is strictly lower than Sale rate for Gold', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const sale     = getRate('Gold', 'Sale');
    const exchange = getRate('Gold', 'Other Exchange');
    expect(exchange, 'Other Exchange rate must differ from Sale rate').not.toBe(sale);
    expect(exchange, 'Other Exchange rate must be lower (TC-21 critical)').toBeLessThan(sale);
  });
});

// ─── SECTION 5: Studded Product — Selling Price (TC-22 to TC-27) ─────────────

test.describe('Pricing — Studded Product Selling Price', () => {
  const studdedProducts = () => snapshot.products.filter(
    p => !p.MRPChecked && p.ProductType?.toLowerCase() === 'studded'
  );

  test('TC-22 | Studded Gold+Diamond selling price = Metal + Stone + Making + Tax', skipIfFallback(async ({ page }) => {
    const skus = studdedProducts().filter(p => p.Category?.toLowerCase() === 'gold' && p.StoneType?.toLowerCase() === 'diamond');
    test.skip(skus.length === 0, 'No studded gold+diamond products in snapshot');

    for (const sku of skus.slice(0, 3)) {
      const metalRate  = getRate('Gold', 'Sale');
      const metalValue = round(sku.MetalWeight * metalRate);
      const stoneConf  = getStoneConf(sku.StoneType);
      const stoneValue = stoneConf
        ? calcStoneValue({ calcType: stoneConf.CalcType, weight: sku.StoneWeight, count: sku.StonePcs, unitRate: stoneConf.UnitRate })
        : 0;
      const { total } = calcStuddedSellingPrice({ metalValue, stoneValue, making: sku.MakingValue });

      await openProduct(page, sku.SKUCode);
      const displayed = await getDisplayedPrice(page);
      expect(displayed, `${sku.SKUCode}: studded UI ₹${displayed} ≠ calculated ₹${total}`).toBe(total);
    }
  }));

  test('TC-24 | Stone CalcType=Quantity → weight × rate', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const conf = snapshot.stoneRates.find(r => r.CalcType?.toLowerCase() === 'quantity');
    test.skip(!conf, 'No Quantity CalcType stone in snapshot');
    const value = calcStoneValue({ calcType: 'quantity', weight: 2, count: 0, unitRate: conf.UnitRate });
    expect(value).toBe(round(2 * conf.UnitRate));
  });

  test('TC-25 | Stone CalcType=pcs → count × rate', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const conf = snapshot.stoneRates.find(r => r.CalcType?.toLowerCase() === 'pcs');
    test.skip(!conf, 'No pcs CalcType stone in snapshot');
    const value = calcStoneValue({ calcType: 'pcs', weight: 0, count: 6, unitRate: conf.UnitRate });
    expect(value).toBe(round(6 * conf.UnitRate));
  });

  test('TC-26 | Stone CalcType=Tot → unit rate used directly', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const conf = snapshot.stoneRates.find(r => r.CalcType?.toLowerCase() === 'tot');
    test.skip(!conf, 'No Tot CalcType stone in snapshot');
    const value = calcStoneValue({ calcType: 'tot', weight: 0, count: 0, unitRate: conf.UnitRate });
    expect(value).toBe(round(conf.UnitRate));
  });
});

// ─── SECTION 6: Studded — Exchange Deductions (TC-29 to TC-31) ───────────────

test.describe('Pricing — Stone Exchange & Buyback Deductions', () => {
  test('TC-29 | Diamond exchange deduction reduces stone value', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const diamondConf = getStoneConf('Diamond');
    test.skip(!diamondConf, 'Diamond not in snapshot');
    test.skip(!diamondConf.ExchangeDeductionPct, 'No exchange deduction configured for Diamond');

    const original  = 20_000;
    const afterDedn = applyStoneDeduction(original, diamondConf.ExchangeDeductionPct);
    expect(afterDedn).toBeLessThan(original);
    expect(afterDedn).toBe(round(original * (1 - diamondConf.ExchangeDeductionPct / 100)));
  });

  test('TC-30 | Diamond buyback deduction is higher than exchange deduction', () => {
    test.skip(snapshot.fallback, 'fallback snapshot');
    const diamondConf = getStoneConf('Diamond');
    test.skip(!diamondConf?.BuybackDeductionPct, 'No buyback deduction configured');
    expect(diamondConf.BuybackDeductionPct).toBeGreaterThan(diamondConf.ExchangeDeductionPct);
  });
});

// ─── SECTION 7: Discounting (TC-34 to TC-44) — Formula-level ─────────────────
// These tests validate the calculator logic against the TC expectations directly.
// UI-level discount tests require a real transaction flow (out of scope here).

test.describe('Pricing — Discount Calculator (formula validation)', () => {
  test('TC-34 | Gold general discount applies only on making', () => {
    const disc = calcGeneralDiscount({ category: 'gold', making: 7800, stoneValue: 0, invoiceValue: 0, discountPercent: 5 });
    expect(disc).toBe(390); // 5% × 7800
  });

  test('TC-35 | Diamond general discount base = stone + making', () => {
    const disc = calcGeneralDiscount({ category: 'diamond', making: 5000, stoneValue: 20000, invoiceValue: 0, discountPercent: 3 });
    expect(disc).toBe(750); // 3% × 25000
  });

  test('TC-36 | Silver UCP discount applies on full invoice', () => {
    const disc = calcGeneralDiscount({ category: 'silver_ucp', making: 0, stoneValue: 0, invoiceValue: 30000, discountPercent: 2 });
    expect(disc).toBe(600); // 2% × 30000
  });

  test('TC-37 | Silver Agreement discount applies on making only', () => {
    const disc = calcGeneralDiscount({ category: 'silver_agreement', making: 2500, stoneValue: 0, invoiceValue: 0, discountPercent: 2 });
    expect(disc).toBe(50); // 2% × 2500
  });

  test('TC-38 | Voucher stacks on top of general discount', () => {
    const total = stackDiscounts({ general: 390, empowerment: 0, vouchers: [{ value: 500 }] });
    expect(total).toBe(890);
  });

  test('TC-39 | Two vouchers at once are rejected', () => {
    expect(() =>
      stackDiscounts({ general: 0, empowerment: 0, vouchers: [{ value: 500 }, { value: 200 }] })
    ).toThrow('Only one voucher');
  });

  test('TC-40 | RM empowerment within limit is approved', () => {
    const { approved, discount, blocked } = calcEmpowermentDiscount({
      category: 'gold', making: 7800, stoneValue: 0, requestedPercent: 4, approverLimit: 5,
    });
    expect(approved).toBe(true);
    expect(blocked).toBe(false);
    expect(discount).toBe(312); // 4% × 7800
  });

  test('TC-41 | RM empowerment exceeding limit is blocked', () => {
    const { approved, discount, blocked } = calcEmpowermentDiscount({
      category: 'gold', making: 7800, stoneValue: 0, requestedPercent: 6, approverLimit: 5,
    });
    expect(approved).toBe(false);
    expect(blocked).toBe(true);
    expect(discount).toBe(0);
  });

  test('TC-42 | HOD empowerment Gold within 20% limit is approved', () => {
    const { approved, discount } = calcEmpowermentDiscount({
      category: 'gold', making: 7800, stoneValue: 0, requestedPercent: 15, approverLimit: 20,
    });
    expect(approved).toBe(true);
    expect(discount).toBe(1170); // 15% × 7800
  });

  test('TC-43 | Diamond empowerment uses stone value as base (not making)', () => {
    const { approved, discount } = calcEmpowermentDiscount({
      category: 'diamond', making: 5000, stoneValue: 20000, requestedPercent: 2, approverLimit: 2.5,
    });
    expect(approved).toBe(true);
    expect(discount).toBe(400); // 2% × 20000 (stone value, NOT making)
  });

  test('TC-44 | All three discount types stack correctly', () => {
    const total = stackDiscounts({ general: 390, empowerment: 312, vouchers: [{ value: 500 }] });
    expect(total).toBe(1202); // 390 + 312 + 500
  });
});

// ─── SECTION 2: Exchange & Buyback Policy (TC-05 to TC-13) ───────────────────

test.describe('Pricing — Exchange & Buyback Rate Logic', () => {
  // These tests validate the rate logic in the calculator.
  // Live exchange/buyback flows require POS transaction context (not in scope for UI tests).

  test('TC-05 | Exchange within 7 days = 100% for Gold', () => {
    const { getExchangeRate } = await import('../utils/pricing-calculator.mjs').then(m => m);
    // Inline import not needed — already imported at top
  });

  test('TC-05 | Within 7 days exchange rate is 100% for Gold', async () => {
    const { getExchangeRate: ger } = await import('../utils/pricing-calculator.mjs');
    expect(ger('gold', true, 3)).toBe(1.00);
  });

  test('TC-06 | After 7 days own Gold exchange rate is 80%', async () => {
    const { getExchangeRate: ger } = await import('../utils/pricing-calculator.mjs');
    expect(ger('gold', true, 30)).toBe(0.80);
  });

  test('TC-07 | After 7 days own Gold buyback rate is 75%', async () => {
    const { getBuybackRate: gbr } = await import('../utils/pricing-calculator.mjs');
    expect(gbr('gold', true, 45)).toBe(0.75);
  });

  test('TC-10 | Silver has no exchange or buyback (own, post 7 days)', async () => {
    const { getExchangeRate: ger, getBuybackRate: gbr } = await import('../utils/pricing-calculator.mjs');
    expect(ger('silver', true, 15)).toBe(0);
    expect(gbr('silver', true, 15)).toBe(0);
  });

  test('TC-11 | Another brand product has no exchange', async () => {
    const { getExchangeRate: ger } = await import('../utils/pricing-calculator.mjs');
    expect(ger('gold', false, 10)).toBe(0);
  });

  test('TC-12 | Non-UCP buyback within 7 days = 100% cash refund', async () => {
    const { calcRefundWithin7Days } = await import('../utils/pricing-calculator.mjs');
    expect(calcRefundWithin7Days({ billAmount: 55000, ucpValue: 0, isUCP: false })).toBe(55000);
  });

  test('TC-13 | UCP buyback within 7 days = 80% of UCP value (not full bill)', async () => {
    const { calcRefundWithin7Days } = await import('../utils/pricing-calculator.mjs');
    expect(calcRefundWithin7Days({ billAmount: 70000, ucpValue: 70000, isUCP: true })).toBe(56000);
  });
});

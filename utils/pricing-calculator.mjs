/**
 * Pricing Calculator — pure functions mirroring TC-01 through TC-44.
 * No browser, no DB, no side-effects. All values in INR (₹).
 * Weights in grams, stones in carats unless noted.
 */

const DEFAULT_TAX = 0.03; // GST 3% — consistent across all TCs

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Round to nearest rupee (matches how the PDP displays prices). */
export function round(value) {
  return Math.round(value);
}

// ─── SECTION 1: UCP Classification (TC-01 to TC-04) ─────────────────────────

/**
 * Classify a product as UCP or Non-UCP and find the active price record.
 *
 * TC-01: mrpChecked=true + today within From–To  → isUCP, activeRecord set
 * TC-02: mrpChecked=true + today outside range   → isUCP, activeRecord null
 * TC-03: mrpChecked=false                        → isUCP=false
 * TC-04: Platinum with mrpChecked=true           → treated same as TC-01
 *
 * @param {Object} sku          - product from DB snapshot
 * @param {boolean} sku.mrpChecked
 * @param {Array}  sku.priceRecords  - [{ price, fromDate, toDate }]
 * @param {Date}   today
 * @returns {{ isUCP: boolean, activeRecord: Object|null }}
 */
export function classifyProduct(sku, today = new Date()) {
  if (!sku.mrpChecked) return { isUCP: false, activeRecord: null };

  const active = (sku.priceRecords ?? []).find(r => {
    const from = new Date(r.fromDate);
    const to   = new Date(r.toDate);
    return today >= from && today <= to;
  }) ?? null;

  return { isUCP: true, activeRecord: active };
}

// ─── SECTION 2: Exchange & Buyback (TC-05 to TC-13) ──────────────────────────

// Rates as a matrix — metal → ownership → window → rate
const EXCHANGE_MATRIX = {
  gold:     { own: { within7: 1.00, after7: 0.80 }, other: { within7: 0, after7: 0 } },
  diamond:  { own: { within7: 1.00, after7: 0.80 }, other: { within7: 0, after7: 0 } },
  silver:   { own: { within7: 0,    after7: 0    }, other: { within7: 0, after7: 0 } },
  platinum: { own: { within7: 1.00, after7: 0.80 }, other: { within7: 0, after7: 0 } },
};
const BUYBACK_MATRIX = {
  gold:     { own: { within7: 1.00, after7: 0.75 }, other: { within7: 0, after7: 0 } },
  diamond:  { own: { within7: 1.00, after7: 0.75 }, other: { within7: 0, after7: 0 } },
  silver:   { own: { within7: 0,    after7: 0    }, other: { within7: 0, after7: 0 } },
  platinum: { own: { within7: 1.00, after7: 0.75 }, other: { within7: 0, after7: 0 } },
};

/**
 * TC-05 to TC-11: Exchange rate (0–1). 0 = no exchange allowed.
 * daysSincePurchase: exact integer days since original purchase date.
 */
export function getExchangeRate(metal, isOwnProduct, daysSincePurchase) {
  const key    = metal?.toLowerCase() ?? '';
  const window = daysSincePurchase <= 7 ? 'within7' : 'after7';
  const owner  = isOwnProduct ? 'own' : 'other';
  return EXCHANGE_MATRIX[key]?.[owner]?.[window] ?? 0;
}

/**
 * TC-07 to TC-10: Buyback rate (0–1).
 */
export function getBuybackRate(metal, isOwnProduct, daysSincePurchase) {
  const key    = metal?.toLowerCase() ?? '';
  const window = daysSincePurchase <= 7 ? 'within7' : 'after7';
  const owner  = isOwnProduct ? 'own' : 'other';
  return BUYBACK_MATRIX[key]?.[owner]?.[window] ?? 0;
}

/**
 * TC-12/TC-13: Cash refund within 7 days.
 *   Non-UCP → 100% of original bill.
 *   UCP     → 80% of UCP value (NOT the full bill).
 */
export function calcRefundWithin7Days({ billAmount, ucpValue, isUCP }) {
  return isUCP ? round(0.80 * ucpValue) : round(billAmount);
}

// ─── SECTION 3: Plain Product — Selling Price (TC-14 to TC-18) ───────────────

/**
 * TC-14/TC-15/TC-17/TC-18: Calculate making charges.
 *
 * opType:
 *   'percentage' → metalValue × (makingValue / 100)   [TC-14, wastage %]
 *   'weight'     → metalWeight × makingValue           [TC-15, per-gram rate]
 *   'total'      → makingValue as-is                   [TC-17, fixed unit]
 *   null/empty   → 0                                   [TC-18, both empty]
 *
 * TC-16: discountPercent > 0 reduces making before adding to sub-total.
 */
export function calcMaking({ metalValue = 0, metalWeight = 0, opType, makingValue = 0, discountPercent = 0 }) {
  let making = 0;
  switch ((opType ?? '').toLowerCase()) {
    case 'percentage': making = metalValue  * (makingValue / 100); break;
    case 'weight':     making = metalWeight * makingValue;         break;
    case 'total':      making = makingValue;                       break;
    default:           making = 0;                                 break;
  }
  if (discountPercent > 0) making = making * (1 - discountPercent / 100);
  return round(making);
}

/**
 * TC-14 to TC-18: Final selling price for a plain product.
 * Returns a breakdown object so individual components can be asserted.
 */
export function calcPlainSellingPrice({
  metalWeight,
  metalRate,
  opType,
  makingValue = 0,
  discountPercent = 0,
  taxRate = DEFAULT_TAX,
}) {
  const metalValue = round(metalWeight * metalRate);
  const making     = calcMaking({ metalValue, metalWeight, opType, makingValue, discountPercent });
  const subTotal   = round(metalValue + making);
  const tax        = round(subTotal * taxRate);
  return {
    metalValue,
    making,
    subTotal,
    tax,
    total: round(subTotal + tax),
  };
}

// ─── SECTION 4: Plain Product — Exchange Price (TC-19 to TC-21) ──────────────

/**
 * TC-19/TC-20: Final exchange price for a plain product.
 *
 * TC-20: absoluteDiscount > 0 → only 75% of it counts on exchange side.
 * TC-21: caller MUST use exchangeRate from MetalRates where RateType = 'Other Exchange'.
 *        Passing the Sale rate here is the bug this test catches.
 */
export function calcPlainExchangePrice({
  metalWeight,
  exchangeRate,
  making,
  absoluteDiscount = 0,
  taxRate = DEFAULT_TAX,
}) {
  const metalValue    = round(metalWeight * exchangeRate);
  const discountShare = round(0.75 * absoluteDiscount); // TC-20: 75% of absolute discount
  const taxOnMaking   = round(making * taxRate);
  const total         = round(metalValue + discountShare - making - taxOnMaking);
  return { metalValue, discountShare, taxOnMaking, total };
}

// ─── SECTION 5: Studded Product — Selling Price (TC-22 to TC-27) ─────────────

/**
 * TC-24/TC-25/TC-26: Stone value based on CalcType.
 *
 * 'quantity' → weight × unitRate    [TC-24]
 * 'pcs'      → count  × unitRate    [TC-25]
 * 'tot'      → unitRate as-is       [TC-26, no multiplication]
 */
export function calcStoneValue({ calcType, weight = 0, count = 0, unitRate = 0 }) {
  switch ((calcType ?? '').toLowerCase()) {
    case 'quantity': return round(weight * unitRate);
    case 'pcs':      return round(count  * unitRate);
    case 'tot':      return round(unitRate);
    default:         return 0;
  }
}

/**
 * TC-22/TC-23: Final selling price for a studded product.
 * TC-23: discountPercent applies only to making, NOT to metal or stone.
 */
export function calcStuddedSellingPrice({
  metalValue,
  stoneValue,
  making,
  discountPercent = 0,
  taxRate = DEFAULT_TAX,
}) {
  const discountedMaking = round(making * (1 - discountPercent / 100));
  const subTotal         = round(metalValue + stoneValue + discountedMaking);
  const tax              = round(subTotal * taxRate);
  return {
    metalValue,
    stoneValue,
    making: discountedMaking,
    subTotal,
    tax,
    total: round(subTotal + tax),
  };
}

// ─── SECTION 6: Studded — Exchange & Buyback (TC-28 to TC-33) ────────────────

/**
 * TC-29/TC-30/TC-31: Apply deduction percentage to a stone/diamond value.
 * Buyback deduction % is typically higher than exchange (TC-30 vs TC-29).
 */
export function applyStoneDeduction(stoneValue, deductionPercent) {
  return round(stoneValue * (1 - deductionPercent / 100));
}

/**
 * TC-28/TC-32: Final exchange price for a studded product.
 * TC-32: absoluteDiscount → only 75% applied (same rule as plain, TC-20).
 */
export function calcStuddedExchangePrice({
  metalValue,
  stoneValue,
  making,
  absoluteDiscount = 0,
  taxRate = DEFAULT_TAX,
}) {
  const discountShare = round(0.75 * absoluteDiscount);
  const taxOnMaking   = round(making * taxRate);
  const total         = round(metalValue + stoneValue + discountShare - making - taxOnMaking);
  return { metalValue, stoneValue, discountShare, taxOnMaking, total };
}

// ─── SECTION 7: Discounting (TC-34 to TC-44) ─────────────────────────────────

/**
 * TC-34 to TC-37: General discount amount by category.
 *
 * Discount base rules:
 *   gold             → making only              [TC-34]
 *   diamond          → diamond value + making   [TC-35]
 *   silver_ucp       → full invoice value       [TC-36]
 *   silver_agreement → making only              [TC-37]
 */
export function calcGeneralDiscount({
  category,
  making = 0,
  stoneValue = 0,
  invoiceValue = 0,
  discountPercent,
}) {
  let base = 0;
  switch ((category ?? '').toLowerCase()) {
    case 'gold':             base = making;                break;
    case 'diamond':          base = stoneValue + making;   break;
    case 'silver_ucp':       base = invoiceValue;          break;
    case 'silver_agreement': base = making;                break;
    default:                 base = making;                break;
  }
  return round(base * (discountPercent / 100));
}

/**
 * TC-40 to TC-43: Empowerment discount with limit enforcement.
 *   Gold/Silver → discount base is making
 *   Diamond     → discount base is stone value (TC-43)
 *
 * Returns { approved, discount, blocked }
 * TC-41: requestedPercent > approverLimit → blocked=true, discount=0
 */
export function calcEmpowermentDiscount({
  category,
  making = 0,
  stoneValue = 0,
  requestedPercent,
  approverLimit,
}) {
  if (requestedPercent > approverLimit) {
    return { approved: false, discount: 0, blocked: true };
  }
  const base = (category ?? '').toLowerCase() === 'diamond' ? stoneValue : making;
  return {
    approved: true,
    discount: round(base * (requestedPercent / 100)),
    blocked:  false,
  };
}

/**
 * TC-38/TC-39/TC-44: Stack all discount types.
 *
 * Rules:
 *   - Max ONE voucher per transaction (TC-39).
 *   - Voucher stacks on top of general discount (TC-38).
 *   - All three types stack together (TC-44).
 *
 * @param {number}   general      - general discount amount
 * @param {number}   empowerment  - empowerment discount amount
 * @param {Array}    vouchers     - [{ value: number }] — max 1 element
 * @throws if more than 1 voucher is provided
 */
export function stackDiscounts({ general = 0, empowerment = 0, vouchers = [] }) {
  if (vouchers.length > 1) {
    throw new Error('TC-39: Only one voucher allowed per transaction');
  }
  const voucherAmount = vouchers[0]?.value ?? 0;
  return round(general + empowerment + voucherAmount);
}

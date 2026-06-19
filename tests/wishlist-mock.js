/**
 * Wishlist API mock harness (no OTP, no real session).
 *
 * The wishlist is login-gated and persisted server-side, which a stubbed SPA
 * session can't satisfy (the real /follow API 401s). To exercise the FRONTEND
 * behaviour of the wishlist page (rendering, counts, OOS/empty/error states,
 * responsive layout) without a real OTP login, we:
 *   1. fake /session as authenticated (installAuthedSessionContext), and
 *   2. fulfil the /follow endpoints with controlled payloads here.
 *
 * IMPORTANT: this is *frontend* coverage — it verifies how the UI renders/handles
 * wishlist responses, NOT that the real backend persists. Tests built on it are
 * labelled [mock] and must not be read as real end-to-end persistence.
 *
 * Endpoints (captured live):
 *   GET /service/application/catalog/v1.0/follow/products/?page_id=*&page_size=15
 *   GET /service/application/catalog/v1.0/follow/ids/?collection_type=products
 */
// Real Reliance Jewels product images (read from the live catalogue) so mocked
// wishlist cards render actual jewellery — same as manual testing — instead of a
// grey placeholder. Rotated by uid so a multi-item wishlist looks varied.
const REAL_IMAGES = [
  'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/products/pictures/item/free/original/WnDmv9tF6-18K-S-RING.webp',
  'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/products/pictures/item/free/original/EBDzYUEFh-14K-S-RING.jpeg',
  'https://cdn.pixelbin.io/v2/yellow-queen-0c3fa9/gly4zC/wrkr/sngz5/products/pictures/item/free/original/reliance-jewels/2GCHNRF21DJB800YPG/0/G7Z1qIRB6S-IrBdJOmRv-22-karat-gold-chain-large_28ff2b6dbe60ccf89509e5ba00010122.jpg',
];
const imageFor = (uid) => REAL_IMAGES[Math.abs(Number(uid) || 0) % REAL_IMAGES.length];
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Build a Fynd-shaped wishlist product (verified to render on /wishlist). */
export function wlProduct(uid, name, opts = {}) {
  const { eff = 45000, marked = 50000, sellable = true, brand = 'Reliance Jewels', image } = opts;
  const url = image || imageFor(uid);
  const media = [{ type: 'image', url }];
  return {
    uid, slug: `${slugify(name)}-${uid}`, name, item_type: 'set', sellable,
    brand: { name: brand, uid: 1 },
    medias: media, media,
    price: {
      effective: { min: eff, max: eff, currency_symbol: '₹' },
      marked: { min: marked, max: marked, currency_symbol: '₹' },
    },
  };
}

/** N generic in-stock products (uid 9000+i). */
export function wlProducts(n) {
  return Array.from({ length: n }, (_, i) => wlProduct(9000 + i, `Wishlist Item ${i + 1}`, { eff: 40000 + i * 100, marked: 45000 + i * 100 }));
}

/**
 * Install the wishlist mock on a context.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {object[]} products  items the wishlist should contain
 * @param {object}   opts      { status=200, delayMs=0 } for the /follow/products GET
 */
export async function installWishlistMock(context, products = [], opts = {}) {
  const { status = 200, delayMs = 0, addStatus = 200 } = opts;
  // Stateful: DELETE removes from the served list so the page reflects removals
  // (in addition to the SPA's optimistic update); POST can simulate a limit error.
  const state = { items: [...products] };

  await context.route('**/catalog/v1.0/follow/ids/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { products: state.items.map((p) => p.uid) } }) }));

  await context.route('**/catalog/v1.0/follow/products/**', async (route) => {
    const m = route.request().method();
    if (m === 'DELETE') {
      const uid = Number((route.request().url().match(/products\/(\d+)\//) || [])[1]);
      state.items = state.items.filter((p) => p.uid !== uid);
      // Fynd FollowPostResponse shape ({ message, id }) — the SPA needs `id`,
      // else it treats the removal as failed and shows "Something went wrong".
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Item removed from wishlist', id: String(uid) }) });
    }
    if (m === 'POST') {
      const uid = Number((route.request().url().match(/products\/(\d+)\//) || [])[1]);
      if (addStatus >= 400) return route.fulfill({ status: addStatus, contentType: 'application/json', body: JSON.stringify({ message: 'Wishlist is full' }) });
      return route.fulfill({ status: addStatus, contentType: 'application/json', body: JSON.stringify({ message: 'Item added to wishlist', id: String(uid) }) });
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    if (status >= 400) return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) });
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: state.items, page: { current: 1, has_next: false, item_total: state.items.length, type: 'number' } }),
    });
  });
}

/** Abort the wishlist fetch to simulate a network failure / offline. */
export async function installWishlistNetworkFailure(context) {
  await context.route('**/catalog/v1.0/follow/products/**', (route) => route.abort('failed'));
  await context.route('**/catalog/v1.0/follow/ids/**', (route) => route.abort('failed'));
}

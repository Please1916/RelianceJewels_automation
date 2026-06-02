import { PlpPage } from './PlpPage.js';

/**
 * Page Object for a Collection Listing Page (CLP) at /collection/<slug>.
 *
 * The live storefront renders collections with the SAME `a.product-wrapper`
 * cards as the PLP (so filters/sort/cards/pagination are inherited from
 * PlpPage). The PRD's hover-panel design (image+tag only → slide-in detail
 * panel → "Discover More" CTA) is NOT implemented — see CLP-007/008/009/011.
 *
 * Default collection `reliance-jewels` has > one page of products, so it
 * exercises pagination (CLP-026).
 */
export class ClpPage extends PlpPage {
  constructor(page, collection = 'reliance-jewels') {
    super(page);
    this.collection = collection;
    // PRD card-design signals (do not exist on the live site):
    this.discoverMore = page.getByText('Discover More', { exact: false });
  }

  async goto() {
    await this.page.goto('/collection/' + this.collection, { waitUntil: 'domcontentloaded' });
    await this.cards.first().waitFor({ state: 'visible', timeout: 30000 });
  }
}

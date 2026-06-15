import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('https://reliancejewels.snghostz5.de/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(5000);

// Scroll through entire page to trigger lazy loading
for (let y = 0; y <= 15000; y += 600) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(300);
}
await p.waitForTimeout(3000);

// Get ALL top-level sections with their class/id
const sections = await p.evaluate(() => {
  const els = document.querySelectorAll('section, [class*="section"], [class*="wrapper"]:not(.modal-wrapper):not(.overlay-wrapper)');
  const results = [];
  const seen = new Set();
  for (const el of els) {
    const cls = el.className || '';
    const id = el.id || '';
    const tag = el.tagName.toLowerCase();
    const key = `${tag}.${cls.split(' ')[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rect = el.getBoundingClientRect();
    const h2 = el.querySelector('h2, h3, .title, .section-title');
    results.push({
      tag, cls: cls.substring(0, 80), id,
      h2: h2?.innerText?.substring(0, 60) || '',
      visible: rect.width > 0 && rect.height > 0,
      childCount: el.children.length,
    });
    if (results.length > 80) break;
  }
  return results;
});

// Check specific known-name elements
const specifics = {
  // Top header
  topBarGoldRate: await p.locator('p.top-bar-gold-rate').isVisible().catch(()=>false),
  callBackLink: await p.locator('a[href="/c/callback"]').isVisible().catch(()=>false),
  locateStore: await p.locator('p.locate-store-link').isVisible().catch(()=>false),
  myAccount: await p.locator('p.my-account-section').isVisible().catch(()=>false),
  gsvText: await p.locator('p:has-text("GSV")').first().isVisible().catch(()=>false),

  // Subheader
  logo: await p.locator('img[alt="Brand Logo"]').isVisible().catch(()=>false),
  searchTrigger: await p.locator('button.header-search-icon-trigger').isVisible().catch(()=>false),
  wishlist: await p.locator('div#view-wishlist').isVisible().catch(()=>false),
  cart: await p.locator('div.cart-bag-icon-wrapper').isVisible().catch(()=>false),
  goldenSteps: await p.locator('button.btn-golden-steps').isVisible().catch(()=>false),
  bookAppt: await p.locator('a.btn-book-appointment').isVisible().catch(()=>false),

  // Nav
  l1Count: await p.locator('li.l1-category').count(),
  l1Texts: await p.locator('li.l1-category').allInnerTexts().then(t=>t.map(x=>x.trim())).catch(()=>[]),
  l2: await p.locator('li.l2-category').count(),

  // Content sections (scroll to find)
  fourImageBanner: await p.locator('section.four-image-banner').isVisible().catch(()=>false),
  swarnaBanner: await p.locator('div.gss-swarna-banner').isVisible().catch(()=>false),
  topCollection: await p.locator('div.top-collection-wrapper').isVisible().catch(()=>false),
  topCollectionCards: await p.locator('div.top-collection-wrapper').locator('.collection-card, .collection-item, [class*="collection"]').count().catch(()=>0),

  // Try to find specific sections by their likely class names
  shopByCat: await p.locator('[class*="shop-by-cat"], [class*="shopbycat"], [class*="category-section"]').first().isVisible().catch(()=>false),
  shopByCatSelector: await p.locator('[class*="shop-by-cat"], [class*="shopbycat"], [class*="category-section"]').first().getAttribute('class').catch(()=>'not found'),

  diamondSection: await p.locator('[class*="diamond"]').first().isVisible().catch(()=>false),
  diamondSelector: await p.locator('[class*="diamond"]').first().getAttribute('class').catch(()=>'not found'),

  exclusiveLook: await p.locator('[class*="exclusive"], [class*="hotspot"], [class*="focal"]').first().isVisible().catch(()=>false),
  exclusiveSelector: await p.locator('[class*="exclusive"], [class*="hotspot"], [class*="focal"]').first().getAttribute('class').catch(()=>'not found'),

  discoverProducts: await p.locator('[class*="discover"]').first().isVisible().catch(()=>false),
  discoverSelector: await p.locator('[class*="discover"]').first().getAttribute('class').catch(()=>'not found'),

  miniPlp: await p.locator('[class*="mini-plp"], [class*="miniplp"]').first().isVisible().catch(()=>false),
  miniPlpSelector: await p.locator('[class*="mini-plp"], [class*="miniplp"]').first().getAttribute('class').catch(()=>'not found'),

  shopTheLook: await p.locator('[class*="shop-the-look"], [class*="jewels-tube"], [class*="video"]').first().isVisible().catch(()=>false),
  shopTheLookSelector: await p.locator('[class*="shop-the-look"], [class*="jewels-tube"], [class*="video"]').first().getAttribute('class').catch(()=>'not found'),

  gifting: await p.locator('[class*="gifting"], [class*="gift"]').first().isVisible().catch(()=>false),
  giftingSelector: await p.locator('[class*="gifting"], [class*="gift"]').first().getAttribute('class').catch(()=>'not found'),

  shopByGender: await p.locator('[class*="gender"], [class*="shop-by-gender"]').first().isVisible().catch(()=>false),
  shopByGenderSelector: await p.locator('[class*="gender"], [class*="shop-by-gender"]').first().getAttribute('class').catch(()=>'not found'),

  purrSilver: await p.locator('[class*="purr"], [class*="silver"]').first().isVisible().catch(()=>false),
  purrSelector: await p.locator('[class*="purr"], [class*="silver"]').first().getAttribute('class').catch(()=>'not found'),

  topSelling: await p.locator('[class*="top-sell"], [class*="bestsell"], [class*="trending"]').first().isVisible().catch(()=>false),
  topSellingSelector: await p.locator('[class*="top-sell"], [class*="bestsell"], [class*="trending"]').first().getAttribute('class').catch(()=>'not found'),

  platinum: await p.locator('[class*="platinum"]').first().isVisible().catch(()=>false),
  platinumSelector: await p.locator('[class*="platinum"]').first().getAttribute('class').catch(()=>'not found'),

  testimonials: await p.locator('[class*="testimonial"]').first().isVisible().catch(()=>false),
  testimonialsSelector: await p.locator('[class*="testimonial"]').first().getAttribute('class').catch(()=>'not found'),

  blog: await p.locator('[class*="blog"], [class*="article"]').first().isVisible().catch(()=>false),
  blogSelector: await p.locator('[class*="blog"], [class*="article"]').first().getAttribute('class').catch(()=>'not found'),

  social: await p.locator('[class*="social"], [class*="instagram"], [class*="insta"]').first().isVisible().catch(()=>false),
  socialSelector: await p.locator('[class*="social"], [class*="instagram"], [class*="insta"]').first().getAttribute('class').catch(()=>'not found'),

  // Book Appt + Gold section lower on page
  bookApptSection: await p.locator('[class*="appointment"], [class*="book-appt"]').first().isVisible().catch(()=>false),
  bookApptSectionSelector: await p.locator('[class*="appointment"], [class*="book-appt"]').first().getAttribute('class').catch(()=>'not found'),

  goldScheme: await p.locator('[class*="gold-scheme"], [class*="goldscheme"], [class*="golden-harvest"]').first().isVisible().catch(()=>false),
  goldSchemeSelector: await p.locator('[class*="gold-scheme"], [class*="goldscheme"], [class*="golden-harvest"]').first().getAttribute('class').catch(()=>'not found'),

  // Footer
  footer: await p.locator('footer').isVisible().catch(()=>false),
  footerLinkCount: await p.locator('footer a[href]').count(),
  footerLinkSample: await p.locator('footer a[href]').first().getAttribute('href').catch(()=>''),

  // Static text at bottom
  staticText: await p.locator('[class*="static-text"], [class*="statictext"], [class*="seo-text"]').first().isVisible().catch(()=>false),
  staticTextSelector: await p.locator('[class*="static-text"], [class*="statictext"], [class*="seo-text"]').first().getAttribute('class').catch(()=>'not found'),
};

// Also get full body HTML to scan for section patterns (first 8000 chars)
const bodyText = await p.evaluate(() => document.body.innerHTML.substring(0, 12000));

console.log('=== SPECIFICS ===');
console.log(JSON.stringify(specifics, null, 2));
console.log('=== SECTIONS (first 40) ===');
console.log(JSON.stringify(sections.slice(0, 40), null, 2));
console.log('=== BODY SAMPLE ===');
console.log(bodyText.substring(0, 6000));

await b.close();

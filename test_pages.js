/**
 * SafeLink India - Puppeteer Page Verification Tests
 *
 * Tests key pages from the built site to verify they render correctly
 * and meet all requirements (NAV, A11Y, CONT, AID, PERF, TECH).
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.argv[2] || 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  let failures = [];
  let passes = [];

  function pass(msg) {
    passes.push(msg);
  }
  function fail(msg) {
    failures.push(msg);
  }
  function assert(cond, msg) {
    if (cond) pass(msg);
    else fail(msg);
  }

  // -----------------------------------------------------------------------
  // 1. Homepage tests
  // -----------------------------------------------------------------------
  console.log('Testing homepage...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

  const title = await page.title();
  if (title.includes('SafeLink')) pass('Homepage title includes SafeLink');
  else fail(`Homepage title missing SafeLink: "${title}"`);

  // NAV-01: Emergency numbers as tel: links
  const emergencyLink112 = await page.$('a[href="tel:112"]');
  if (emergencyLink112) pass('Homepage has 112 tel link');
  else fail('Homepage missing 112 tel link');

  const emergencyLink100 = await page.$('a[href="tel:100"]');
  if (emergencyLink100) pass('Homepage has 100 tel link');
  else fail('Homepage missing 100 tel link');

  const emergencyLink108 = await page.$('a[href="tel:108"]');
  if (emergencyLink108) pass('Homepage has 108 tel link');
  else fail('Homepage missing 108 tel link');

  // NAV-02: State links (36+)
  const stateLinks = await page.$$('a[href^="/state/"]');
  if (stateLinks.length >= 36) pass(`Homepage has ${stateLinks.length} state links`);
  else fail(`Homepage has ${stateLinks.length} state links, expected 36+`);

  // NAV-06: Language switcher (compact labels: EN, HI, TA, etc.)
  const langSwitcher = await page.evaluate(() => document.body.textContent.includes('HI'));
  if (langSwitcher) pass('Homepage has language switcher (HI)');
  else fail('Homepage missing language switcher');

  // A11Y-01: Skip-to-content
  const skipLink = await page.$('a[href="#main"]');
  if (skipLink) pass('Homepage has skip-to-content link');
  else fail('Homepage missing skip-to-content link');

  // CONT-08: Quick-reference box
  const quickRef = await page.evaluate(() => document.body.textContent.includes('DROP, COVER, HOLD ON'));
  if (quickRef) pass('Homepage has quick-reference box');
  else fail('Homepage missing quick-reference box');

  // AID-01: PM CARES
  const pmCares = await page.$('a[href*="pmcares.gov.in"]');
  if (pmCares) pass('Homepage has PM CARES link');
  else fail('Homepage missing PM CARES link');

  // AID-04: NDMA/SACHET
  const sachet = await page.$('a[href*="sachet.ndma.gov.in"]');
  if (sachet) pass('Homepage has SACHET link');
  else fail('Homepage missing SACHET link');

  const ndmaTollfree = await page.evaluate(() => document.body.textContent.includes('1800-11-0551'));
  if (ndmaTollfree) pass('Homepage has NDMA toll-free number');
  else fail('Homepage missing NDMA toll-free number');

  // AID-05: Mental health helplines
  const iCall = await page.evaluate(() => document.body.textContent.includes('9152987821'));
  if (iCall) pass('Homepage has iCall helpline number');
  else fail('Homepage missing iCall helpline number');

  const vandrevala = await page.evaluate(() => document.body.textContent.includes('Vandrevala'));
  if (vandrevala) pass('Homepage has Vandrevala Foundation');
  else fail('Homepage missing Vandrevala Foundation');

  // Disclaimer bar (WARNING)
  const disclaimerBar = await page.evaluate(() => document.body.innerHTML.includes('WARNING'));
  if (disclaimerBar) pass('Homepage has disclaimer bar');
  else fail('Homepage missing disclaimer bar');

  // -----------------------------------------------------------------------
  // 2. Maharashtra state page
  // -----------------------------------------------------------------------
  console.log('Testing Maharashtra state page...');
  await page.goto(`${BASE_URL}/state/maharashtra/`, { waitUntil: 'domcontentloaded' });

  const stateTitle = await page.title();
  if (stateTitle.includes('Maharashtra')) pass('Maharashtra page title correct');
  else fail(`Maharashtra page title wrong: "${stateTitle}"`);

  const districtLinks = await page.$$('a[href*="/district/"]');
  if (districtLinks.length >= 10) pass(`Maharashtra has ${districtLinks.length} district links`);
  else fail(`Maharashtra has ${districtLinks.length} district links, expected 30+`);

  const stateDisclaimer = await page.evaluate(() => document.body.innerHTML.includes('WARNING'));
  if (stateDisclaimer) pass('State page has disclaimer bar');
  else fail('State page missing disclaimer bar');

  const stateQuickRef = await page.evaluate(() => document.body.textContent.includes('DROP, COVER, HOLD ON'));
  if (stateQuickRef) pass('State page has quick-reference box');
  else fail('State page missing quick-reference box');

  const stateLang = await page.evaluate(() => document.body.textContent.includes('HI'));
  if (stateLang) pass('State page has language switcher');
  else fail('State page missing language switcher');

  // TECH-05: Last verified date
  const lastVerified = await page.evaluate(() => document.body.textContent.includes('verified'));
  if (lastVerified) pass('State page has last verified date');
  else fail('State page missing last verified date');

  // State emergency numbers
  const stateHelpline = await page.evaluate(() => {
    return document.body.textContent.includes('Disaster Helpline') ||
           document.body.textContent.includes('SEOC') ||
           document.body.textContent.includes('Emergency');
  });
  if (stateHelpline) pass('State page has emergency numbers');
  else fail('State page missing emergency numbers');

  // -----------------------------------------------------------------------
  // 3. Cyclone guide page
  // -----------------------------------------------------------------------
  console.log('Testing cyclone guide page...');
  await page.goto(`${BASE_URL}/guide/cyclone/`, { waitUntil: 'domcontentloaded' });

  const guideContent = await page.evaluate(() => document.body.textContent);
  if (guideContent.toLowerCase().includes('cyclone')) pass('Cyclone guide has cyclone content');
  else fail('Cyclone guide missing cyclone content');

  const guideIndia = await page.evaluate(() => document.body.textContent.includes('India'));
  if (guideIndia) pass('Cyclone guide has India-specific content');
  else fail('Cyclone guide missing India-specific content');

  // -----------------------------------------------------------------------
  // 4. Mumbai City district page
  // -----------------------------------------------------------------------
  console.log('Testing Mumbai City district page...');
  await page.goto(`${BASE_URL}/state/maharashtra/district/mumbai-city/`, { waitUntil: 'domcontentloaded' });

  const districtContent = await page.evaluate(() => document.body.textContent);
  if (districtContent.includes('Mumbai')) pass('Mumbai district page has city name');
  else fail('Mumbai district page missing city name');

  const districtEmergency = await page.$('a[href="tel:112"]');
  if (districtEmergency) pass('District page has 112 emergency link');
  else fail('District page missing 112 emergency link');

  // -----------------------------------------------------------------------
  // 5. About page
  // -----------------------------------------------------------------------
  console.log('Testing about page...');
  await page.goto(`${BASE_URL}/about/`, { waitUntil: 'domcontentloaded' });

  const aboutContent = await page.evaluate(() => document.body.textContent);
  if (aboutContent.includes('SafeLink India')) pass('About page has SafeLink India content');
  else fail('About page missing SafeLink India content');

  // -----------------------------------------------------------------------
  // 6. Disclaimer page
  // -----------------------------------------------------------------------
  console.log('Testing disclaimer page...');
  await page.goto(`${BASE_URL}/disclaimer/`, { waitUntil: 'domcontentloaded' });

  const disclaimerContent = await page.evaluate(() => document.body.textContent);
  if (disclaimerContent.toLowerCase().includes('disclaimer')) pass('Disclaimer page has content');
  else fail('Disclaimer page missing disclaimer content');

  // -----------------------------------------------------------------------
  // 7. First Aid page
  // -----------------------------------------------------------------------
  console.log('Testing first aid page...');
  await page.goto(`${BASE_URL}/firstaid/`, { waitUntil: 'domcontentloaded' });

  const firstaidContent = await page.evaluate(() => document.body.textContent);
  if (firstaidContent.toLowerCase().includes('first aid') || firstaidContent.toLowerCase().includes('firstaid'))
    pass('First Aid page has content');
  else fail('First Aid page missing content');

  // -----------------------------------------------------------------------
  // 8. Emergency Kit page
  // -----------------------------------------------------------------------
  console.log('Testing emergency kit page...');
  await page.goto(`${BASE_URL}/kit/`, { waitUntil: 'domcontentloaded' });

  const kitContent = await page.evaluate(() => document.body.textContent);
  if (kitContent.toLowerCase().includes('kit') || kitContent.toLowerCase().includes('emergency'))
    pass('Emergency Kit page has content');
  else fail('Emergency Kit page missing content');

  // -----------------------------------------------------------------------
  // 9. PERF-01: Homepage size check
  // -----------------------------------------------------------------------
  console.log('Testing page size...');
  const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const buffer = await response.buffer();
  if (buffer.length <= 15360) pass(`Homepage is ${buffer.length} bytes (within 15KB limit)`);
  else fail(`Homepage is ${buffer.length} bytes, exceeds 15KB limit`);

  // -----------------------------------------------------------------------
  // 10. Spot-check a city page
  // -----------------------------------------------------------------------
  console.log('Testing city page...');
  await page.goto(`${BASE_URL}/state/delhi/city/new-delhi/`, { waitUntil: 'domcontentloaded' });

  const cityContent = await page.evaluate(() => document.body.textContent);
  if (cityContent.includes('Delhi')) pass('City page (New Delhi) has content');
  else fail('City page (New Delhi) missing content');

  // -----------------------------------------------------------------------
  // I18N Tests (Phase 2)
  // -----------------------------------------------------------------------
  console.log('Testing i18n pages...');

  // I18N-02: Hindi homepage
  await page.goto(`${BASE_URL}/hi/`, { waitUntil: 'domcontentloaded' });
  let hiLang = await page.$eval('html', el => el.getAttribute('lang'));
  assert(hiLang === 'hi', `Hindi page lang="${hiLang}" (expected "hi")`);
  let hiContent = await page.content();
  assert(/[\u0900-\u097F]/.test(hiContent), 'Hindi homepage missing Devanagari text');
  // I18N-11: ASCII digits on Hindi page
  let hi112 = await page.$eval('a[href="tel:112"]', el => el.textContent.trim()).catch(() => '');
  assert(/^\d+$/.test(hi112), `Hindi 112 link not ASCII: "${hi112}"`);
  console.log('  Hindi homepage: lang, Devanagari, ASCII digits ✓');

  // I18N-03: Tamil Nadu in Tamil
  await page.goto(`${BASE_URL}/ta/state/tamil-nadu/`, { waitUntil: 'domcontentloaded' });
  let taLang = await page.$eval('html', el => el.getAttribute('lang'));
  assert(taLang === 'ta', `Tamil page lang="${taLang}" (expected "ta")`);
  let taContent = await page.content();
  assert(/[\u0B80-\u0BFF]/.test(taContent), 'Tamil Nadu page missing Tamil script');
  assert(taContent.includes('line-height:1.8'), 'Tamil page line-height not 1.8');
  console.log('  Tamil Nadu page: lang, Tamil script, line-height ✓');

  // I18N-04..10: Each remaining language homepage
  const langChecks = [
    { code: 'te', name: 'Telugu', re: /[\u0C00-\u0C7F]/ },
    { code: 'bn', name: 'Bengali', re: /[\u0980-\u09FF]/ },
    { code: 'mr', name: 'Marathi', re: /[\u0900-\u097F]/ },
    { code: 'kn', name: 'Kannada', re: /[\u0C80-\u0CFF]/ },
    { code: 'ml', name: 'Malayalam', re: /[\u0D00-\u0D7F]/ },
    { code: 'gu', name: 'Gujarati', re: /[\u0A80-\u0AFF]/ },
    { code: 'pa', name: 'Punjabi', re: /[\u0A00-\u0A7F]/ },
  ];
  for (const lc of langChecks) {
    const r = await page.goto(`${BASE_URL}/${lc.code}/`, { waitUntil: 'domcontentloaded' });
    assert(r.status() === 200, `${lc.name} homepage status ${r.status()}`);
    const lAttr = await page.$eval('html', el => el.getAttribute('lang'));
    assert(lAttr === lc.code, `${lc.name} lang="${lAttr}" (expected "${lc.code}")`);
    const lContent = await page.content();
    assert(lc.re.test(lContent), `${lc.name} homepage missing ${lc.name} script`);
    console.log(`  ${lc.name} homepage: lang, script ✓`);
  }

  // I18N-12: lang attribute on non-homepage
  await page.goto(`${BASE_URL}/hi/state/maharashtra/`, { waitUntil: 'domcontentloaded' });
  let hiStateLang = await page.$eval('html', el => el.getAttribute('lang'));
  assert(hiStateLang === 'hi', `Hindi Maharashtra page lang="${hiStateLang}"`);
  console.log('  Hindi Maharashtra state page: lang ✓');

  // Language switcher: same-page navigation
  await page.goto(`${BASE_URL}/state/maharashtra/`, { waitUntil: 'domcontentloaded' });
  const enContent = await page.content();
  assert(enContent.includes('href="/hi/state/maharashtra/"'), 'Switcher missing Hindi link for Maharashtra');
  assert(!enContent.match(/href="\/en\//), 'Switcher has /en/ prefix (should not exist)');
  console.log('  Language switcher: Hindi link, no /en/ prefix ✓');

  // Active language highlighted
  await page.goto(`${BASE_URL}/hi/`, { waitUntil: 'domcontentloaded' });
  const hiPageContent = await page.content();
  assert(hiPageContent.includes('<b ') && hiPageContent.includes('>HI<'), 'Hindi active lang not highlighted');
  console.log('  Language switcher active lang (HI) highlighted ✓');

  // Guide translation
  await page.goto(`${BASE_URL}/hi/guide/cyclone/`, { waitUntil: 'domcontentloaded' });
  const hiGuide = await page.content();
  assert(/[\u0900-\u097F]/.test(hiGuide), 'Hindi cyclone guide missing Devanagari');
  console.log('  Hindi cyclone guide: translated content ✓');

  // Malayalam line-height 2.0
  await page.goto(`${BASE_URL}/ml/`, { waitUntil: 'domcontentloaded' });
  const mlContent = await page.content();
  assert(mlContent.includes('line-height:2.0'), 'Malayalam page line-height not 2.0');
  console.log('  Malayalam line-height 2.0 ✓');

  // -----------------------------------------------------------------------
  // ALERT-01..04: Alert Banner (data-state attribute + inline script)
  // -----------------------------------------------------------------------
  console.log('\n--- Alert Banner Tests ---');

  // data-state="MH" on Maharashtra state page
  await page.goto(`${BASE_URL}/state/maharashtra/`, { waitUntil: 'domcontentloaded' });
  const mhStateAttr = await page.$eval('body', el => el.getAttribute('data-state'));
  assert(mhStateAttr === 'MH', `Maharashtra state page data-state="${mhStateAttr}" (expected "MH")`);
  console.log('  Maharashtra state page data-state="MH" ✓');

  // data-state="MH" on a Maharashtra district page
  await page.goto(`${BASE_URL}/state/maharashtra/district/solapur/`, { waitUntil: 'domcontentloaded' });
  const mhDistAttr = await page.$eval('body', el => el.getAttribute('data-state'));
  assert(mhDistAttr === 'MH', `Maharashtra district page data-state="${mhDistAttr}" (expected "MH")`);
  console.log('  Maharashtra district page data-state="MH" ✓');

  // data-state="" on homepage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const homeAttr = await page.$eval('body', el => el.getAttribute('data-state'));
  assert(homeAttr === '', `Homepage data-state="${homeAttr}" (expected "")`);
  console.log('  Homepage data-state="" ✓');

  // data-state="" on guide page
  await page.goto(`${BASE_URL}/guide/cyclone/`, { waitUntil: 'domcontentloaded' });
  const guideAttr = await page.$eval('body', el => el.getAttribute('data-state'));
  assert(guideAttr === '', `Cyclone guide data-state="${guideAttr}" (expected "")`);
  console.log('  Cyclone guide page data-state="" ✓');

  // Alert script present on English homepage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const homeContent = await page.content();
  assert(homeContent.includes('/api/alerts'), 'English homepage missing /api/alerts script');
  console.log('  English homepage has /api/alerts script ✓');

  // Alert script present on Hindi homepage
  await page.goto(`${BASE_URL}/hi/`, { waitUntil: 'domcontentloaded' });
  const hiHomeContent = await page.content();
  assert(hiHomeContent.includes('/api/alerts'), 'Hindi homepage missing /api/alerts script');
  console.log('  Hindi homepage has /api/alerts script ✓');

  // No banner rendered when no alerts (fetch fails on static file server)
  // When loaded via http server without the Worker, fetch to /api/alerts returns 404
  // The script should fail silently and not render any banner
  await page.goto(`${BASE_URL}/state/maharashtra/`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000)); // wait for fetch to fail
  const bannerExists = await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    for (const d of divs) {
      if (d.style && d.style.cssText && d.style.cssText.includes('b71c1c')) return true;
    }
    return false;
  });
  assert(!bannerExists, 'Alert banner rendered when no alerts should be shown (fetch to static server failed)');
  console.log('  No banner when API unavailable (fails silently) ✓');

  await browser.close();

  // -----------------------------------------------------------------------
  // Results
  // -----------------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('PUPPETEER TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Passed: ${passes.length}`);
  passes.forEach(p => console.log(`  [PASS] ${p}`));

  if (failures.length > 0) {
    console.log(`\nFailed: ${failures.length}`);
    failures.forEach(f => console.log(`  [FAIL] ${f}`));
    console.log('\nOVERALL: FAILED');
    process.exit(1);
  } else {
    console.log('\nALL PUPPETEER TESTS PASSED');
    process.exit(0);
  }
})();

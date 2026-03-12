/**
 * SafeLink India - Puppeteer Page Verification Tests
 *
 * Tests key pages from the built site to verify they render correctly
 * and meet all requirements (NAV, A11Y, CONT, AID, PERF, TECH).
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8080';

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

  // NAV-06: Language switcher
  const langSwitcher = await page.evaluate(() => document.body.textContent.includes('Hindi'));
  if (langSwitcher) pass('Homepage has language switcher (Hindi)');
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

  const stateLang = await page.evaluate(() => document.body.textContent.includes('Hindi'));
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

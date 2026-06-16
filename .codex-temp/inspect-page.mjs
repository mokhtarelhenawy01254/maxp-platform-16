import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3001/apps');
  await page.waitForLoadState('networkidle');
  const title = await page.title();
  const url = page.url();
  const snapshot = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyText: document.body.innerText.slice(0, 2000),
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
    links: Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => ({ text: a.innerText, href: a.href })),
    buttons: Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => b.innerText)
  }));
  await page.screenshot({ path: 'H:\\maxp-platform\\.codex-temp\\screenshot.png', fullPage: true });
  console.log(JSON.stringify(snapshot, null, 2));
  await browser.close();
})();

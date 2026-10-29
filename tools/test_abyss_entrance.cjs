const fs = require('fs'), path = require('path'), assert = require('assert');
const {chromium} = require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({channel: 'msedge'});
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.route('https://preview.test/**', route => {
        const file = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//, '') || 'index.html');
        return fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({path: file}) : route.fulfill({status: 404, body: ''});
      });
      await page.goto('https://preview.test');
      await page.waitForFunction(() => window.SZO_READY);
      await page.evaluate(async () => {await loadScriptGroupOnce('page_map'); await renderStageMapPage(); closeDrawer();});
      await page.locator('#mapStageSearch').fill('381');
      await page.locator('#mapStageChoices button').first().click();
      await page.locator('#mapImage').evaluate(img => img.decode());
      assert.equal(await page.locator('.mapExitDirection').count(), 4);
      assert((await page.locator('.mapExitDirection').first().innerText()).includes('往低鳴裂口'));
      assert(await page.locator('.mapExitDirection').first().evaluate(el => {
        const a = el.getBoundingClientRect(), b = el.closest('.mapImageStage').getBoundingClientRect();
        return a.left >= b.left && a.top >= b.top && a.right <= b.right && a.bottom <= b.bottom;
      }));
      await page.screenshot({path: path.join(root, `outputs/abyss-entrance-${width}.png`), fullPage: true});
      await page.close();
      console.log(`PASS entrance arrows ${width}`);
    }
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});

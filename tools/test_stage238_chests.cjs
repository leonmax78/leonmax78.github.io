const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, webkit } = require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
async function run(engine, mobile) {
  const browser = await engine.launch(engine === chromium ? { channel: 'msedge' } : {});
  try {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.MAP_BASE || 'https://preview.test';
    if (!process.env.MAP_BASE) await page.route(base + '/**', route => {
      const file = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//, '') || 'index.html');
      return fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: '' });
    });
    await page.goto(base);
    await page.waitForFunction(() => window.SZO_READY);
    await page.waitForTimeout(1800);
    await page.evaluate(async () => { await loadScriptGroupOnce('page_map'); await renderStageMapPage(); closeDrawer(); });
    await page.locator('#mapStageSearch').fill('238');
    await page.locator('#mapStageChoices button').filter({ hasText: '通寶花園' }).click();
    await page.locator('[data-map-panel="chest"]').waitFor();
    assert.equal(await page.locator('input[data-map-chest]').count(), 11);
    assert.equal(await page.locator('input[data-map-monster]').count(), 0);
    await page.locator('[data-map-all="chest"]').click();
    assert.equal(await page.locator('.mapDot[data-map-monster-dot]').count(), 39);
    await page.locator('[data-map-none="monster"]').click();
    assert.equal(await page.locator('.mapDot[data-map-monster-dot]').count(), 39);
    await page.waitForFunction(() => [...document.querySelectorAll('.mapOverlay img')].every(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: path.join(root, `outputs/stage238-chests-${mobile ? 'mobile' : 'desktop'}.png`) });
    await page.locator('[data-map-none="chest"]').click();
    assert.equal(await page.locator('.mapDot[data-map-monster-dot]').count(), 0);
    await page.locator('input[data-map-chest]').first().check();
    assert((await page.locator('.mapDot[data-map-monster-dot]').count()) > 0);
    await page.locator('#mapSearchInput').fill('通寶院麗寶箱');
    assert.equal(await page.locator('.mapDot[data-map-monster-dot]').count(), 4);
    await page.locator('[data-map-clear-search]').click();
    await page.locator('#mapStageSearch').fill('001');
    await page.locator('#mapStageChoices button').first().click();
    assert.equal(await page.locator('[data-map-panel="chest"]').count(), 0);
    assert(await page.locator('input[data-map-monster]').count() > 0);
    assert.deepEqual(errors, []);
    console.log(`${mobile ? 'Mobile' : 'Desktop'}: independent chest controls, 39 rendered icons, search and other maps passed.`);
  } finally { await browser.close(); }
}
(async () => { await run(chromium, false); await run(webkit, true); })().catch(error => { console.error(error); process.exit(1); });

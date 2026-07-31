const { chromium } = require('playwright');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const jobs = [
  { html: 'scripts/fig_architecture.html', out: 'docs/figures/architecture.png' },
  { html: 'scripts/fig_discernment.html',  out: 'docs/figures/discernment.png'  },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 2 }); // retina crispness
  for (const j of jobs) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('file://' + path.join(ROOT, j.html));
    await page.waitForTimeout(300);
    const el = await page.$('#frame');
    const box = await el.boundingBox();
    await el.screenshot({ path: path.join(ROOT, j.out) });
    console.log(`${j.out}  ${Math.round(box.width)}x${Math.round(box.height)} css px (2x rendered)`);
    await page.close();
  }
  await browser.close();
})();

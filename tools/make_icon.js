// Render tools/icon.html in headless Chromium and write the Android launcher
// icon foreground PNGs (adaptive icon, 108dp at every density).
// Usage: (from the repository root, with a static server on port 8766)
//   python3 -m http.server 8766 &   node tools/make_icon.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(e.message));
  await page.goto('http://localhost:8766/tools/icon.html');
  await page.waitForFunction(() => window.iconData, null, { timeout: 60000 });
  const data = await page.evaluate(() => window.iconData);
  const out = path.join(__dirname, 'icon-foreground-432.png');
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', out);
  await browser.close();
})();

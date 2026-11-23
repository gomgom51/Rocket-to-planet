// Render tools/icon.html in headless Chromium and write the Android launcher
// icon foreground PNGs (adaptive icon, 108dp at every density).
// Usage: (from the repository root, with a static server on port 8766)
//   python3 -m http.server 8766 &   node tools/make_icon.js
// SIZE=768 node tools/make_icon.js renders the bigger version used by
// tools/make_web_icons.py for the browser version.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(e.message));
  const size = Number(process.env.SIZE) || 432;
  await page.goto(`http://localhost:8766/tools/icon.html?size=${size}`);
  await page.waitForFunction(() => window.iconData, null, { timeout: 60000 });
  const data = await page.evaluate(() => window.iconData);
  const out = path.join(__dirname, `icon-foreground-${size}.png`);
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', out);
  await browser.close();
})();

const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const W = +process.argv[2], H = +process.argv[3], TAG = process.argv[4];
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  const pg = await b.newPage();
  const M = W < 820;
  await pg.setViewport({ width: W, height: H, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 2 : 1 });
  await pg.goto('http://127.0.0.1:8767/?jump=0&nolenis', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  const r = await pg.evaluate(() => { const s = document.querySelector('.stack'); const t = s.getBoundingClientRect().top + scrollY; return [t, s.offsetHeight]; });
  const cards = 4, stepPx = r[1] / cards;
  for (let k = 0; k < cards; k++) {
    // the moment card k has just settled at the top of the stack
    const y = Math.round(r[0] + k * stepPx - 40);
    await pg.evaluate(yy => window.scrollTo(0, yy), y);
    await new Promise(res => setTimeout(res, 1600));
    await pg.screenshot({ path: `verify/${TAG}_card${k + 1}.png` });
  }
  await b.close(); console.log('ok');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

/* Click through every drink in the hero and screenshot it in place. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900), TAG = process.argv[4] || 'cup';
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: W, height: H, isMobile: W < 820, hasTouch: W < 820, deviceScaleFactor: W < 820 ? 2 : 1 });
  if (W < 820) await pg.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:8767/?jump=0', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  for (let i = 0; i < 5; i++) {
    await pg.evaluate(k => document.querySelector('.dchip[data-go="' + k + '"]').click(), i);
    await new Promise(r => setTimeout(r, 1500));
    await pg.screenshot({ path: 'verify/' + TAG + '_' + (i + 1) + '.png' });
  }
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

/* Verify the LIVE page, not the local server — a different authority than the one that built it. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const URL = 'https://stationonemain-source.github.io/the-fix-norman/';
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  for (const [w, h, tag] of [[1440, 900, 'live_d'], [390, 844, 'live_m']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: w < 820, hasTouch: w < 820 });
    if (w < 820) await pg.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36');
    const errs = [], bad = [];
    pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
    pg.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await pg.goto(URL + '?jump=0', { waitUntil: 'networkidle0', timeout: 90000 });
    await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    await pg.screenshot({ path: 'verify/' + tag + '_hero.png' });
    const info = await pg.evaluate(() => ({
      h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
      cups: Array.from(document.querySelectorAll('.slot img')).map(i => i.naturalWidth + 'x' + i.naturalHeight),
      title: document.title
    }));
    console.log(tag, JSON.stringify(info));
    console.log(tag, 'errors:', errs.length ? errs.join(' | ') : 'none', '| failed requests:', bad.length ? bad.join(' | ') : 'none');
    await pg.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

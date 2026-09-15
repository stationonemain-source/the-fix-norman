/* Capture the page at each chapter, desktop and phone, and report console/page errors.
   Pane screenshots of pinned/sticky sections come out black on this box; this is the reliable path. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const BASE = 'http://127.0.0.1:8767/';
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);
const TAG = process.argv[4] || 'd';
const UA_PHONE = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  const mk = async () => {
    const pg = await b.newPage();
    await pg.setViewport({ width: W, height: H, isMobile: W < 820, hasTouch: W < 820, deviceScaleFactor: 1 });
    if (W < 820) await pg.setUserAgent(UA_PHONE);
    return pg;
  };
  const errs = [];
  const pg = await mk();
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto(BASE + '?jump=0', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  const off = await pg.evaluate(() => {
    const g = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
    return { h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
             story: g('#story'), photos: g('#photos'), menu: g('#menu'), wall: g('.flavor-wall'),
             visitPhoto: g('.visit-photo'), visit: g('#visit'), foot: g('.foot-spacer') };
  });
  console.log(JSON.stringify(off));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  const shots = [['hero', 0], ['story', off.story + 100], ['photos', off.photos + 120],
                 ['board', off.menu + 200], ['wall', Math.max(0, off.wall - 240)],
                 ['visit', Math.max(0, off.visitPhoto - 60)], ['foot', off.foot + 200]];
  for (const [n, y] of shots) {
    const p2 = await mk();
    await p2.goto(BASE + '?jump=' + y, { waitUntil: 'networkidle0', timeout: 90000 });
    await p2.waitForFunction('window.__ready===true', { timeout: 60000 });
    await new Promise(r => setTimeout(r, 1400));
    await p2.screenshot({ path: 'verify/' + TAG + '_' + n + '.png' });
    await p2.close();
    console.log('shot', n, y);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

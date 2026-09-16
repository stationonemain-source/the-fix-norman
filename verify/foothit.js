const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const [,, W, H] = process.argv;
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); const M = +W < 820;
  await pg.setViewport({ width: +W, height: +H, isMobile: M, hasTouch: M });
  await pg.goto('http://127.0.0.1:8767/?nolenis', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  await pg.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await new Promise(r => setTimeout(r, 1500));
  const out = await pg.evaluate(() => [...document.querySelectorAll('.foot a, .arrow')].map(el => {
    const r = el.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + (r.top > innerHeight || r.bottom < 0 ? 'offscreen' : ((t && (t === el || el.contains(t))) ? 'OK' : 'BLOCKED by ' + (t ? t.tagName + '.' + t.className : 'null')));
  }));
  console.log(out.join('\n'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

/* Hit-test: is anything painting over the story copy, and is every interactive
   control actually reachable? A control that cannot be clicked is worse than none. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: W, height: H, isMobile: W < 820, hasTouch: W < 820 });
  if (W < 820) await pg.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36');
  await pg.goto('http://127.0.0.1:8767/?flat', { waitUntil: 'networkidle0', timeout: 90000 });
  await new Promise(r => setTimeout(r, 2500));
  const runAt = async (y) => { await pg.evaluate(yy => window.scrollTo(0, yy), y); await new Promise(r => setTimeout(r, 450)); return pg.evaluate(() => {
    const res = { over: [], unreachable: [] };
    // 1. every paragraph of story copy: is the sticker bomb on top of it?
    document.querySelectorAll('.story-copy p, .quote p, .board-note, .lede').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.width < 10) return;
      for (const [fx, fy] of [[0.1, 0.5], [0.5, 0.5], [0.9, 0.5], [0.9, 0.9]]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const t = document.elementFromPoint(x, y);
        if (t && !el.contains(t) && t !== el) {
          res.over.push({ sel: el.className || el.tagName, i, at: [Math.round(fx * 100), Math.round(fy * 100)], hit: t.tagName + '.' + (t.getAttribute('class') || '') });
        }
      }
    });
    // 2. links and buttons: does a hit test at the centre land inside them?
    document.querySelectorAll('a[href], button').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!t || !(el.contains(t) || t === el || el.closest('a,button') === t.closest('a,button'))) {
        res.unreachable.push({ el: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 34), hit: t ? t.tagName + '.' + (t.getAttribute('class') || '') : 'null' });
      }
    });
    // 3. tap targets under 24px
    res.small = [];
    document.querySelectorAll('a[href], button').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 1 && (r.height < 24 || r.width < 24)) res.small.push([(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28), Math.round(r.width), Math.round(r.height)]);
    });
    return res;
  }); };
  const total = await pg.evaluate(() => document.documentElement.scrollHeight);
  const all = { over: [], unreachable: [], small: [] };
  for (let y = 0; y < total; y += Math.round(H*0.8)) { const r = await runAt(y); all.over.push(...r.over); all.unreachable.push(...r.unreachable); all.small.push(...r.small); }
  const key = o => JSON.stringify(o);
  all.small = Array.from(new Map(all.small.map(s => [key(s), s])).values());
  all.over = Array.from(new Map(all.over.map(s => [key(s), s])).values());
  all.unreachable = Array.from(new Map(all.unreachable.map(s => [key(s), s])).values());
  console.log('height', total);
  console.log(JSON.stringify(all, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

/* Screenshot the fall-menu section settled, desktop and phone, and report overflow + errors.
   node verify/fallshot.js [port] */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const PORT = process.argv[2] || 8767;
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  for (const [W, H, M, tag] of [[1440, 900, false, 'fall_d'], [1920, 1080, false, 'fall_w'], [390, 844, true, 'fall_m'], [360, 780, true, 'fall_s']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: W, height: H, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 2 : 1 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(`http://127.0.0.1:${PORT}/?jump=0&nolenis`, { waitUntil: 'networkidle0', timeout: 90000 });
    await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
    const top = await pg.evaluate(() => document.getElementById('fall').getBoundingClientRect().top + scrollY);
    const hgt = await pg.evaluate(() => document.getElementById('fall').offsetHeight);
    for (let y = top - 72, i = 0; y < top + hgt; y += Math.round(H * 0.8), i++) {
      await pg.evaluate(yy => window.scrollTo(0, yy), y);
      await new Promise(r => setTimeout(r, 1800));
      await pg.screenshot({ path: `verify/${tag}_${i}.png` });
    }
    const rep = await pg.evaluate(() => {
      const out = { sw: document.documentElement.scrollWidth, iw: innerWidth, over: [], small: [], tapSmall: [] };
      document.querySelectorAll('#fall *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > innerWidth + 1) out.over.push(el.className || el.tagName);
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && fs < 12) out.small.push(el.className + ' ' + fs);
      });
      document.querySelectorAll('#fall a').forEach(a => { const r = a.getBoundingClientRect(); if (r.height < 24 || r.width < 24) out.tapSmall.push(a.className); });
      return out;
    });
    console.log(tag, JSON.stringify(rep), 'errors:', errs.length ? errs : 'none');
    await pg.close();
  }
  await b.close();
})();

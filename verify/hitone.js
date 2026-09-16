const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const [,, W, H, SEL] = process.argv;
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); const M = +W < 820;
  await pg.setViewport({ width: +W, height: +H, isMobile: M, hasTouch: M });
  await pg.goto('http://127.0.0.1:8767/?nolenis', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  const out = await pg.evaluate(async (sel) => {
    const res = [];
    for (const el of document.querySelectorAll(sel)) {
      el.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 1300));
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      res.push({ el: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30), size: Math.round(r.width) + 'x' + Math.round(r.height), ok: !!t && (el === t || el.contains(t)), hit: t ? t.tagName + '.' + (t.className || '') : null });
    }
    return res;
  }, SEL);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

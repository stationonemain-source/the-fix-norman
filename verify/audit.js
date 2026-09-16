/* Full-page audit capture: walk the whole page top to bottom in viewport-sized steps at a
   given size and save every frame, so every section is looked at at the size it is seen.
   Also reports overflow, images rendered larger than their files (upscaled = soft), and
   text below 12px.
   node verify/audit.js W H TAG [mobile] */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const W = +process.argv[2], H = +process.argv[3], TAG = process.argv[4], MOBILE = process.argv[5] === 'mobile';
const DPR = MOBILE ? 3 : 1;
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--no-sandbox'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: W, height: H, isMobile: MOBILE, hasTouch: MOBILE, deviceScaleFactor: MOBILE ? 2 : 1 });
  if (MOBILE) await pg.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://127.0.0.1:8767/?jump=0&nolenis', { waitUntil: 'networkidle0', timeout: 90000 });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));
  const total = await pg.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 0; y < total; y += Math.round(H * 0.85)) {
    await pg.evaluate(yy => window.scrollTo(0, yy), y);
    await new Promise(r => setTimeout(r, 2200));
    await pg.screenshot({ path: `verify/${TAG}_${String(i).padStart(2, '0')}.png` });
    i++;
  }
  const report = await pg.evaluate((dpr) => {
    const out = { scrollWidth: document.documentElement.scrollWidth, innerWidth, overflow: [], soft: [], tiny: [] };
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1) && getComputedStyle(el).position !== 'fixed') {
        let p = el.parentElement, clipped = false;
        while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.overflow.push((el.className || el.tagName) + ' right=' + Math.round(r.right));
      }
    });
    document.querySelectorAll('img').forEach(im => {
      const r = im.getBoundingClientRect();
      if (!im.naturalWidth || r.width < 40) return;
      // cover-fit images: the needed pixels are the larger of the two scale factors
      const need = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight) * dpr;
      if (need > 1.25) out.soft.push((im.currentSrc || im.src).split('/').pop().split('?')[0] + ' x' + need.toFixed(2) + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ' from ' + im.naturalWidth + 'x' + im.naturalHeight + ')');
    });
    const seen = new Set();
    document.querySelectorAll('p, span, a, dt, dd, li, small, cite, button, figcaption').forEach(el => {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const r = el.getBoundingClientRect();
      if (fs < 12 && r.width > 0 && el.closest('[aria-hidden="true"]') === null) {
        const k = (el.className || el.tagName) + ' ' + fs + 'px';
        if (!seen.has(k)) { seen.add(k); out.tiny.push(k + ' "' + el.textContent.trim().slice(0, 24) + '"'); }
      }
    });
    return out;
  }, MOBILE ? 2 : 1);
  report.frames = i; report.height = total; report.errors = errs;
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

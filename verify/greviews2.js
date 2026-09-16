/* Open the Google listing, click into Reviews, expand and scroll, dump the text.
   The single-word "Reviews" button is not always present; fall back to the tab whose
   label starts with the rating, and to the review-count link. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 5000));
  const clicked = await pg.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('button, [role="tab"], a'));
    let t = cands.find(x => x.textContent.trim() === 'Reviews');
    if (!t) t = cands.find(x => /^\d+ review/i.test(x.textContent.trim()));
    if (!t) t = cands.find(x => /review/i.test(x.getAttribute('aria-label') || ''));
    if (t) { t.click(); return (t.getAttribute('aria-label') || t.textContent).trim().slice(0, 40); }
    return null;
  });
  console.log('clicked:', clicked);
  await new Promise(r => setTimeout(r, 4000));
  for (let i = 0; i < 40; i++) {
    await pg.evaluate(() => {
      Array.from(document.querySelectorAll('button')).forEach(b => { if (b.textContent.trim() === 'More' && b.getAttribute('aria-expanded') === 'false') b.click(); });
      const feed = document.querySelector('div[role="feed"]');
      if (feed) feed.scrollTop = feed.scrollHeight;
      else document.querySelectorAll('div').forEach(d => { if (d.scrollHeight > d.clientHeight + 80 && d.clientHeight > 300) d.scrollTop = d.scrollHeight; });
    });
    await new Promise(r => setTimeout(r, 800));
  }
  const text = await pg.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    return feed ? feed.innerText : document.body.innerText;
  });
  fs.writeFileSync('photos/raw/reviews.txt', text);
  console.log('chars:', text.length);
  const m = text.match(/([\d.]+)\s*\n\s*([\d,]+)\s+reviews/);
  console.log('rating/count:', m ? m[1] + ' / ' + m[2] : 'not parsed');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

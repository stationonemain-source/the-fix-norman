const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 900 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4000));
  const tab = await pg.evaluate(() => { const els = Array.from(document.querySelectorAll('button, [role="tab"], a')); const t = els.find(x => x.textContent.trim() === 'Reviews' || /^Reviews/.test(x.textContent.trim())); if (t) { t.click(); return t.tagName + ':' + t.textContent.trim().slice(0, 30); } return null; });
  console.log('tab:', tab);
  await new Promise(r => setTimeout(r, 3500));
  for (let i = 0; i < 45; i++) {
    await pg.evaluate(() => { Array.from(document.querySelectorAll('button')).forEach(b => { if (b.textContent.trim() === 'More' && b.getAttribute('aria-expanded') === 'false') b.click(); }); });
    await pg.evaluate(() => { const feed = document.querySelector('div[role="feed"]'); if (feed) feed.scrollTop = feed.scrollHeight; });
    await new Promise(r => setTimeout(r, 800));
  }
  const text = await pg.evaluate(() => { const feed = document.querySelector('div[role="feed"]'); return feed ? feed.innerText : document.body.innerText; });
  fs.writeFileSync('photos/raw/reviews.txt', text);
  console.log('chars:', text.length, 'lines:', text.split('\n').length);
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

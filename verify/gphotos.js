// gphotos.js — open the Google Maps listing headless, walk the owner's photo viewer, collect full-res googleusercontent URLs.
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 900 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4000));
  // accept consent if shown
  try { const btn = await pg.$('button[aria-label*="Accept"]'); if (btn) { await btn.click(); await new Promise(r => setTimeout(r, 2000)); } } catch (e) {}
  const urls = new Set();
  const harvest = async () => { const list = await pg.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => s && s.includes('googleusercontent.com') && !s.includes('/a/') && !s.includes('/a-/'))); list.forEach(u => urls.add(u)); };
  await harvest();
  // open the photo viewer
  const opened = await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /photo/i.test(x.getAttribute('aria-label') || '') || /See photos/i.test(x.textContent)); if (b) { b.click(); return b.getAttribute('aria-label') || b.textContent; } return null; });
  console.log('opened:', opened);
  await new Promise(r => setTimeout(r, 3500));
  await harvest();
  // step through with the next arrow up to 60 times
  for (let i = 0; i < 60; i++) {
    const ok = await pg.evaluate(() => { const n = document.querySelector('button[aria-label="Next photo"], button[aria-label*="Next"]'); if (n) { n.click(); return true; } return false; });
    if (!ok) break;
    await new Promise(r => setTimeout(r, 700));
    await harvest();
  }
  const out = Array.from(urls);
  fs.writeFileSync('photos/raw/urls.json', JSON.stringify(out, null, 1));
  console.log('collected', out.length, 'urls');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

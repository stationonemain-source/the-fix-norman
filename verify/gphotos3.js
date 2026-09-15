const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1500, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4500));
  const urls = new Map();
  const harvest = async (tag) => {
    const list = await pg.evaluate(() => {
      const out = [];
      document.querySelectorAll('img').forEach(i => { if (i.src && i.src.includes('googleusercontent.com') && !i.src.includes('/a/') && !i.src.includes('/a-/')) out.push([i.src, i.naturalWidth||0]); });
      document.querySelectorAll('[style*="googleusercontent"]').forEach(e => {
        const m = (e.getAttribute('style')||'').match(/url\(["']?(https:\/\/[^"')]+googleusercontent[^"')]+)/); if (m) out.push([m[1],0]);
      });
      return out;
    });
    list.forEach(([u]) => { const key = u.split('=')[0]; if (!urls.has(key)) urls.set(key, u); });
  };
  await harvest();
  await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /photo/i.test(x.getAttribute('aria-label') || '')); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 3500));
  await harvest();
  let stuck = 0, last = urls.size;
  for (let i = 0; i < 140; i++) {
    await pg.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 620));
    await harvest();
    if (urls.size === last) { stuck++; } else { stuck = 0; last = urls.size; }
    if (i % 20 === 19) console.log(' step', i + 1, 'urls', urls.size);
    if (stuck > 25) { console.log('no new photos for 25 steps, stopping at', i); break; }
  }
  const out = Array.from(urls.values());
  fs.writeFileSync('photos/raw/urls.json', JSON.stringify(out, null, 1));
  console.log('collected', out.length, 'urls');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 5000));
  const labels = await pg.evaluate(() => Array.from(document.querySelectorAll('[aria-label]'))
    .map(e => e.tagName + '|' + e.getAttribute('aria-label'))
    .filter(s => /review|star|4\.4/i.test(s)).slice(0, 30));
  console.log(JSON.stringify(labels, null, 1));
  const ok = await pg.evaluate(() => {
    const e = Array.from(document.querySelectorAll('[aria-label]'))
      .find(x => /\d+\s*review/i.test(x.getAttribute('aria-label')) && x.getAttribute('aria-label').length < 60);
    if (e) { (e.closest('button, a') || e).click(); return e.getAttribute('aria-label'); }
    return null;
  });
  console.log('clicked:', ok);
  await new Promise(r => setTimeout(r, 4500));
  for (let i = 0; i < 35; i++) {
    await pg.evaluate(() => {
      Array.from(document.querySelectorAll('button')).forEach(b => { if (b.textContent.trim() === 'More' && b.getAttribute('aria-expanded') === 'false') b.click(); });
      const f = document.querySelector('div[role="feed"]'); if (f) f.scrollTop = f.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 800));
  }
  const text = await pg.evaluate(() => { const f = document.querySelector('div[role="feed"]'); return f ? f.innerText : document.body.innerText; });
  fs.writeFileSync('photos/raw/reviews.txt', text);
  console.log('chars:', text.length);
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

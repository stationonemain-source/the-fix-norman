/* Pull The Fix's profile picture (their logo) from their public Facebook page at the
   largest size the page exposes. */
const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.facebook.com/thefixnorman/', { waitUntil: 'networkidle2', timeout: 90000 }).catch(e => console.error(e.message));
  await new Promise(r => setTimeout(r, 5000));
  const found = await pg.evaluate(() => {
    const out = [];
    const og = document.querySelector('meta[property="og:image"]'); if (og) out.push(['og', og.content, 0, 0]);
    document.querySelectorAll('image, img').forEach(i => {
      const u = i.getAttribute('xlink:href') || i.getAttribute('href') || i.src;
      if (u && /fbcdn|scontent/.test(u)) { const r = i.getBoundingClientRect(); out.push([i.tagName, u, Math.round(r.width), Math.round(r.height)]); }
    });
    return out;
  });
  fs.writeFileSync('verify/fblogo.json', JSON.stringify(found, null, 1));
  found.slice(0, 12).forEach(f => console.log(f[0], f[2] + 'x' + f[3], f[1].slice(0, 110)));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

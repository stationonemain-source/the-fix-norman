const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
const [,, url, out, waitMs] = process.argv;
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(e=>console.error('nav', e.message));
  await new Promise(r => setTimeout(r, +(waitMs||4000)));
  for (let i=0;i<6;i++){ await pg.evaluate(()=>window.scrollBy(0,1400)); await new Promise(r=>setTimeout(r,700)); }
  const t = await pg.evaluate(() => document.body.innerText);
  fs.writeFileSync(out, t);
  console.log(out, t.length, 'chars');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

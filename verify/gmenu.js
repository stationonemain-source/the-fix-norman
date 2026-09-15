const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--lang=en-US'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1400, height: 1000 });
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
  await pg.goto('https://www.google.com/maps/search/The+Fix+Energy+and+Nutrition+Lounge+2100+W+Lindsey+St+Norman+OK?hl=en', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4500));
  const tabs = await pg.evaluate(() => Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"], button')).map(x=>x.textContent.trim()).filter(t=>t && t.length<24).slice(0,40));
  console.log('tabs:', JSON.stringify(tabs));
  for (const name of ['Menu','Updates','About','Overview']) {
    const ok = await pg.evaluate((n) => { const t = Array.from(document.querySelectorAll('button, [role="tab"], a')).find(x => x.textContent.trim() === n); if (t) { t.click(); return true; } return false; }, name);
    if (!ok) { console.log('-- no tab', name); continue; }
    await new Promise(r => setTimeout(r, 3500));
    for (let i=0;i<10;i++){ await pg.evaluate(()=>{document.querySelectorAll('div').forEach(d=>{if(d.scrollHeight>d.clientHeight+60&&d.clientHeight>200)d.scrollTop=d.scrollHeight;});}); await new Promise(r=>setTimeout(r,700)); }
    const t = await pg.evaluate(() => document.body.innerText);
    fs.writeFileSync('verify/gm_'+name.toLowerCase()+'.txt', t);
    console.log(name, t.length);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

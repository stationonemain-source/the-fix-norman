const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs=require('fs');
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--lang=en-US'] });
  const pg = await b.newPage();
  await pg.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  await pg.goto('https://www.instagram.com/thefixnorman/', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e=>console.error(e.message));
  await new Promise(r=>setTimeout(r,4000));
  const m = await pg.evaluate(() => {
    const out = {};
    document.querySelectorAll('meta').forEach(x => { const k = x.getAttribute('property')||x.getAttribute('name'); if (k) out[k] = x.getAttribute('content'); });
    out.__bio = document.body.innerText.slice(0, 2000);
    return out;
  });
  fs.writeFileSync('verify/ig_meta.json', JSON.stringify(m,null,1));
  console.log(JSON.stringify({d:m['og:description'], t:m['og:title'], desc:m.description}, null, 1));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});

const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs=require('fs');
(async()=>{
 const b=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-sandbox','--lang=en-US','--disable-blink-features=AutomationControlled']});
 const pg=await b.newPage(); await pg.setViewport({width:1400,height:1000});
 await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
 const urls=new Map();
 for (const u of ['https://www.yelp.com/biz_photos/the-fix-energy-and-nutrition-lounge-norman',
                  'https://www.yelp.com/biz_photos/the-fix-energy-and-nutrition-lounge-norman?start=30',
                  'https://www.yelp.com/biz_photos/the-fix-energy-and-nutrition-lounge-norman?start=60']) {
   try {
     await pg.goto(u,{waitUntil:'domcontentloaded',timeout:60000});
     await new Promise(r=>setTimeout(r,5000));
     for(let i=0;i<5;i++){await pg.evaluate(()=>window.scrollBy(0,1200));await new Promise(r=>setTimeout(r,600));}
     const list=await pg.evaluate(()=>Array.from(document.querySelectorAll('img')).map(i=>i.src).filter(s=>s&&/bphoto/.test(s)));
     list.forEach(x=>urls.set(x.split('/o.jpg')[0].replace(/\/\d+s\.jpg$/,''), x));
     console.log(u.slice(-12), list.length, 'tot', urls.size);
   } catch(e){ console.error('ERR', e.message); }
 }
 fs.writeFileSync('photos/raw/yelp_urls.json', JSON.stringify(Array.from(urls.values()),null,1));
 await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});

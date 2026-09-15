const p = require('C:/Users/Circl/.claude/skills/scroll-film-studio/node_modules/puppeteer-core');
const fs=require('fs');
const [,,url,out]=process.argv;
(async()=>{
 const b=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-sandbox','--lang=en-US']});
 const pg=await b.newPage(); await pg.setViewport({width:1400,height:1000});
 await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
 await pg.goto(url,{waitUntil:'networkidle2',timeout:70000}).catch(e=>console.error(e.message));
 for(let i=0;i<10;i++){await pg.evaluate(()=>window.scrollBy(0,1500));await new Promise(r=>setTimeout(r,700));}
 const list=await pg.evaluate(()=>{
   const s=new Set();
   document.querySelectorAll('img').forEach(i=>{ [i.src,i.dataset.src,i.getAttribute('data-original')].forEach(u=>{if(u&&/^https?:/.test(u))s.add(u);}); });
   document.querySelectorAll('a').forEach(a=>{ if(/\.(jpe?g|png|webp)/i.test(a.href)) s.add(a.href); });
   return Array.from(s);
 });
 fs.writeFileSync(out, JSON.stringify(list,null,1));
 console.log(out, list.length);
 await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});

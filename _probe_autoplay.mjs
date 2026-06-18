import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, normalize } from 'path';

const ROOT = process.cwd();
const MIME = { '.html':'text/html','.js':'text/javascript','.mp3':'audio/mpeg','.css':'text/css','.png':'image/png','.json':'application/json' };
const server = createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]);
    if(p==='/') p='/index.html';
    const fp = normalize(join(ROOT, p));
    if(!fp.startsWith(ROOT)){res.writeHead(403);res.end();return;}
    await stat(fp);
    const data = await readFile(fp);
    res.writeHead(200,{'Content-Type':MIME[extname(fp)]||'application/octet-stream'});
    res.end(data);
  }catch(e){res.writeHead(404);res.end('nf');}
});
await new Promise(r=>server.listen(0,r));
const port = server.address().port;
const base = `http://localhost:${port}`;

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const logs=[];
page.on('console',m=>logs.push('['+m.type()+'] '+m.text()));
page.on('pageerror',e=>logs.push('[pageerror] '+e.message));

await page.goto(base+'/puzzle/index.html', { waitUntil:'domcontentloaded' }).catch(e=>logs.push('goto err '+e.message));
await page.waitForFunction(()=>window.PuzzleVoice && typeof window.PuzzleVoice.playBasicTut==='function', {timeout:8000}).catch(e=>logs.push('no PuzzleVoice: '+e.message));

// CASE A: auto-chained play with NO user gesture (basic_tut_05 / index 4)
const caseA = await page.evaluate(async ()=>{
  return await new Promise((resolve)=>{
    const a = window.PuzzleVoice.playBasicTut(4);
    if(!a){resolve({audio:false}); return;}
    let played=false;
    a.addEventListener('play', ()=>{played=true;}, {once:true});
    a.addEventListener('playing', ()=>{played=true;}, {once:true});
    setTimeout(()=>{
      resolve({ audio:true, played, paused:a.paused, currentTime:a.currentTime, readyState:a.readyState, duration:a.duration, muted:a.muted, volume:a.volume });
    }, 1300);
  });
});

// CASE B: after a real user gesture, then play basic_tut_06 / index 5
// Tap the real title-screen to grant user activation (mimics app entry gesture).
try { await page.click('#title-screen', { timeout: 3000, force: true }); }
catch(_) { try { await page.mouse.click(80, 80); } catch(__) {} }
await page.waitForTimeout(200);
const caseB = await page.evaluate(async ()=>{
  return await new Promise((resolve)=>{
    const a = window.PuzzleVoice.playBasicTut(5);
    if(!a){resolve({audio:false}); return;}
    let played=false;
    a.addEventListener('play', ()=>{played=true;}, {once:true});
    a.addEventListener('playing', ()=>{played=true;}, {once:true});
    setTimeout(()=>{
      resolve({ audio:true, played, paused:a.paused, currentTime:a.currentTime, readyState:a.readyState, duration:a.duration, muted:a.muted, volume:a.volume });
    }, 1300);
  });
});

await browser.close();
server.close();
console.log('=== CASE A: NO gesture, basic_tut_05 (index4) ===');
console.log(JSON.stringify(caseA));
console.log('=== CASE B: AFTER gesture, basic_tut_06 (index5) ===');
console.log(JSON.stringify(caseB));
console.log('=== logs ===');
console.log(logs.join('\n'));

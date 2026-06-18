import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, normalize } from 'path';

const ROOT = process.cwd();
const MIME = { '.html':'text/html','.js':'text/javascript','.mp3':'audio/mpeg','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml','.gif':'image/gif' };
const server = createServer(async (req,res)=>{
  try{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
    const fp=normalize(join(ROOT,p)); if(!fp.startsWith(ROOT)){res.writeHead(403);res.end();return;}
    await stat(fp); const data=await readFile(fp);
    res.writeHead(200,{'Content-Type':MIME[extname(fp)]||'application/octet-stream'}); res.end(data);
  }catch(e){res.writeHead(404);res.end('nf');}
});
await new Promise(r=>server.listen(0,r));
const base=`http://localhost:${server.address().port}`;

const browser=await chromium.launch({headless:true,args:['--autoplay-policy=document-user-activation-required']});
const page=await (await browser.newContext()).newPage();
const logs=[]; const voiceCalls=[];
page.on('console',m=>logs.push('['+m.type()+'] '+m.text()));
page.on('pageerror',e=>logs.push('[pageerror] '+e.message));

await page.goto(base+'/puzzle/index.html',{waitUntil:'domcontentloaded'}).catch(e=>logs.push('goto '+e.message));
await page.waitForFunction(()=>window.PuzzleVoice&&window.PuzzleVoice.playBasicTut,{timeout:10000}).catch(e=>logs.push('noPV '+e.message));

// Real user gesture: tap the title screen to grant user activation + enter app
try{ await page.click('#title-screen',{timeout:4000,force:true}); }catch(_){ try{await page.mouse.click(80,80);}catch(__){} }
await page.waitForTimeout(400);

// Instrument PuzzleVoice.playBasicTut to record which file actually plays + whether audio advances.
await page.evaluate(()=>{
  window.__voiceLog=[];
  const orig=window.PuzzleVoice.playBasicTut;
  window.PuzzleVoice.playBasicTut=function(i){
    const a=orig.call(window.PuzzleVoice,i);
    const rec={index:i, gotAudio:!!a, played:false, ct0:a?a.currentTime:null};
    window.__voiceLog.push(rec);
    if(a){
      a.addEventListener('play',()=>{rec.played=true;},{once:true});
      a.addEventListener('playing',()=>{rec.played=true;},{once:true});
      setTimeout(()=>{ try{rec.ctLater=a.currentTime; rec.paused=a.paused; rec.muted=a.muted; rec.volume=a.volume; rec.duration=a.duration;}catch(_){}} ,900);
    }
    return a;
  };
});

// Drive the real basic practice into the peek phase. We can't easily do the full
// drag, so jump the real flow to startBasicPeekPractice after forcing practice state.
const setup = await page.evaluate(async ()=>{
  try {
    // Need source image + board ready. Start basic practice via the real entry.
    if (typeof showBasicPracticeIfNeeded!=='function') return {err:'no showBasicPracticeIfNeeded (not in scope)'};
    return {ok:true, hasState: !!window.partnerPracticeState};
  } catch(e){ return {err:String(e)}; }
});

await browser.close(); server.close();
console.log('=== setup ==='); console.log(JSON.stringify(setup));
console.log('=== logs ==='); console.log(logs.slice(-20).join('\n'));

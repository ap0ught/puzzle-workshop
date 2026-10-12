// End-to-end browser test for Puzzle Workshop, both editions.
// Remote:  site built with VITE_ROOM_API, worker on :8799, two separate
//          browser contexts (two "devices") play one room.
// Offline: default site build, two pages in ONE context (two tabs of the
//          same profile, shared localStorage) play one room.
import {chromium} from 'playwright';
import {spawn, execFileSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const REPO=fileURLToPath(new URL('..', import.meta.url));
// 5173 is on the allowlist in worker/wrangler.toml (the documented local-dev
// origin), so the E2E exercises the real config, not an override.
const WORKER_PORT=8799, SITE_PORT=5173;
const SITE=`http://127.0.0.1:${SITE_PORT}`;

let failures=0;
const ok=msg=>console.log('ok:   '+msg);
const fail=msg=>{failures++;console.error('FAIL: '+msg);};
const check=(cond,msg)=>cond?ok(msg):fail(msg);

function build(roomApi){
  const env={...process.env};
  if(roomApi)env.VITE_ROOM_API=roomApi;else delete env.VITE_ROOM_API;
  execFileSync('npm',['run','build'],{cwd:REPO,stdio:'inherit',env});
}
function startWorker(){
  const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','worker/wrangler.toml','--port',String(WORKER_PORT),'--ip','127.0.0.1'],{cwd:REPO,stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
  child.dump=()=>out;
  return child;
}
const startSite=()=>spawn('python3',['-m','http.server',String(SITE_PORT),'--directory','docs'],{cwd:REPO,stdio:'ignore'});
async function waitHttp(url,ms=60000){const end=Date.now()+ms;for(;;){try{await fetch(url);return;}catch{}if(Date.now()>end)throw new Error('not ready: '+url);await sleep(300);}}
async function waitUntil(fn,ms,msg){const end=Date.now()+ms;for(;;){try{const v=await fn();if(v)return v;}catch{}if(Date.now()>end)throw new Error('timeout: '+msg);await sleep(200);}}
const watch=(page,arr)=>{page.on('pageerror',e=>arr.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')arr.push('console: '+m.text());});};
const playerPos=page=>page.$$eval('.player',els=>els.map(e=>({id:e.classList.contains('player1')?'player1':'player2',left:e.style.left,top:e.style.top})));

try{
// ================= REMOTE EDITION =================
console.log('== remote edition ==');
build(`http://127.0.0.1:${WORKER_PORT}`);
const worker=startWorker();const site=startSite();
try{
  await waitHttp(`http://127.0.0.1:${WORKER_PORT}/health`);
  await waitHttp(SITE);
  const browser=await chromium.launch();
  try{
    const ctxA=await browser.newContext(),ctxB=await browser.newContext();
    const pageA=await ctxA.newPage(),pageB=await ctxB.newPage();
    const errsA=[],errsB=[];watch(pageA,errsA);watch(pageB,errsB);

    await pageA.goto(SITE);
    check((await pageA.textContent('.joinbox small')).includes('any device'),'lobby announces remote co-op');
    await pageA.fill('input[placeholder="Player name"]','Ada');
    await pageA.click('button:has-text("Create a room")');
    const code=await waitUntil(async()=>{const t=await pageA.textContent('.connection');const m=t.match(/ROOM ([A-Z2-9]{8})/);return m&&m[1];},20000,'create room');
    ok('device A created room '+code);
    check((await pageA.textContent('.connection')).trim().replace(/\s+/g,' ').startsWith('ROOM '+code),'header says ROOM (not LOCAL ROOM) in remote build');

    await pageB.goto(SITE);
    await pageB.fill('input[placeholder="Player name"]','Bo');
    await pageB.fill('input[placeholder="8-character code"]',code);
    await pageB.click('button:has-text("Join room")');
    await waitUntil(async()=>(await playerPos(pageB)).length>=2,15000,'B sees two players');
    await waitUntil(async()=>(await playerPos(pageA)).length>=2,15000,'A sees two players');
    ok('both devices see two players');
    check((await pageA.textContent('.partnerbar')).includes('Bo'),'A shows partner Bo');

    // A moves; B must see it fast enough to be the WebSocket push, not the 15s poll.
    const before=await playerPos(pageB);
    const adaBefore=before.find(p=>p.id==='player1');
    const box=await pageA.$eval('.room',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
    let t0=Date.now(),moved=false;
    for(const[fx,fy]of[[.8,.2],[.15,.35],[.5,.15]]){
      t0=Date.now();
      await pageA.mouse.click(box.x+box.w*fx,box.y+box.h*fy);
      try{
        await waitUntil(async()=>{const p=(await playerPos(pageB)).find(p=>p.id==='player1');return p&&p.left!==adaBefore.left&&p.top!==adaBefore.top;},6000,'A move visible on B');
        moved=true;break;
      }catch{}
    }
    const latency=Date.now()-t0;
    check(moved,'A\'s floor move is visible on device B');
    check(moved&&latency<5000,`B learned of the move in ${latency}ms (WS push, not the 15s poll)`);
    check((await pageA.textContent('.roomLabel')).length>0,'A still in game');

    const bad=[...errsA,...errsB];
    check(bad.length===0,'no console/page errors on either device'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  }finally{await browser.close();}
}finally{site.kill('SIGTERM');worker.kill('SIGTERM');}

// ================= OFFLINE EDITION =================
console.log('== offline edition ==');
build(null);
const site2=startSite();
try{
  await waitHttp(SITE);
  const browser=await chromium.launch();
  try{
    // One context = one browser profile: the two pages share localStorage,
    // which is exactly the documented offline co-op mode.
    const ctx=await browser.newContext();
    const p1=await ctx.newPage(),p2=await ctx.newPage();
    const errs1=[],errs2=[];watch(p1,errs1);watch(p2,errs2);

    await p1.goto(SITE);
    check((await p1.textContent('.joinbox small')).includes('Offline edition'),'lobby announces offline edition');
    await p1.fill('input[placeholder="Player name"]','Ada');
    await p1.click('button:has-text("Create a room")');
    // Local codes are hex (may contain 0/1); worker codes avoid those glyphs.
    const code=await waitUntil(async()=>{const t=await p1.textContent('.connection');const m=t.match(/LOCAL ROOM ([0-9A-F]{8})/);return m&&m[1];},20000,'create local room');
    ok('tab 1 created local room '+code);
    check((await p1.textContent('.connection')).trim().startsWith('LOCAL ROOM '+code),'header says LOCAL ROOM in offline build');

    await p2.goto(SITE);
    await p2.fill('input[placeholder="Player name"]','Bo');
    await p2.fill('input[placeholder="8-character code"]',code);
    await p2.click('button:has-text("Join room")');
    await waitUntil(async()=>(await playerPos(p2)).length>=2,15000,'tab 2 sees two players');
    await waitUntil(async()=>(await playerPos(p1)).length>=2,15000,'tab 1 sees two players');
    ok('both tabs of the same profile see two players');
    check((await p1.textContent('.partnerbar')).includes('Bo'),'tab 1 shows partner Bo');

    const bad=[...errs1,...errs2];
    check(bad.length===0,'no console/page errors in offline mode'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  }finally{await browser.close();}
}finally{site2.kill('SIGTERM');}
}finally{
  // Leave docs/ as the offline build (the committed edition).
  build(null);
}
console.log(failures?`\n${failures} FAILURE(S)`:'\nALL E2E CHECKS PASSED');
process.exit(failures?1:0);

import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
const PORT=8799,HOST='127.0.0.1',BASE=`http://${HOST}:${PORT}`;
// On the allowlist in worker/wrangler.toml; node's WebSocket sends no Origin
// of its own, so the upgrade requests below carry one explicitly.
const ORIGIN='http://localhost:5173';
let output='';
function startWorker(){
 const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','worker/wrangler.toml','--port',String(PORT),'--ip',HOST],{stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 return child;
}
let child=startWorker();
let code='';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function request(method,path,{origin=ORIGIN,body}={}){
 const data=body?JSON.stringify(body):null;
 return new Promise((resolve,reject)=>{
  const req=http.request({host:HOST,port:PORT,method,path,headers:{...(origin?{Origin:origin}:{}),...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},res=>{let buf='';res.on('data',c=>buf+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:()=>buf?JSON.parse(buf):null}));});
  req.on('error',reject);if(data)req.write(data);req.end();
 });
}
function openSocket(token){
 const ws=new WebSocket(`${BASE}/api/room/${code}?token=${encodeURIComponent(token)}`,{headers:{origin:ORIGIN}});
 // A push can land before the test calls next() — the server broadcasts
 // inside the request that caused it, so buffer unsolicited messages.
 const queue=[],waiters=[];let failed=null;
 ws.onmessage=e=>{const m=JSON.parse(e.data),w=waiters.shift();if(w){clearTimeout(w.timer);w.resolve(m);}else queue.push(m);};
 ws.onerror=()=>{if(waiters.length)for(const w of waiters.splice(0)){clearTimeout(w.timer);w.reject(Error('socket error'));}else failed=Error('socket error');};
 const next=timeoutMs=>new Promise((resolve,reject)=>{
  const buffered=queue.shift();if(buffered!==undefined)return resolve(buffered);
  if(failed)return reject(failed);
  const w={timer:setTimeout(()=>{const i=waiters.indexOf(w);if(i>=0)waiters.splice(i,1);reject(Error('timed out waiting for socket message'));},timeoutMs||10000),resolve:resolve,reject:reject};
  waiters.push(w);
 });
 return {ws,next,close:()=>ws.close()};
}
try{
 let end=Date.now()+45000;
 for(;;){try{if((await request('GET','/health')).status===200)break;}catch{}if(Date.now()>end)throw Error('wrangler dev did not become healthy in 45s\n'+output);await sleep(250);}
 const health=await request('GET','/health');assert.equal(health.status,200);assert.equal(health.body().ok,true);
 const blocked=await request('POST','/api/room',{origin:'https://evil.example',body:{type:'create',name:'A'}});assert.equal(blocked.status,403);assert.equal(blocked.body().error,'Origin not allowed.');assert.equal(blocked.headers['access-control-allow-origin'],undefined);
 const preflight=await request('OPTIONS','/api/room');assert.equal(preflight.status,204);assert.equal(preflight.headers['access-control-allow-origin'],ORIGIN);assert.ok(preflight.headers['access-control-allow-methods'].includes('POST'));
 const created=await request('POST','/api/room',{body:{type:'create',name:'Ada'}});assert.equal(created.status,200);
 code=created.body().code;assert.match(code,/[A-HJ-NP-Z2-9]{8}/);
 let tokenA=created.body().token,tokenB;
 assert.ok(tokenA);assert.equal(created.body().player,1);assert.equal(created.body().state.players.length,1);assert.equal(created.body().state.players[0].name,'Ada');assert.equal(created.body().state.players[0].token,undefined);assert.equal(created.headers['access-control-allow-origin'],ORIGIN);
 const seen=await request('GET','/api/room/'+code);assert.equal(seen.status,200);assert.equal(seen.body().state.players[0].token,undefined);
 assert.equal((await request('GET','/api/room/ABC')).status,400);
 const missing=await request('GET','/api/room/ZZZZZZZZ');assert.equal(missing.status,404);assert.equal(missing.body().error,'Room not found.');
 const joined=await request('POST','/api/room/'+code,{body:{type:'join',code,name:'Bo'}});assert.equal(joined.status,200);tokenB=joined.body().token;assert.equal(joined.body().player,2);assert.equal(joined.body().state.players.length,2);assert.equal(joined.body().state.players[1].token,undefined);
 assert.equal((await request('POST','/api/room/'+code,{body:{type:'join',code,name:'Cy'}})).status,409);
 const stale=await request('POST','/api/room/'+code,{body:{type:'move',code,token:'bogus',x:10,y:10}});assert.equal(stale.status,400);assert.equal(stale.body().error,'Player session expired. Rejoin the room.');
 const moved=await request('POST','/api/room/'+code,{body:{type:'move',code,token:tokenA,x:10,y:10}});assert.equal(moved.status,200);assert.equal(moved.body().state.players.find(p=>p.id===1).x,10);
 const a=openSocket(tokenA),first=await a.next();assert.equal(first.type,'state');assert.equal(first.state.players.length,2);
 const b=openSocket(tokenB);await b.next();
 const partnerMove=await request('POST','/api/room/'+code,{body:{type:'move',code,token:tokenB,x:77,y:63}});assert.equal(partnerMove.status,200);
 const pushed=await a.next();assert.equal(pushed.state.players.find(p=>p.id===2).x,77);assert.ok(pushed.state.version>first.state.version);
 const bad=openSocket('bogus');await assert.rejects(bad.next(),/socket error/);
 a.close();b.close();bad.close();
 const custom=await request('POST','/api/room',{body:{type:'create',name:'A',lineup:['gear','pipe','gear']}});
 assert.equal(custom.status,200);
 const customRoom=custom.body();assert.deepEqual(customRoom.state.lineup.map(room=>room.kind),['gear','pipe','gear']);
 assert.equal(new Set(customRoom.state.items.map(item=>item.id)).size,customRoom.state.items.length);
 const customJoin=await request('POST','/api/room/'+customRoom.code,{body:{type:'join',name:'B',lineup:['tent']}});
 assert.equal(customJoin.status,200);assert.deepEqual(customJoin.body().state.lineup,customRoom.state.lineup);
 const customRead=await request('GET','/api/room/'+customRoom.code);
 assert.deepEqual(customRead.body().state.lineup,customRoom.state.lineup);
 for(const lineup of [[],['unknown'],Array(17).fill('pipe')])
  assert.equal((await request('POST','/api/room',{body:{type:'create',lineup}})).status,400);
 const stopped=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await stopped;
 child=startWorker();end=Date.now()+45000;
 for(;;){try{if((await request('GET','/health')).status===200)break;}catch{}if(Date.now()>end)throw Error('restarted worker did not become healthy\n'+output);await sleep(250);}
 const persisted=await request('GET','/api/room/'+customRoom.code);
 assert.equal(persisted.status,200);assert.deepEqual(persisted.body().state.lineup,customRoom.state.lineup);
 assert.equal(persisted.body().state.players.length,2);
 console.log('PASS: worker origin allowlist, code shape, create/join, two-player limit, token masking, stale token, websocket push of partner moves');
 console.log('PASS: worker persists custom duplicate lineup across restart, shares creator selection on join/read, rejects invalid lineups');
}
catch(error){
 console.error(error.message);
 console.error('--- wrangler output ---\n'+output.slice(-4000));
 process.exitCode=1;
}
finally{child.kill('SIGTERM');}

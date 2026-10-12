import assert from 'node:assert/strict';
import {initial,act,check,puzzles,tentSolution,upgrade} from '../src/lib/game.ts';
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];
for(let b=0;b<8;b++){
 assert.ok(s.unlocked.includes(b));const count=s.unlocked.length;
 const pieces=s.items.filter(i=>i.type===puzzles[b].kind).slice(0,b===3?5:b===4?6:b===1?8:9);
 pieces.forEach((it,c)=>{const cell=b===3?tentSolution[c]:c;s[puzzles[b].field][cell]=it.id;it.owner=null;it.cell=b+':'+cell;});
 if(b===0)s.rot.fill(0);if(b===1)s.assembled=true;if(b===2)s.lights.fill(false);
 if(b>=5)s.settings[b]=Array.from({length:9},(_,c)=>puzzles[b].target(c));
 if(b===7)s.settings[7]=[0,2,1,1,2,1,2,2,1];
 const spare=s.items.find(i=>i.type==='wire'&&i.owner===null&&i.cell===null);spare.owner='tray:'+b;
 if(b===0)act(s,'a',{type:'testWater',board:0});else if(b===5){s.settings[5].fill(0);s.settings[5][2]=2;s.settings[5][8]=2;act(s,'a',{type:'testBeam',board:5});}else check(s);
 assert.ok(s.completed.includes(b));assert.ok(s.closed.includes(b));assert.ok(s.solved[b]);
 assert.ok(pieces.every(i=>i.owner==='box'&&i.cell===null&&i.floorRoom===-1));assert.equal(spare.owner,null);assert.equal(spare.floorRoom,-1);
 assert.ok(s[puzzles[b].field].every(v=>v===null));
 assert.equal(s.unlocked.length,Math.min(8,count+1));
 for(const type of ['reset','load','assist','place','use','remove','carry','deliver','stash'])assert.throws(()=>act(s,'a',{type,board:b,cell:0,item:pieces[0].id}),/closed/);
 const announced=s.announcements.slice();check(s);assert.deepEqual(s.announcements,announced);
 if(b===0){act(s,'a',{type:'pickup',item:pieces[0].id});assert.equal(pieces[0].owner,1);act(s,'a',{type:'dropAll',floorRoom:-1});}
}
assert.equal(s.completed.length,8);assert.equal(s.closed.length,8);
assert.ok(s.announcements.some(a=>a.includes('closing')));assert.ok(s.announcements.some(a=>a.includes('solved')));assert.ok(s.announcements.some(a=>a.includes('New room open')));
const old=initial();old.completed=[0];old.pipes[0]='pipe0';old.items[0].cell='0:0';delete old.closed;delete old.announcements;upgrade(old);check(old);assert.ok(old.closed.includes(0));assert.equal(old.items[0].floorRoom,-1);
console.log('PASS: eight solutions close and lock rooms, one unlock each, tray and puzzle items return to main room, all closed-room actions rejected, main-room pickup, idempotent announcements, legacy completion migration');

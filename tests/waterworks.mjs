import assert from 'node:assert/strict';
import {initial,act,check,traceWater} from '../src/lib/game.ts';
const fresh=()=>{const s=initial();s.players=[{id:1,token:'a',name:'A'}];return s;};
const s=fresh();assert.throws(()=>act(s,'a',{type:'testWater',board:0}),/nine sockets/);
for(let c=0;c<9;c++){s.pipes[c]='pipe'+c;s.rot[c]=0;s.items[c].cell='0:'+c;}
check(s);assert.equal(s.completed.length,0,'Correct layout requires Done');
const correct=traceWater(s);assert.ok(correct.passed);assert.deepEqual(correct.path,[0,1,2,5,4,3,6,7,8]);
s.rot[2]=1;assert.ok(!traceWater(s).passed);act(s,'a',{type:'testWater',board:0});assert.ok(!s.waterTest.passed);assert.equal(s.completed.length,0);assert.ok(s.announcements.some(v=>v.includes('leak')));
act(s,'a',{type:'use',board:0,cell:2});assert.equal(s.waterTest,null);s.rot[2]=0;
act(s,'a',{type:'testWater',board:0});assert.ok(s.waterTest.passed);assert.ok(s.closed.includes(0));assert.equal(s.waterTest.pipes.filter(Boolean).length,9);assert.ok(s.items.slice(0,9).every(i=>i.floorRoom===-1));
const walls=fresh();walls.pipes[0]='pipe2';walls.rot[0]=2;const leak=traceWater(walls);assert.equal(leak.passed,false);assert.equal(leak.leak,0);
console.log('PASS: fill gate, explicit Done, connected flow path, leak feedback without closure, rotation clears stale results, successful closure retains animation snapshot, boundary leaks');

const remaining=fresh();remaining.locked[0]=[0];
for(const c of [1,2,3,4,5,6,7]){const it=remaining.items.find(i=>i.id==='pipe'+c);remaining.pipes[c]=it.id;it.cell='0:'+c;}
for(const [id,c] of [['pipe0',8],['pipe8',0]]){remaining.items.find(i=>i.id===id).owner='tray:0';act(remaining,'a',{type:'place',board:0,cell:c,item:id});}
assert.equal(remaining.pipes[8],'pipe0');assert.equal(remaining.pipes[0],'pipe8');assert.deepEqual(remaining.locked[0],[]);
act(remaining,'a',{type:'use',board:0,cell:0});
console.log('PASS: last two tray pipes fit arbitrary empty sockets, legacy pipe locks clear, placed pipes remain rotatable');

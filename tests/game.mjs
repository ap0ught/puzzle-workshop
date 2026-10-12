import assert from 'node:assert/strict';
import {initial,act,check,puzzles,tentSolution,compatible} from '../src/lib/game.ts';
export const fresh=()=>{const s=initial();s.players=[{id:1,token:'a',name:'A',x:50,y:55},{id:2,token:'b',name:'B',x:60,y:55}];return s;};
const s=fresh();assert.deepEqual(s.unlocked,[0,1,2]);
for(let i=0;i<5;i++)act(s,'a',{type:'pickup',item:'pipe'+i});
assert.throws(()=>act(s,'a',{type:'pickup',item:'pipe5'}),/full/);
assert.throws(()=>act(s,'b',{type:'pickup',item:'pipe0'}),/picked/);
act(s,'a',{type:'dropAll',floorRoom:-1});assert.equal(s.items.filter(i=>i.owner===1).length,0);
for(const id of ['pipe0','pipe1','tent0'])act(s,'a',{type:'pickup',item:id});
act(s,'b',{type:'pickup',item:'pipe2'});act(s,'a',{type:'load',board:0});assert.equal(s.pipes.filter(Boolean).length,2);assert.equal(s.items.find(i=>i.id==='tent0').owner,1);assert.equal(s.items.find(i=>i.id==='pipe2').owner,2);
act(s,'a',{type:'reset',board:0});assert.equal(s.pipes.filter(Boolean).length,0);assert.equal(s.items.find(i=>i.id==='pipe0').owner,'tray:0');
assert.throws(()=>act(s,'a',{type:'load',board:3}),/unlock/);
const crowded=fresh();crowded.unlocked.push(4);crowded.items.filter(i=>compatible(4,i)).forEach(i=>i.owner='tray:4');const before=JSON.stringify(crowded.items);assert.throws(()=>act(crowded,'a',{type:'load',board:4}),/free sockets/);assert.equal(JSON.stringify(crowded.items),before);
assert.throws(()=>act(s,'invalid',{type:'dropAll'}),/expired/);
console.log('PASS: inventory cap, competing pickups, pocket loading, partner isolation, unfinished reset, drop all, locked rooms, atomic capacity rejection');

const incomplete=fresh();
act(incomplete,'a',{type:'pickup',item:'pipe0'});act(incomplete,'a',{type:'place',board:0,cell:0,item:'pipe0'});
const rotation=incomplete.rot[0];assert.throws(()=>act(incomplete,'a',{type:'use',board:0,cell:0}),/every required socket/);assert.equal(incomplete.rot[0],rotation);assert.ok(!incomplete.completed.includes(0));
// A five-piece route reaches the outlet; empty sockets must still prevent completion.
incomplete.pipes.fill(null);
for(const [cell,id,rotation] of [[0,'pipe0',0],[1,'pipe1',0],[2,'pipe2',0],[5,'pipe8',1],[8,'pipe5',1]]){incomplete.pipes[cell]=id;incomplete.rot[cell]=rotation;const it=incomplete.items.find(i=>i.id===id);it.owner=null;it.cell='0:'+cell;}
check(incomplete);assert.equal(incomplete.solved[0],false);assert.equal(incomplete.completed.length,0);
console.log('PASS: incomplete sockets block solving controls and connected partial paths cannot complete');

const slider=fresh();act(slider,'a',{type:'pickup',item:'tile0'});act(slider,'a',{type:'place',board:1,cell:7,item:'tile0'});assert.equal(slider.tiles[7],'tile0');
console.log('PASS: slider tiles can fill any available numbered-tile socket');

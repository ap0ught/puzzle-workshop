import assert from 'node:assert/strict';
import {initial,act,check} from '../src/lib/game.ts';
import {shufflePicture,rewardRoom,upgradeDefense} from '../src/lib/defense.ts';
import {circuitReadings} from '../src/lib/circuit.ts';
for(let size=3;size<=8;size++){
 const tiles=shufflePicture(size);assert.equal(new Set(tiles).size,size*size);assert.equal(tiles.length,size*size);assert.ok(!tiles.includes(0));assert.deepEqual([...tiles].sort((a,b)=>a-b),Array.from({length:size*size},(_,i)=>i+1));
}
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];
assert.throws(()=>act(s,'a',{type:'swapFighter',package:'missing',from:0,to:1}),/Earn/);assert.throws(()=>act(s,'a',{type:'fightWave'}),/fighter/);
for(let board=0;board<8;board++){rewardRoom(s,board);rewardRoom(s,board);}
assert.equal(s.packages.length,8);assert.equal(s.systems.length,8);assert.deepEqual(s.packages.map(p=>p.size),[3,4,5,6,7,8,8,8]);
const persisted=JSON.parse(JSON.stringify(s));upgradeDefense(persisted);assert.deepEqual(persisted.packages,s.packages);
for(const pack of s.packages){pack.tiles=Array.from({length:pack.size*pack.size},(_,i)=>i+1);const last=pack.tiles.length-1;[pack.tiles[last],pack.tiles[last-1]]=[pack.tiles[last-1],pack.tiles[last]];act(s,'b',{type:'swapFighter',package:pack.id,from:last,to:last-1});assert.ok(pack.recruited);assert.equal(pack.moves,1);assert.throws(()=>act(s,'a',{type:'swapFighter',package:pack.id,from:last,to:last-1}),/already recruited/);}
const wave=s.defense.wave;act(s,'a',{type:'fightWave'});assert.equal(s.defense.wave,wave+1);assert.equal(s.defense.wall,100);
const c=initial();c.players=[{id:1,token:'a',name:'A'}];c.unlocked.push(7);for(let i=0;i<9;i++){c.circuit[i]='battery'+i;const it=c.items.find(it=>it.id===c.circuit[i]);it.cell='7:'+i;it.owner=null;}
c.settings[7]=[0,2,1,1,2,1,2,2,1];assert.ok(circuitReadings(c).every(r=>r.matched));c.settings[7][2]=0;assert.equal(circuitReadings(c)[0].current,0);check(c);assert.ok(!c.completed.includes(7));act(c,'a',{type:'use',board:7,cell:2});assert.ok(c.completed.includes(7));assert.ok(c.systems.includes(7));assert.equal(c.packages.length,1);
console.log('PASS: solvable picture grids 3x3–8x8, exactly one reward per room, stable saved packages, both-player recruitment, wave combat, current targets, switch breaks circuit, system and fighter reward');

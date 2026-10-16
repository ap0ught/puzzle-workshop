import assert from 'node:assert/strict';
import {initial,act} from '../src/lib/game.ts';
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];
act(s,'a',{type:'pickup',item:'pipe0'});act(s,'b',{type:'pickup',item:'pipe1'});
s.items.find(i=>i.id==='pipe2').owner='box';
act(s,'a',{type:'stashRoom',board:0});assert.equal(s.items.filter(i=>i.owner==='tray:0').length,6);assert.equal(s.items.find(i=>i.id==='pipe0').owner,1);assert.equal(s.items.find(i=>i.id==='pipe1').owner,2);assert.equal(s.items.find(i=>i.id==='pipe2').owner,'box');assert.ok(s.items.filter(i=>i.type==='tile').every(i=>i.owner===null));
act(s,'a',{type:'stashRoom',board:2});assert.equal(s.items.filter(i=>i.owner==='tray:2').length,9);assert.ok(s.items.filter(i=>i.type==='battery').every(i=>i.owner===null));
act(s,'a',{type:'stashRoom',board:2});assert.equal(s.items.filter(i=>i.owner==='tray:2').length,9);act(s,'a',{type:'load',board:2});assert.equal(s.switches.filter(Boolean).length,9);
assert.throws(()=>act(s,'a',{type:'stashRoom',board:3}),/unlock/);
console.log('PASS: matching floor pieces only, both backpacks and box preserved, own-piece preference, no tray overfill, repeated load safe, locked rooms rejected');

const mixed=initial();mixed.players=[{id:1,token:'a',name:'A'}];act(mixed,'a',{type:'pickup',item:'battery0'});act(mixed,'a',{type:'stashRoom',board:2});assert.equal(mixed.items.filter(i=>i.owner==='tray:2').length,8);act(mixed,'a',{type:'load',board:2});assert.equal(mixed.switches.filter(Boolean).length,9);
console.log('PASS: room shortcut reserves socket capacity for compatible pocket pieces');

const partnerTile=initial(['tile','tile']);partnerTile.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];partnerTile.items.find(i=>i.id==='tile7').owner=2;
act(partnerTile,'a',{type:'stashRoom',board:0});
assert.deepEqual(partnerTile.items.filter(i=>i.owner==='tray:0').map(i=>i.n).sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
assert.equal(partnerTile.items.find(i=>i.id==='tile0@room-1').owner,null);
act(partnerTile,'a',{type:'load',board:0});
const partnerLoaded=partnerTile.items.filter(i=>i.cell?.startsWith('0:'));
assert.equal(new Set(partnerLoaded.map(i=>i.n)).size,partnerLoaded.length);

const pocketTile=initial(['tile','tile']);pocketTile.players=[{id:1,token:'a',name:'A'}];pocketTile.items.find(i=>i.id==='tile0@room-1').owner=1;
act(pocketTile,'a',{type:'stashRoom',board:0});
assert.deepEqual(pocketTile.items.filter(i=>i.owner==='tray:0').map(i=>i.n).sort((a,b)=>a-b),[2,3,4,5,6,7,8]);
act(pocketTile,'a',{type:'load',board:0});
const pocketLoaded=pocketTile.items.filter(i=>i.cell?.startsWith('0:'));
assert.deepEqual(pocketLoaded.map(i=>i.n).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
console.log('PASS: slider room shortcut selects missing numbers when a partner or caller carries a tile');

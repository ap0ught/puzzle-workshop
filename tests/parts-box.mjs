import assert from 'node:assert/strict';
import {initial,act,check} from '../src/lib/game.ts';
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];s.unlocked.push(4);
for(let c=0;c<6;c++){const id='weight'+c;s.balance[c]=id;const it=s.items.find(i=>i.id===id);it.cell='4:'+c;it.owner=null;}
s.items.find(i=>i.id==='gear0').owner='tray:4';s.items.find(i=>i.id==='tile0').owner=2;
check(s);
const used=s.items.filter(i=>i.type==='weight');assert.ok(used.every(i=>i.owner==='box'&&i.cell===null));assert.equal(s.items.find(i=>i.id==='gear0').owner,null);assert.equal(s.items.find(i=>i.id==='tile0').owner,2);
act(s,'a',{type:'pickup',item:'weight0'});assert.equal(used[0].owner,1);assert.throws(()=>act(s,'b',{type:'pickup',item:'weight0'}),/picked/);
for(const item of ['weight1','weight2','weight3','weight4'])act(s,'a',{type:'pickup',item});assert.throws(()=>act(s,'a',{type:'pickup',item:'weight5'}),/full/);assert.equal(used[5].owner,'box');
const boxBefore=s.items.filter(i=>i.owner==='box').map(i=>i.id);check(s);assert.deepEqual(s.items.filter(i=>i.owner==='box').map(i=>i.id),boxBefore);
console.log('PASS: only installed pieces boxed, spare tray item remains on floor, partner inventory unchanged, shared pickup race protection, pocket cap, idempotent closure');

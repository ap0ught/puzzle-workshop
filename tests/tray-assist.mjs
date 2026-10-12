import assert from 'node:assert/strict';
import {initial,act} from '../src/lib/game.ts';
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];
act(s,'a',{type:'pickup',item:'tile0'});assert.throws(()=>act(s,'a',{type:'assist',board:1}),/tray/);assert.equal(s.items.find(i=>i.id==='tile0').owner,1);assert.equal(s.tiles[0],null);
act(s,'a',{type:'pickup',item:'tile1'});act(s,'a',{type:'deliver',board:1,item:'tile1'});act(s,'b',{type:'assist',board:1});assert.equal(s.tiles[1],'tile1');assert.ok(s.locked[1].includes(1));assert.equal(s.items.find(i=>i.id==='tile0').owner,1);assert.equal(s.items.find(i=>i.id==='tile1').owner,null);
console.log('PASS: Place & lock requires a compatible tray piece, leaves pockets untouched, works from shared tray for either player');

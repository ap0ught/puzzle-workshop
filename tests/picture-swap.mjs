import assert from 'node:assert/strict';
import {initial,act} from '../src/lib/game.ts';
import {rewardRoom,upgradeDefense} from '../src/lib/defense.ts';
const s=initial();s.players=[{id:1,token:'a',name:'A'},{id:2,token:'b',name:'B'}];rewardRoom(s,0);const p=s.packages[0];p.tiles=[1,2,3,4,5,6,7,8,9];
act(s,'a',{type:'swapFighter',package:p.id,from:0,to:8,expectedFrom:1,expectedTo:9});assert.equal(p.tiles[0],9);assert.equal(p.tiles[8],1);assert.equal(p.moves,1);assert.ok(!p.recruited);
const before=JSON.stringify(p.tiles);assert.throws(()=>act(s,'b',{type:'swapFighter',package:p.id,from:0,to:8,expectedFrom:1,expectedTo:9}),/partner/);assert.equal(JSON.stringify(p.tiles),before);assert.throws(()=>act(s,'a',{type:'swapFighter',package:p.id,from:0,to:0}),/different/);
act(s,'b',{type:'swapFighter',package:p.id,from:0,to:8,expectedFrom:9,expectedTo:1});assert.ok(p.recruited);assert.equal(p.moves,2);
const legacy={packages:[{id:'old',size:3,tiles:[1,2,3,4,5,6,7,8,0],recruited:true,moves:10}],systems:[],completed:[]};upgradeDefense(legacy);assert.deepEqual(legacy.packages[0].tiles,[1,2,3,4,5,6,7,8,9]);assert.equal(legacy.packages[0].mode,'swap');assert.ok(legacy.packages[0].recruited);assert.equal(legacy.packages[0].moves,10);const migrated=JSON.stringify(legacy);upgradeDefense(legacy);assert.equal(JSON.stringify(legacy),migrated);
console.log('PASS: nonadjacent click-swap, complete portrait recruitment, swap count, stale multiplayer selection rejected, invalid swap rejected, legacy gap replaced without losing recruitment');

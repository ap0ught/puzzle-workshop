import assert from 'node:assert/strict';
import {initial,act} from '../src/lib/game.ts';
import {lightNeighbors,toggleLights,newLights,solveLights} from '../src/lib/lights-out.ts';
assert.deepEqual(lightNeighbors(0),[0,3,1]);assert.equal(lightNeighbors(4).length,5);
for(let sample=0;sample<64;sample++){const lights=newLights();assert.ok(lights.some(Boolean));const solution=solveLights(lights);assert.ok(solution.length);for(const cell of solution)toggleLights(lights,cell);assert.ok(lights.every(v=>!v));}
const s=initial();s.players=[{id:1,token:'a',name:'A'}];s.locked[2]=[0];
for(let i=0;i<9;i++){const id='switch'+i;s.items.find(it=>it.id===id).owner='tray:2';}
act(s,'a',{type:'load',board:2});assert.deepEqual(s.locked[2],[]);assert.ok(!s.closed.includes(2));
const before=[...s.lights];act(s,'a',{type:'use',board:2,cell:4});for(let c=0;c<9;c++)assert.equal(s.lights[c],lightNeighbors(4).includes(c)?!before[c]:before[c]);assert.equal(s.lightMoves,1);
if(!s.closed.includes(2))for(const cell of solveLights(s.lights))act(s,'a',{type:'use',board:2,cell});assert.ok(s.closed.includes(2));
console.log('PASS: correct edge/center neighbors, 64 solvable nonempty patterns, legacy lock repair, exact cross toggle, shared move count, hints solve and close room');

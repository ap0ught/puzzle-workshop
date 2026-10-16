import assert from 'node:assert/strict';
import {initial,act,check,upgrade,kinds,puzzles,puzzleState,puzzleKind,puzzleFor,requiredPieces,compatible,tentSolution,circuitReadings} from '../src/lib/game.ts';

const fresh=selection=>{const s=initial(selection);s.players=[{id:1,token:'a',name:'A'}];return s;};
assert.deepEqual(initial().lineup.map(room=>room.kind),kinds);
for(const invalid of [null,[],['unknown'],['pipe',null],Array(17).fill('pipe'),{},'pipe'])
 assert.throws(()=>initial(invalid),/between 1 and 16/);
assert.equal(initial(Array(16).fill('pipe')).lineup.length,16);

for(const kind of kinds){
 const s=fresh([kind,kind]),definition=puzzles[kinds.indexOf(kind)];
 assert.deepEqual(s.unlocked,[0,1]);
 assert.equal(new Set(s.lineup.map(room=>room.instance)).size,2);
 assert.equal(new Set(s.items.map(item=>item.id)).size,s.items.length);
 assert.notEqual(puzzleState(s,0),puzzleState(s,1));
 assert.notEqual(puzzleState(s,0)[definition.field],puzzleState(s,1)[definition.field]);
 assert.notEqual(s.settings[0],s.settings[1]);
 assert.equal(requiredPieces(1,s),kind==='tile'?8:kind==='tent'?5:definition.size);
 for(let board=0;board<2;board++){
  assert.equal(s.items.filter(item=>item.floorRoom===board&&item.type===kind).length,requiredPieces(board,s));
  assert.ok(compatible(board,s.items.find(item=>item.type===kind),s));
 }
 act(s,'a',{type:'stashRoom',board:1});
 assert.ok(s.items.filter(item=>item.owner==='tray:1').every(item=>item.floorRoom===1&&item.type===kind));
 const item=s.items.find(item=>item.owner==='tray:1');
 act(s,'a',{type:'place',board:1,cell:kind==='tent'?tentSolution[0]:0,item:item.id});
 assert.equal(puzzleState(s,1)[definition.field][0],item.id);
 assert.ok(puzzleState(s,0)[definition.field].every(value=>value===null));
 act(s,'a',{type:'reset',board:1});
 assert.ok(puzzleState(s,1)[definition.field].every(value=>value===null));
}

// Every kind must solve in a different position, including a second copy after board 7.
const selection=[...kinds].reverse().flatMap(kind=>[kind,kind]),s=fresh(selection);
for(let board=0;board<s.lineup.length;board++){
 assert.ok(s.unlocked.includes(board));
 const state=puzzleState(s,board),kind=puzzleKind(s,board),puzzle=puzzleFor(s,board);
 const pieces=s.items.filter(item=>item.floorRoom===board&&item.type===puzzle.kind);
 pieces.forEach((item,index)=>{const cell=kind===3?tentSolution[index]:index;state[puzzle.field][cell]=item.id;item.cell=board+':'+cell;});
 if(kind===0)state.rot.fill(0);
 if(kind===1)state.assembled=true;
 if(kind===2)state.lights.fill(false);
 if(kind>=5)s.settings[board]=Array.from({length:9},(_,cell)=>puzzle.target(cell));
 if(kind===7)s.settings[board]=[0,2,1,1,2,1,2,2,1];
 if(kind===5){s.settings[board].fill(0);s.settings[board][2]=2;s.settings[board][8]=2;}
 if(kind===0)act(s,'a',{type:'testWater',board});
 else if(kind===5)act(s,'a',{type:'testBeam',board});
 else check(s);
 assert.ok(s.completed.includes(board),puzzle.name+' instance '+board+' should complete');
 assert.equal(s.packages.find(pack=>pack.room===board).id,'fighter-'+board);
 assert.ok(s.packages.find(pack=>pack.room===board).name);
 assert.ok(s.systems.includes(board));
 assert.ok(pieces.every(item=>item.owner==='box'));
 if(kind===7)assert.deepEqual(circuitReadings(s,board).map(row=>row.current),[10,20,30]);
 assert.throws(()=>act(s,'a',{type:'reset',board}),/closed/);
}
assert.equal(s.completed.length,16);
assert.equal(new Set(s.packages.map(pack=>pack.id)).size,16);
const snapshot=JSON.stringify(s);check(s);assert.equal(JSON.stringify(s),snapshot);
const reloaded=JSON.parse(JSON.stringify(s));upgrade(reloaded);check(reloaded);
assert.deepEqual(reloaded,s);

// Assembling either slider must not invent IDs or move the other copy's pieces.
const sliders=fresh(['tile','tile']);
for(let board=0;board<2;board++){
 act(sliders,'a',{type:'stashRoom',board});
 act(sliders,'a',{type:'load',board});
 const tiles=puzzleState(sliders,board).tiles.filter(Boolean);
 assert.equal(new Set(tiles).size,8);
 assert.ok(tiles.every(id=>sliders.items.find(item=>item.id===id)?.cell.startsWith(board+':')));
}
const firstTiles=[...sliders.tiles];
act(sliders,'a',{type:'use',board:1,cell:puzzleState(sliders,1).tiles.indexOf(null)===0?1:Math.max(0,puzzleState(sliders,1).tiles.indexOf(null)-1)});
assert.deepEqual(sliders.tiles,firstTiles);

for(const kind of ['switch','battery','gear']){
 const controls=fresh([kind,kind]);
 act(controls,'a',{type:'stashRoom',board:1});act(controls,'a',{type:'load',board:1});
 const first=JSON.stringify(puzzleState(controls,0)[puzzleFor(controls,0).field]);
 const settings=[...controls.settings[0]];
 if(kind==='battery')act(controls,'a',{type:'setCircuit',board:1,cell:0,value:2});
 else act(controls,'a',{type:'use',board:1,cell:0});
 assert.equal(JSON.stringify(puzzleState(controls,0)[puzzleFor(controls,0).field]),first);
 assert.deepEqual(controls.settings[0],settings);
 if(kind==='battery')assert.equal(controls.settings[1][0],2);
}
const longRun=fresh(Array(16).fill('battery'));
for(let board=0;board<16;board++){
 const state=puzzleState(longRun,board);
 longRun.items.filter(item=>item.floorRoom===board&&item.type==='battery').forEach((item,cell)=>{state.circuit[cell]=item.id;item.cell=board+':'+cell;});
 longRun.settings[board]=[0,2,1,1,2,1,2,2,1];check(longRun);
}
assert.ok(longRun.items.filter(item=>item.owner===null).every(item=>item.x>=0&&item.x<=100&&item.y>=0&&item.y<=100));

// Legacy JSON keeps puzzle placements, controls, inventory, progression, and reward IDs.
const legacy=fresh();
legacy.pipes[4]='pipe0';legacy.rot[4]=3;legacy.items[0].cell='0:4';
legacy.items.find(item=>item.id==='tile0').owner='tray:1';
legacy.settings[6][2]=3;legacy.completed=[3];legacy.unlocked=[0,1,2,3,4];
legacy.tents[0]='tent0';legacy.items.find(item=>item.id==='tent0').cell='3:0';
delete legacy.lineup;delete legacy.instances;
const migrated=upgrade(JSON.parse(JSON.stringify(legacy)));
assert.deepEqual(migrated.lineup.map(room=>room.kind),kinds);
assert.equal(migrated.pipes[4],'pipe0');assert.equal(migrated.rot[4],3);
assert.equal(migrated.items.find(item=>item.id==='tile0').owner,'tray:1');
assert.equal(migrated.settings[6][2],3);
check(migrated);
assert.ok(migrated.closed.includes(3));assert.equal(migrated.packages[0].id,'fighter-3');
assert.equal(migrated.items.find(item=>item.id==='tent0').owner,'box');
console.log('PASS: lineup limits/defaults, independent duplicate states and pieces, all 16 reordered solutions, unique rewards, slider IDs, JSON reload and legacy migration');

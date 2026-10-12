import assert from 'node:assert/strict';
import {initial,act,check,traceBeam} from '../src/lib/game.ts';
const s=initial();s.unlocked.push(5);s.players=[{id:1,token:'a',name:'A'}];
assert.throws(()=>act(s,'a',{type:'testBeam',board:5}),/nine beam sockets/);
for(let c=0;c<9;c++){s.beam[c]='mirror'+c;const i=s.items.find(i=>i.id==='mirror'+c);i.cell='5:'+c;}
s.settings[5].fill(0);assert.equal(traceBeam(s).passed,false);
act(s,'a',{type:'testBeam',board:5});assert.ok(!s.beamTest.passed);assert.ok(!s.completed.includes(5));
act(s,'a',{type:'use',board:5,cell:2});assert.equal(s.beamTest,null);
s.settings[5][2]=2;s.settings[5][8]=2;
const route=traceBeam(s);assert.ok(route.passed);assert.deepEqual(route.path,[0,1,2,5,8]);assert.equal(route.segments.length,6);
check(s);assert.ok(!s.completed.includes(5),'Preview alone does not complete room');
act(s,'a',{type:'testBeam',board:5});assert.ok(s.closed.includes(5));assert.ok(s.items.filter(i=>i.type==='mirror').every(i=>i.floorRoom===-1));
console.log('PASS: required sockets, missed receiver feedback, rotation clears test, two reflective turns, live preview without completion, receiver test closes room');

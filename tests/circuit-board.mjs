import {initial,act,upgrade,readyToSolve} from '../src/lib/game.ts';
import {circuitReadings} from '../src/lib/circuit.ts';

const failures=[];
const check=(cond,msg)=>cond?console.log('ok:   '+msg):failures.push(msg);
const throws=(fn,msg)=>{try{fn();failures.push(msg);}catch{}};

const fresh=()=>{const s=initial();s.players.push({id:1,name:'Tester',token:'t1',x:50,y:50});s.unlocked=[0,1,2,3,4,5,6,7];upgrade(s);return s;};
const fill=(s)=>{for(let c=0;c<9;c++){s.items.find(i=>i.id==='battery'+c).owner=1;act(s,'t1',{type:'place',board:7,cell:c,item:'battery'+c});}};

const empty=fresh();
throws(()=>act(empty,'t1',{type:'setCircuit',board:7,cell:0,value:1}),'setCircuit rejected before all nine sockets are filled');

const s=fresh();
fill(s);
check(readyToSolve(s,7),'all nine circuit sockets filled');
check(circuitReadings(s).every(r=>r.current===0&&!r.matched),'open switches and default settings read 0 mA, unmatched');

throws(()=>act(s,'t1',{type:'setCircuit',board:7,cell:0,value:4}),'setCircuit rejects voltage index 4');
throws(()=>act(s,'t1',{type:'setCircuit',board:7,cell:2,value:2}),'setCircuit rejects switch value 2');
throws(()=>act(s,'t1',{type:'setCircuit',board:7,cell:9,value:0}),'setCircuit rejects cell 9');

act(s,'t1',{type:'setCircuit',board:7,cell:0,value:0});
act(s,'t1',{type:'setCircuit',board:7,cell:1,value:2});
act(s,'t1',{type:'setCircuit',board:7,cell:2,value:1});
let rows=circuitReadings(s);
check(rows[0].current===10&&rows[0].matched,'row 1 reads 10 mA from 3 V / 300 Ω closed');
check(!rows[1].matched&&!rows[2].matched,'other rows still unmatched');

act(s,'t1',{type:'setCircuit',board:7,cell:5,value:0});
rows=circuitReadings(s);
check(rows[1].current===0&&!rows[1].matched,'open switch reads 0 mA even when wired');

act(s,'t1',{type:'setCircuit',board:7,cell:3,value:1});
act(s,'t1',{type:'setCircuit',board:7,cell:4,value:2});
act(s,'t1',{type:'setCircuit',board:7,cell:5,value:1});
act(s,'t1',{type:'setCircuit',board:7,cell:6,value:3});
act(s,'t1',{type:'setCircuit',board:7,cell:7,value:3});
act(s,'t1',{type:'setCircuit',board:7,cell:8,value:1});
rows=circuitReadings(s);
check(rows.every(r=>r.matched),'all three rows match their targets via circuitReadings');
check(rows.map(r=>r.current).join(',')==='10,20,30','readings are 10/20/30 mA');
check(s.solved[7]===true,'room 7 marked solved');
check(s.completed.includes(7),'room 7 completed');
throws(()=>act(s,'t1',{type:'setCircuit',board:7,cell:0,value:1}),'setCircuit rejected on the closed room');

if(failures.length){console.error(failures.length+' FAILURE(S): '+failures.join(' | '));process.exit(1);}
console.log('ALL CIRCUIT BOARD CHECKS PASSED');
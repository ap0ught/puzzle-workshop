import {upgradeDefense,rewardRoom,defenseAction} from './defense.ts';
export {systems} from './defense.ts';
import {circuitReadings as readCircuit} from './circuit.ts';
import {toggleLights,newLights} from './lights-out.ts';
export {lightNeighbors,solveLights} from './lights-out.ts';
import {traceBeam as readBeam,beamSignature} from './beam-routing.ts';
import {connections,traceWater as readWater,waterSignature} from './waterworks.ts';
export {connections} from './waterworks.ts';
import { puzzles, kinds, compatible, readyToSolve, requiredPieces, filledSockets, createLineup, puzzleFor, puzzleKind, puzzleState, puzzleView } from './puzzles.ts';
export { puzzles, kinds, compatible, readyToSolve, filledSockets, requiredPieces, puzzleFor, puzzleKind, puzzleState } from './puzzles.ts';
export const circuitReadings = (s: any, board = 7) => readCircuit(s, board);
export const traceBeam = (s: any, board = 5) => readBeam(puzzleView(s, board));
export const traceWater = (s: any, board = 0) => readWater(puzzleView(s, board));
export function upgrade(s: any) { const legacy = !s.lineup; s.lineup ??= createLineup(); s.instances ??= {}; s.locked ??= []; s.unlocked ??= s.lineup.slice(0, 3).map((_: any, b: number) => b); s.completed ??= []; s.closed ??= []; s.announcements ??= []; s.settings ??= {}; for (let b = 0; b < s.lineup.length; b++) {
    const puzzle = puzzleFor(s, b);
    if (s.lineup.findIndex((entry: any) => entry.kind === s.lineup[b].kind) !== b) s.instances[s.lineup[b].instance] ??= {};
    const state = puzzleState(s, b);
    state[puzzle.field] ??= Array(puzzle.size).fill(null);
    state.rot ??= [1, 2, 3, 1, 2, 3, 1, 2, 3];
    state.lights ??= Array(9).fill(false);
    state.assembled ??= false;
    s.settings[b] ??= Array(puzzle.size).fill(0);
    s.locked[b] ??= [];
    s.solved[b] ??= false;
    if (!s.closed.includes(b) && [0, 2].includes(puzzleKind(s, b))) s.locked[b] = [];
} if (legacy && !s.items.some((i: any) => i.type === 'weight')) {
    for (const [type, n] of [['weight', 6], ['mirror', 9], ['gear', 9], ['battery', 9], ['wire', 9]] as const)
        for (let i = 0; i < n; i++)
            s.items.push({ id: type + i, type, n: type === 'weight' ? i % 3 + 1 : i + 1, owner: null, cell: null, x: 12 + (s.items.length * 23) % 76, y: 32 + (s.items.length * 17) % 48 });
} if (legacy) for (const item of s.items) item.floorRoom ??= item.owner === 'box' ? -1 : s.lineup.findIndex((entry: any) => entry.kind === (item.type === 'wire' ? 'battery' : item.type)); upgradeDefense(s); return s; }
function announce(s: any, text: string) {
    s.announcements ??= [];
    s.announcements.unshift(text);
    s.announcements = s.announcements.slice(0, 12);
}
function closeRoom(s: any, board: number) {
    const pieces = s.items.filter((it: any) => it.cell?.startsWith(board + ':') ||
        it.owner === 'tray:' + board || (it.owner === null && it.cell === null && it.floorRoom === board));
    pieces.forEach((it: any) => {
        const usedInSolution = it.cell?.startsWith(board + ':');
        it.cell = null;
        it.owner = usedInSolution ? 'box' : null;
        if (usedInSolution) it.solvedIn = board;
        it.floorRoom = -1;
        const position = s.items.indexOf(it);
        it.x = 8 + (position % 12) * 7;
        it.y = 30 + (Math.floor(position / 12) % 7) * 8;
    });
    puzzleState(s, board)[puzzleFor(s, board).field].fill(null);
    s.locked[board] = [];
    s.closed.push(board);
    s.solved[board] = true;
    announce(s, puzzleFor(s, board).name + ' room closing — locked. Used pieces stored in the main room box; spare pieces returned to the floor.');
}
function progress(s: any) {
    s.closed ??= [];
    for (let board = 0; board < s.lineup.length; board++) {
        if (s.completed.includes(board)) {
            if (!s.closed.includes(board)) closeRoom(s, board);
            continue;
        }
        if (!s.solved[board] || !s.unlocked.includes(board)) continue;
        s.completed.push(board);
        rewardRoom(s,board);
        announce(s,'Defense system activated. '+s.packages.find((p:any)=>p.room===board).name+' fighter package awarded.');
        announce(s, puzzleFor(s, board).name + ' room solved!');
        closeRoom(s, board);
        const next = s.lineup.findIndex((_: any, i: number) => !s.unlocked.includes(i));
        if (next >= 0) {
            s.unlocked.push(next);
            announce(s, 'New room open: ' + puzzleFor(s, next).name + '.');
        }
    }
}
function validateBoard(s: any, b: number) {
    if (!Number.isInteger(b) || !puzzleFor(s, b)) throw Error('Invalid station.');
    if (s.closed?.includes(b) || s.completed.includes(b)) throw Error('This solved room is closed and locked.');
    if (!s.unlocked.includes(b)) throw Error('Complete an open room to unlock this one.');
}
export const trees = [1, 4, 11, 16, 23], tentSolution = [0, 9, 12, 15, 24];
export function initial(selection?: unknown) {
    const lineup = createLineup(selection), items: any[] = [];
    lineup.forEach((entry, board) => {
        const kind = kinds.indexOf(entry.kind), count = kind === 1 ? 8 : kind === 3 ? 5 : kind === 4 ? 6 : 9;
        const duplicate = lineup.findIndex(room => room.kind === entry.kind) !== board;
        for (const [type, n] of [[entry.kind, count], ...(kind === 7 ? [['wire', 9] as const] : [])] as const)
            for (let i = 0; i < n; i++) items.push({id: type + i + (duplicate ? '@' + entry.instance : ''), type, n: type === 'weight' ? i % 3 + 1 : i + 1, owner: null, cell: null, floorRoom: board, x: 12 + (items.length * 23) % 76, y: 32 + (items.length * 17) % 48});
    });
    return upgrade({lineup, items, players: [], solved: [], log: ['The workshop is waiting for you.'], version: 0});
}
export function check(s: any) {
    upgrade(s);
    for (let board = 0; board < s.lineup.length; board++) {
        const state = puzzleState(s, board), kind = puzzleKind(s, board), puzzle = puzzleFor(s, board);
        if (kind === 0) s.solved[board] = !!state.waterTest?.passed && state.waterTest.signature === waterSignature(state);
        if (kind === 1) s.solved[board] = state.assembled && state.tiles.every((v: any, i: number) => i === 8 ? v === null : s.items.find((item: any) => item.id === v)?.n === i + 1);
        if (kind === 2) s.solved[board] = state.switches.every(Boolean) && state.lights.every((v: boolean) => !v);
        if (kind === 3) {
            let ts = state.tents.map((v: any, i: number) => v ? i : -1).filter((v: number) => v >= 0);
            let rows = [1, 1, 1, 1, 1], cols = [2, 0, 1, 0, 2];
            const adjacent = (a: number, b: number) => Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) + Math.abs(a % 5 - b % 5) === 1;
            function match(t: number[], used: Set<number>): boolean { if (!t.length)
                return true; return trees.some(tr => !used.has(tr) && adjacent(t[0], tr) && match(t.slice(1), new Set([...used, tr]))); }
            s.solved[board] = ts.length === 5 && rows.every((n, r) => ts.filter((i: number) => Math.floor(i / 5) === r).length === n) && cols.every((n, c) => ts.filter((i: number) => i % 5 === c).length === n) && ts.every((a: number) => ts.every((b: number) => a === b || Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) > 1 || Math.abs(a % 5 - b % 5) > 1)) && match(ts, new Set());
        }
        if (kind >= 4) {
            const values = state[puzzle.field];
            const full = values.every(Boolean);
            s.solved[board] = full && (kind === 4 ? values.slice(0, 3).reduce((n: number, id: string) => n + s.items.find((i: any) => i.id === id).n, 0) === values.slice(3).reduce((n: number, id: string) => n + s.items.find((i: any) => i.id === id).n, 0) : values.every((_: any, c: number) => s.settings[board][c] === puzzle.target!(c)));
        }
        if (kind === 7) s.solved[board]=circuitReadings(s, board).every(reading=>reading.matched);
        if (kind === 5) s.solved[board]=!!state.beamTest?.passed&&state.beamTest.signature===beamSignature(puzzleView(s, board));
        if (!s.closed.includes(board) && !readyToSolve(s, board)) s.solved[board] = false;
    }
    progress(s);
    for (const board of s.closed) s.solved[board] = true;
}
export function act(s: any, token: string, a: any) {
    upgrade(s);
    if (a.board !== undefined)
        validateBoard(s, Number(a.board));
    const board = Number(a.board), kind = puzzleKind(s, board);
    const state = a.board === undefined ? s : puzzleState(s, board);
    const p = s.players.find((p: any) => p.token === token);
    if (!p)
        throw Error('Player session expired. Rejoin the room.');
    let inv = () => s.items.filter((i: any) => i.owner === p.id && i.cell === null);
    const item = s.items.find((i: any) => i.id === a.item);
    if(defenseAction(s,a)){s.announcements=s.announcements.slice(0,12);return s;}
    if (a.type === 'testBeam') {
        validateBoard(s,board);
        if(kind !== 5)throw Error('Choose a Beam Routing room.');
        if(!readyToSolve(s,board))throw Error('Fill all nine beam sockets before testing the receiver.');
        state.beamTest={...traceBeam(s,board),signature:beamSignature(puzzleView(s,board))};
        if(!state.beamTest.passed)announce(s,'Beam Routing: '+state.beamTest.reason);
        check(s);return s;
    }
    if(kind===5&&['place','remove','use','reset','load'].includes(a.type))state.beamTest=null;
    if (a.type === 'testWater') {
        validateBoard(s, board);
        if(kind !== 0)throw Error('Choose a Waterworks room.');
        if (!readyToSolve(s, board)) throw Error('Fill all nine sockets before turning on the water.');
        const result = traceWater(s,board);
        state.waterTest = {...result, signature:waterSignature(state), pipes:[...state.pipes], rot:[...state.rot], startedAt:Date.now(), duration:(result.path.length+1)*300};
        if (!result.passed) announce(s, 'Waterworks leak: ' + result.reason + ' Rotate the pipes and try Done again.');
        check(s);
        return s;
    }
    if (kind === 0 && ['place','remove','use','reset','load','assist'].includes(a.type)) state.waterTest = null;
    if (a.type === 'setCircuit') {
        validateBoard(s, board);
        if(kind !== 7)throw Error('Choose an Electrical Circuit room.');
        if (!readyToSolve(s, board)) throw Error('Fill all nine sockets before adjusting the circuits.');
        const c = Number(a.cell);
        if (!Number.isInteger(c) || c < 0 || c >= 9 || !state.circuit[c]) throw Error('Choose a filled circuit socket.');
        const v = Number(a.value), limit = c % 3 === 2 ? 2 : 4;
        if (!Number.isInteger(v) || v < 0 || v >= limit) throw Error('Invalid circuit setting.');
        s.settings[board][c] = v;
        check(s);
        return s;
    }
    if (a.type === 'use' && !readyToSolve(s, Number(a.board)))
        throw Error('Fill every required socket before solving this puzzle.');
    if (a.type === 'move') {
        p.x = Math.max(5, Math.min(95, Number(a.x) || 50));
        p.y = Math.max(25, Math.min(90, Number(a.y) || 55));
    }
    if (a.type === 'pickup') {
        if (!item || (item.owner !== null && item.owner !== 'box') || item.cell !== null)
            throw Error('Your partner picked that up.');
        if (inv().length >= 5)
            throw Error('Inventory full. Place or drop an item first.');
        item.owner = p.id;
        p.x = item.x;
        p.y = item.y;
    }
    if (a.type === 'deliver') {
        const board = Number(a.board);
        validateBoard(s, board);
        if (!item || item.owner !== p.id || item.cell !== null)
            throw Error('Select a carried item first.');
        if (!compatible(board, item, s))
            throw Error('That item belongs to a different puzzle.');
        item.owner = 'tray:' + board;
        return s;
    }
    if (a.type === 'stashRoom') {
        const board = Number(a.board);
        validateBoard(s, board);
        const trayCount = s.items.filter((it:any)=>it.owner==='tray:'+board&&it.cell===null).length;
        const space = Math.max(0,requiredPieces(board,s)-filledSockets(s,board)-trayCount-inv().filter((it:any)=>compatible(board,it,s)).length);
        const loose = s.items.filter((it:any)=>it.owner===null&&it.cell===null&&compatible(board,it,s));
        // Prefer this puzzle's own pieces, then reusable alternatives; never overfill.
        loose.sort((a:any,b:any)=>Number(b.floorRoom===board)-Number(a.floorRoom===board)||Number(b.type===puzzleFor(s,board).kind)-Number(a.type===puzzleFor(s,board).kind));
        for (const it of loose.slice(0,space)) it.owner='tray:'+board;
        return s;
    }
    if (a.type === 'stash') {
        const board = Number(a.board);
        validateBoard(s, board);
        for (const it of inv().filter((i: any) => compatible(board, i, s)))
            it.owner = 'tray:' + board;
        return s;
    }
    if (a.type === 'carry') {
        if (!item || item.owner !== 'tray:' + Number(a.board) || item.cell !== null)
            throw Error('Select an item from the tray.');
        if (inv().length >= 5)
            throw Error('Inventory full. Carry at most five items.');
        item.owner = p.id;
        return s;
    }
    if (a.type === 'drop' || a.type === 'dropAll') {
        const dropping = a.type === 'dropAll' ? inv() : [item];
        if (a.type === 'drop' && (!item || item.owner !== p.id || item.cell !== null))
            throw Error('Select an inventory item.');
        dropping.forEach((it: any, index: number) => {
            it.owner = null;
            it.floorRoom = Number(a.floorRoom ?? a.board ?? -1);
            // Spread pocket contents so every dropped piece remains clickable.
            it.x = Math.max(5, Math.min(95, (p.x ?? 50) + (index - (dropping.length - 1) / 2) * 6));
            it.y = Math.max(30, Math.min(85, (p.y ?? 55) + (index % 2) * 7));
        });
    }
    s.locked ??= [[], [], [], []];
    p.assistAt ??= {};
    if (a.type === 'reset' || a.type === 'load') {
        const board = Number(a.board);
        validateBoard(s, board);
        const field = puzzleFor(s,board).field;
        if (a.type === 'reset') {
            for (const it of s.items.filter((i: any) => i.cell?.startsWith(board + ':'))) {
                it.cell = null;
                it.owner = 'tray:' + board;
            }
            state[field] = Array(puzzleFor(s,board).size).fill(null);
            s.locked[board] = [];
            s.solved[board] = false;
            if (kind >= 4)
                s.settings[board].fill(0);
            if (kind === 0)
                state.rot = Array(9).fill(0);
            if (kind === 1) { state.assembled = false; state.sliderMoves = 0; }
            if (kind === 2)
                {state.lights.fill(false);state.lightMoves=0;}
            for (const player of s.players)
                if (player.assistAt)
                    delete player.assistAt[board];
            s.log.unshift(p.name + ' reset ' + puzzleFor(s,board).name + '. Pieces returned to the shared tray.');
            s.log = s.log.slice(0, 5);
            return s;
        }
        // One server action loads the shared tray and this player's compatible pockets.
        // Validate capacity before transferring anything so failed loads preserve inventory.
        const pieces = s.items.filter((i: any) => i.cell === null &&
            (i.owner === 'tray:' + board || (i.owner === p.id && compatible(board, i, s))));
        if (!pieces.length)
            return s;
        if (s.solved[board])
            throw Error('Reset this puzzle before loading more pieces.');
        let cells = Array.from({ length: puzzleFor(s,board).size }, (_, i) => i).filter(c => !state[field][c] && !s.locked[board].includes(c) && !(kind === 3 && trees.includes(c)) && !(kind === 1 && c === 8));
        for (let i = cells.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        if (pieces.length > cells.length)
            throw Error('Not enough free sockets. Carry spare tray pieces first.');
        for (const it of pieces) {
            const c = cells.pop();
            if (c === undefined)
                throw Error('No free frame for this piece.');
            state[field][c] = it.id;
            it.cell = board + ':' + c;
            it.owner = null;
            if (kind === 0)
                state.rot[c] = Math.floor(Math.random() * 4);
            if (kind >= 4)
                s.settings[board][c] = Math.floor(Math.random() * puzzleFor(s,board).cycles!);
        }
        if (kind === 1 && state.tiles.filter(Boolean).length === 8) {
            state.assembled = true;
            state.tiles = [...state.tiles.filter(Boolean).sort((a: string,b: string)=>s.items.find((it:any)=>it.id===a).n-s.items.find((it:any)=>it.id===b).n), null];
            let blank = 8, previous = -1;
            for (let step = 0; step < 100; step++) {
                const possible = [blank - 3, blank + 3, blank % 3 ? blank - 1 : -1, blank % 3 < 2 ? blank + 1 : -1].filter(c => c >= 0 && c < 9 && !s.locked[board].includes(c) && c !== previous);
                if (!possible.length)
                    break;
                const next = possible[Math.floor(Math.random() * possible.length)];
                [state.tiles[blank], state.tiles[next]] = [state.tiles[next], state.tiles[blank]];
                previous = blank;
                blank = next;
            }
            s.items.filter((i: any) => i.cell?.startsWith(board+':')).forEach((i: any) => i.cell = board+':' + state.tiles.indexOf(i.id));
        }
        if (kind === 2 && readyToSolve(s,board)) {state.lights=newLights();state.lightMoves=0;}
        check(s);
        s.log.unshift(p.name + ' loaded ' + pieces.length + ' tray pieces into ' + puzzleFor(s,board).name + '.');
        s.log = s.log.slice(0, 5);
        return s;
    }
    if (a.type === 'assist' && kind === 2) throw Error('Use the Lights Out hint button to see which lights to press.');
    if (a.type === 'assist' && kind >= 4)
        throw Error('Solve this room using its puzzle controls.');
    if (a.type === 'assist') {
        const board = Number(a.board);
        validateBoard(s, board);
        if (s.solved[board])
            throw Error('This station is complete.');
        const now = Date.now();
        if (now - (p.assistAt[board] || 0) < 5000)
            throw Error('Place & lock is cooling down. Wait 5 seconds.');
        const candidate = s.items.find((i: any) => i.owner === 'tray:' + board && i.cell === null && compatible(board, i, s));
        if (!candidate)
            throw Error('Load a matching piece into this room’s tray before using Place & lock.');
        const field = puzzleFor(s,board).field;
        const target = kind === 3 ? tentSolution.find(c => !s.locked[board].includes(c)) : candidate.n - 1;
        if (target === undefined)
            throw Error('All correct positions are locked.');
        if (s.locked[board].includes(target))
            throw Error('This item already has a locked position.');
        const displaced = s.items.find((i: any) => i.id === state[field][target]);
        if (displaced) {
            displaced.cell = null;
            displaced.owner = candidate.owner;
            state[field][target] = null;
        }
        s.locked[board].push(target);
        if (kind === 0)
            state.rot[target] = 0;
        act(s, token, { type: 'place', board, cell: target, item: candidate.id });
        p.assistAt[board] = now;
        s.log.unshift(p.name + ' placed & locked ' + candidate.type + ' ' + candidate.n + '.');
        s.log = s.log.slice(0, 5);
        return s;
    }
    let b = Number(a.board), c = Number(a.cell);
    if (['place', 'use', 'remove'].includes(a.type)) {
        if (!Number.isInteger(b) || b < 0 || b >= s.lineup.length || !Number.isInteger(c) || c < 0 || c >= puzzleFor(s,b).size)
            throw Error('Invalid frame.');
        if (s.solved[b] && a.type !== 'remove')
            throw Error('This station is complete.');
        const field = puzzleFor(s,b).field;
        if (!s.completed.includes(b) && s.locked[b].includes(c) && (a.type === 'remove' || (a.type === 'use' && (kind === 0 || kind === 1))))
            throw Error('This piece is locked in the correct position.');
        if (a.type === 'place') {
            if (!item || (item.owner !== p.id && item.owner !== 'tray:' + b) || item.cell !== null || !compatible(b, item, s))
                throw Error('Select a matching inventory item.');
            if (kind === 3 && !tentSolution.includes(c))
                throw Error('Wrong position — item rejected. Try a different frame.');
            if (state[field][c] || (kind === 3 && trees.includes(c)) || (kind === 1 && c === 8))
                throw Error('Choose an empty frame.');
            state[field][c] = item.id;
            item.owner = null;
            item.cell = b + ':' + c;
            if (kind === 2) {
                state.lights[c] = true;
                if(readyToSolve(s,b)){state.lights=newLights();state.lightMoves=0;}
            }
            if (kind === 1 && state.tiles.filter(Boolean).length === 8 && !state.assembled) {
                state.assembled = true;
                state.tiles = [...state.tiles.filter(Boolean).sort((a:string,b:string)=>s.items.find((it:any)=>it.id===a).n-s.items.find((it:any)=>it.id===b).n), null];
                let blank = 8;
                for (let next of [7, 4, 3, 6, 7, 8, 5, 4, 1, 0, 3, 4, 7, 6, 3, 0, 1, 2, 5, 8]) {
                    if (!s.locked[b].includes(next) && Math.abs(Math.floor(blank / 3) - Math.floor(next / 3)) + Math.abs(blank % 3 - next % 3) === 1) {
                        [state.tiles[blank], state.tiles[next]] = [state.tiles[next], state.tiles[blank]];
                        blank = next;
                    }
                }
                s.items.filter((i: any) => i.cell?.startsWith(b+':')).forEach((i: any) => i.cell = b+':' + state.tiles.indexOf(i.id));
            }
        }
        if (a.type === 'remove') {
            let id = state[field][c], it = s.items.find((i: any) => i.id === id);
            if (!it)
                throw Error('That frame is empty.');
            if (!a.tray && inv().length >= 5)
                throw Error('Inventory full.');
            if (kind === 1 && state.assembled && !s.completed.includes(b))
                throw Error('Slide the tiles after assembly.');
            if (kind === 1)
                state.assembled = false;
            state[field][c] = null;
            it.cell = null;
            it.owner = a.tray ? 'tray:' + b : p.id;
        }
        if (a.type === 'use') {
            if (kind >= 4 && state[puzzleFor(s,b).field][c])
                s.settings[b][c] = (s.settings[b][c] + 1) % (kind===7&&c%3===2?2:puzzleFor(s,b).cycles!);
            if (kind === 0 && state.pipes[c])
                state.rot[c] = (state.rot[c] + 1) % 4;
            if (kind === 1 && state.assembled) {
                let blank = state.tiles.indexOf(null);
                if (Math.abs(Math.floor(blank / 3) - Math.floor(c / 3)) + Math.abs(blank % 3 - c % 3) === 1) {
                    [state.tiles[blank], state.tiles[c]] = [state.tiles[c], state.tiles[blank]];
                    state.sliderMoves = (state.sliderMoves ?? 0) + 1;
                    s.items.filter((i: any) => i.cell?.startsWith(b+':')).forEach((i: any) => i.cell = b+':' + state.tiles.indexOf(i.id));
                }
            }
            if (kind === 2 && state.switches[c]) {
                toggleLights(state.lights,c);
                state.lightMoves=(state.lightMoves??0)+1;
            }
        }
    }
    const before = s.solved.slice();
    check(s);
    s.solved.forEach((v: boolean, i: number) => { if (v && !before[i])
        s.log.unshift(p.name + ' completed ' + puzzleFor(s,i).name + '!'); });
    s.log = s.log.slice(0, 5);
    return s;
}

import { upgrade, announce, tentSolution, validateBoard } from './game-state.ts';
import { check } from './game-check.ts';
import { frameAction, resetOrLoad } from './game-frames.ts';
import { defenseAction } from './defense.ts';
import { puzzles, compatible, readyToSolve, requiredPieces, filledSockets } from './puzzles.ts';
import { traceBeam, beamSignature } from './beam-routing.ts';
import { traceWater, waterSignature } from './waterworks.ts';

export function act(s: any, token: string, a: any) {
    upgrade(s);
    if (a.board !== undefined)
        validateBoard(s, Number(a.board));
    const p = s.players.find((p: any) => p.token === token);
    if (!p)
        throw Error('Player session expired. Rejoin the room.');
    let inv = () => s.items.filter((i: any) => i.owner === p.id && i.cell === null);
    const item = s.items.find((i: any) => i.id === a.item);
    if (defenseAction(s, a)) { s.announcements = s.announcements.slice(0, 12); return s; }
    if (a.type === 'testBeam') {
        validateBoard(s, 5);
        if (!readyToSolve(s, 5)) throw Error('Fill all nine beam sockets before testing the receiver.');
        s.beamTest = { ...traceBeam(s), signature: beamSignature(s) };
        if (!s.beamTest.passed) announce(s, 'Beam Routing: ' + s.beamTest.reason);
        check(s); return s;
    }
    if (Number(a.board) === 5 && ['place', 'remove', 'use', 'reset', 'load'].includes(a.type)) s.beamTest = null;
    if (a.type === 'testWater') {
        validateBoard(s, 0);
        if (!readyToSolve(s, 0)) throw Error('Fill all nine sockets before turning on the water.');
        const result = traceWater(s);
        s.waterTest = { ...result, signature: waterSignature(s), pipes: [...s.pipes], rot: [...s.rot], startedAt: Date.now(), duration: (result.path.length + 1) * 300 };
        if (!result.passed) announce(s, 'Waterworks leak: ' + result.reason + ' Rotate the pipes and try Done again.');
        check(s);
        return s;
    }
    if (Number(a.board) === 0 && ['place', 'remove', 'use', 'reset', 'load', 'assist'].includes(a.type)) s.waterTest = null;
    if (a.type === 'setCircuit') {
        validateBoard(s, 7);
        if (!readyToSolve(s, 7)) throw Error('Fill all nine sockets before adjusting the circuits.');
        const c = Number(a.cell);
        if (!Number.isInteger(c) || c < 0 || c >= 9 || !s.circuit[c]) throw Error('Choose a filled circuit socket.');
        const v = Number(a.value), limit = c % 3 === 2 ? 2 : 4;
        if (!Number.isInteger(v) || v < 0 || v >= limit) throw Error('Invalid circuit setting.');
        s.settings[7][c] = v;
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
        if (!compatible(board, item))
            throw Error('That item belongs to a different puzzle.');
        item.owner = 'tray:' + board;
        return s;
    }
    if (a.type === 'stashRoom') {
        const board = Number(a.board);
        validateBoard(s, board);
        const trayCount = s.items.filter((it: any) => it.owner === 'tray:' + board && it.cell === null).length;
        const space = Math.max(0, requiredPieces(board) - filledSockets(s, board) - trayCount - inv().filter((it: any) => compatible(board, it)).length);
        const loose = s.items.filter((it: any) => it.owner === null && it.cell === null && compatible(board, it));
        // Prefer this puzzle's own pieces, then reusable alternatives; never overfill.
        loose.sort((a: any, b: any) => Number(b.type === puzzles[board].kind) - Number(a.type === puzzles[board].kind));
        for (const it of loose.slice(0, space)) it.owner = 'tray:' + board;
        return s;
    }
    if (a.type === 'stash') {
        const board = Number(a.board);
        validateBoard(s, board);
        for (const it of inv().filter((i: any) => compatible(board, i)))
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
    if (a.type === 'reset' || a.type === 'load')
        return resetOrLoad(s, a, p);
    if (a.type === 'assist' && Number(a.board) === 2) throw Error('Use the Lights Out hint button to see which lights to press.');
    if (a.type === 'assist' && Number(a.board) >= 4)
        throw Error('Solve this room using its puzzle controls.');
    if (a.type === 'assist')
        return assist(s, token, a, p);
    if (['place', 'use', 'remove'].includes(a.type))
        frameAction(s, a, p, item, inv);
    const before = s.solved.slice();
    check(s);
    s.solved.forEach((v: boolean, i: number) => { if (v && !before[i])
        s.log.unshift(p.name + ' completed ' + puzzles[i].name + '!'); });
    s.log = s.log.slice(0, 5);
    return s;
}

function assist(s: any, token: string, a: any, p: any) {
    const board = Number(a.board);
    validateBoard(s, board);
    if (s.solved[board])
        throw Error('This station is complete.');
    const now = Date.now();
    if (now - (p.assistAt[board] || 0) < 5000)
        throw Error('Place & lock is cooling down. Wait 5 seconds.');
    const candidate = s.items.find((i: any) => i.owner === 'tray:' + board && i.cell === null && compatible(board, i));
    if (!candidate)
        throw Error('Load a matching piece into this room’s tray before using Place & lock.');
    const field = puzzles[board].field;
    const target = board === 3 ? tentSolution.find(c => !s.locked[3].includes(c)) : candidate.n - 1;
    if (target === undefined)
        throw Error('All correct positions are locked.');
    if (s.locked[board].includes(target))
        throw Error('This item already has a locked position.');
    const displaced = s.items.find((i: any) => i.id === s[field][target]);
    if (displaced) {
        displaced.cell = null;
        displaced.owner = candidate.owner;
        s[field][target] = null;
    }
    s.locked[board].push(target);
    if (board === 0)
        s.rot[target] = 0;
    act(s, token, { type: 'place', board, cell: target, item: candidate.id });
    p.assistAt[board] = now;
    s.log.unshift(p.name + ' placed & locked ' + candidate.type + ' ' + candidate.n + '.');
    s.log = s.log.slice(0, 5);
    return s;
}
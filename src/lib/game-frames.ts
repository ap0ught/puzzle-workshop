import { trees, tentSolution, validateBoard } from './game-state.ts';
import { check } from './game-check.ts';
import { puzzles, compatible, readyToSolve } from './puzzles.ts';
import { newLights, toggleLights } from './lights-out.ts';

export function resetOrLoad(s: any, a: any, p: any) {
    const board = Number(a.board);
    validateBoard(s, board);
    const field = puzzles[board].field;
    if (a.type === 'reset') {
        for (const it of s.items.filter((i: any) => i.cell?.startsWith(board + ':'))) {
            it.cell = null;
            it.owner = 'tray:' + board;
        }
        s[field] = Array(puzzles[board].size).fill(null);
        s.locked[board] = [];
        s.solved[board] = false;
        if (board >= 4)
            s.settings[board].fill(0);
        if (board === 0)
            s.rot = Array(9).fill(0);
        if (board === 1) { s.assembled = false; s.sliderMoves = 0; }
        if (board === 2)
            { s.lights.fill(false); s.lightMoves = 0; }
        for (const player of s.players)
            if (player.assistAt)
                delete player.assistAt[board];
        s.log.unshift(p.name + ' reset ' + puzzles[board].name + '. Pieces returned to the shared tray.');
        s.log = s.log.slice(0, 5);
        return s;
    }
    const pieces = s.items.filter((i: any) => i.cell === null &&
        (i.owner === 'tray:' + board || (i.owner === p.id && compatible(board, i))));
    if (!pieces.length)
        return s;
    if (s.solved[board])
        throw Error('Reset this puzzle before loading more pieces.');
    let cells = Array.from({ length: puzzles[board].size }, (_, i) => i).filter(c => !s[field][c] && !s.locked[board].includes(c) && !(board === 3 && trees.includes(c)) && !(board === 1 && c === 8));
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
        s[field][c] = it.id;
        it.cell = board + ':' + c;
        it.owner = null;
        if (board === 0)
            s.rot[c] = Math.floor(Math.random() * 4);
        if (board >= 4)
            s.settings[board][c] = Math.floor(Math.random() * puzzles[board].cycles!);
    }
    if (board === 1 && s.tiles.filter(Boolean).length === 8) {
        s.assembled = true;
        s.tiles = [...Array.from({ length: 8 }, (_, i) => 'tile' + i), null];
        let blank = 8, previous = -1;
        for (let step = 0; step < 100; step++) {
            const possible = [blank - 3, blank + 3, blank % 3 ? blank - 1 : -1, blank % 3 < 2 ? blank + 1 : -1].filter(c => c >= 0 && c < 9 && !s.locked[1].includes(c) && c !== previous);
            if (!possible.length)
                break;
            const next = possible[Math.floor(Math.random() * possible.length)];
            [s.tiles[blank], s.tiles[next]] = [s.tiles[next], s.tiles[blank]];
            previous = blank;
            blank = next;
        }
        s.items.filter((i: any) => i.type === 'tile' && i.cell !== null).forEach((i: any) => i.cell = '1:' + s.tiles.indexOf(i.id));
    }
    if (board === 2 && readyToSolve(s, 2)) { s.lights = newLights(); s.lightMoves = 0; }
    check(s);
    s.log.unshift(p.name + ' loaded ' + pieces.length + ' tray pieces into ' + puzzles[board].name + '.');
    s.log = s.log.slice(0, 5);
    return s;
}

export function frameAction(s: any, a: any, p: any, item: any, inv: () => any[]) {
    let b = Number(a.board), c = Number(a.cell);
    if (!Number.isInteger(b) || b < 0 || b >= puzzles.length || !Number.isInteger(c) || c < 0 || c >= puzzles[b].size)
        throw Error('Invalid frame.');
    if (s.solved[b] && a.type !== 'remove')
        throw Error('This station is complete.');
    const field = puzzles[b].field;
    if (!s.completed.includes(b) && s.locked[b].includes(c) && (a.type === 'remove' || (a.type === 'use' && (b === 0 || b === 1))))
        throw Error('This piece is locked in the correct position.');
    if (a.type === 'place') {
        if (!item || (item.owner !== p.id && item.owner !== 'tray:' + b) || item.cell !== null || !compatible(b, item))
            throw Error('Select a matching inventory item.');
        if (b === 3 && !tentSolution.includes(c))
            throw Error('Wrong position — item rejected. Try a different frame.');
        if (s[field][c] || (b === 3 && trees.includes(c)) || (b === 1 && c === 8))
            throw Error('Choose an empty frame.');
        s[field][c] = item.id;
        item.owner = null;
        item.cell = b + ':' + c;
        if (b === 2) {
            s.lights[c] = true;
            if (readyToSolve(s, 2)) { s.lights = newLights(); s.lightMoves = 0; }
        }
        if (b === 1 && s.tiles.filter(Boolean).length === 8 && !s.assembled) {
            s.assembled = true;
            s.tiles = [...Array.from({ length: 8 }, (_, i) => "tile" + i), null];
            let blank = 8;
            for (let next of [7, 4, 3, 6, 7, 8, 5, 4, 1, 0, 3, 4, 7, 6, 3, 0, 1, 2, 5, 8]) {
                if (!s.locked[1].includes(next) && Math.abs(Math.floor(blank / 3) - Math.floor(next / 3)) + Math.abs(blank % 3 - next % 3) === 1) {
                    [s.tiles[blank], s.tiles[next]] = [s.tiles[next], s.tiles[blank]];
                    blank = next;
                }
            }
            s.items.filter((i: any) => i.type === 'tile' && i.cell?.startsWith('1:')).forEach((i: any) => i.cell = '1:' + s.tiles.indexOf(i.id));
        }
    }
    if (a.type === 'remove') {
        let id = s[field][c], it = s.items.find((i: any) => i.id === id);
        if (!it)
            throw Error('That frame is empty.');
        if (!a.tray && inv().length >= 5)
            throw Error('Inventory full.');
        if (b === 1 && s.assembled && !s.completed.includes(b))
            throw Error('Slide the tiles after assembly.');
        if (b === 1)
            s.assembled = false;
        s[field][c] = null;
        it.cell = null;
        it.owner = a.tray ? 'tray:' + b : p.id;
    }
    if (a.type === 'use') {
        if (b >= 4 && s[puzzles[b].field][c])
            s.settings[b][c] = (s.settings[b][c] + 1) % (b === 7 && c % 3 === 2 ? 2 : puzzles[b].cycles!);
        if (b === 0 && s.pipes[c])
            s.rot[c] = (s.rot[c] + 1) % 4;
        if (b === 1 && s.assembled) {
            let blank = s.tiles.indexOf(null);
            if (Math.abs(Math.floor(blank / 3) - Math.floor(c / 3)) + Math.abs(blank % 3 - c % 3) === 1) {
                [s.tiles[blank], s.tiles[c]] = [s.tiles[c], s.tiles[blank]];
                s.sliderMoves = (s.sliderMoves ?? 0) + 1;
                s.items.filter((i: any) => i.type === 'tile' && i.cell?.startsWith('1:')).forEach((i: any) => i.cell = '1:' + s.tiles.indexOf(i.id));
            }
        }
        if (b === 2 && s.switches[c]) {
            toggleLights(s.lights, c);
            s.lightMoves = (s.lightMoves ?? 0) + 1;
        }
    }
}
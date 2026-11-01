import { upgradeDefense, rewardRoom } from './defense.ts';
import { puzzles } from './puzzles.ts';

export const trees = [1, 4, 11, 16, 23], tentSolution = [0, 9, 12, 15, 24];

export function upgrade(s: any) {
    s.locked ??= [];
    s.unlocked ??= [0, 1, 2];
    s.completed ??= [];
    s.closed ??= [];
    s.announcements ??= [];
    for (let b = 0; b < puzzles.length; b++) {
        s[puzzles[b].field] ??= Array(puzzles[b].size).fill(null);
        s.locked[b] ??= [];
        s.solved[b] ??= false;
    }
    if (!s.closed.includes(0)) s.locked[0] = [];
    if (!s.closed.includes(2)) s.locked[2] = [];
    s.settings ??= Object.fromEntries(puzzles.slice(4).map((_, i) => [i + 4, Array(puzzles[i + 4].size).fill(0)]));
    if (!s.items.some((i: any) => i.type === 'weight')) {
        for (const [type, n] of [['weight', 6], ['mirror', 9], ['gear', 9], ['battery', 9], ['wire', 9]] as const)
            for (let i = 0; i < n; i++)
                s.items.push({ id: type + i, type, n: type === 'weight' ? i % 3 + 1 : i + 1, owner: null, cell: null, x: 12 + (s.items.length * 23) % 76, y: 32 + (s.items.length * 17) % 48 });
    }
    upgradeDefense(s);
    return s;
}

export function announce(s: any, text: string) {
    s.announcements ??= [];
    s.announcements.unshift(text);
    s.announcements = s.announcements.slice(0, 12);
}

export function closeRoom(s: any, board: number) {
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
        it.y = 30 + Math.floor(position / 12) * 8;
    });
    s[puzzles[board].field].fill(null);
    s.locked[board] = [];
    s.closed.push(board);
    s.solved[board] = true;
    announce(s, puzzles[board].name + ' room closing — locked. Used pieces stored in the main room box; spare pieces returned to the floor.');
}

export function progress(s: any) {
    s.closed ??= [];
    for (let board = 0; board < puzzles.length; board++) {
        if (s.completed.includes(board)) {
            if (!s.closed.includes(board)) closeRoom(s, board);
            continue;
        }
        if (!s.solved[board] || !s.unlocked.includes(board)) continue;
        s.completed.push(board);
        rewardRoom(s, board);
        announce(s, 'Defense system activated. ' + s.packages.find((p: any) => p.room === board).name + ' fighter package awarded.');
        announce(s, puzzles[board].name + ' room solved!');
        closeRoom(s, board);
        const next = puzzles.findIndex((_, i) => !s.unlocked.includes(i));
        if (next >= 0) {
            s.unlocked.push(next);
            announce(s, 'New room open: ' + puzzles[next].name + '.');
        }
    }
}

export function validateBoard(s: any, b: number) {
    if (!Number.isInteger(b) || !puzzles[b]) throw Error('Invalid station.');
    if (s.closed?.includes(b) || s.completed.includes(b)) throw Error('This solved room is closed and locked.');
    if (!s.unlocked.includes(b)) throw Error('Complete an open room to unlock this one.');
}

export function initial() {
    let items: any[] = [];
    for (const [type, n] of [['pipe', 9], ['tile', 8], ['switch', 9], ['tent', 5]] as const)
        for (let i = 0; i < n; i++)
            items.push({ id: type + i, type, n: i + 1, owner: null, cell: null, x: 12 + (items.length * 23) % 76, y: 32 + (items.length * 17) % 48 });
    return upgrade({ items, players: [], pipes: Array(9).fill(null), rot: [1, 2, 3, 1, 2, 3, 1, 2, 3], tiles: Array(9).fill(null), lights: Array(9).fill(false), switches: Array(9).fill(null), tents: Array(25).fill(null), assembled: false, solved: [false, false, false, false], log: ['The workshop is waiting for you.'], version: 0 });
}
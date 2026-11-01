import { upgrade, progress, trees } from './game-state.ts';
import { circuitReadings } from './circuit.ts';
import { beamSignature } from './beam-routing.ts';
import { waterSignature } from './waterworks.ts';
import { puzzles, readyToSolve } from './puzzles.ts';

export function check(s: any) {
    upgrade(s);
    s.solved[0] = false;
    s.solved[0] = !!s.waterTest?.passed && s.waterTest.signature === waterSignature(s);
    s.solved[1] = s.assembled && s.tiles.every((v: any, i: number) => i === 8 ? v === null : v === 'tile' + i);
    s.solved[2] = s.switches.every(Boolean) && s.lights.every((v: boolean) => !v);
    let ts = s.tents.map((v: any, i: number) => v ? i : -1).filter((v: number) => v >= 0);
    let rows = [1, 1, 1, 1, 1], cols = [2, 0, 1, 0, 2];
    const adjacent = (a: number, b: number) => Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) + Math.abs(a % 5 - b % 5) === 1;
    function match(t: number[], used: Set<number>): boolean {
        if (!t.length)
            return true;
        return trees.some(tr => !used.has(tr) && adjacent(t[0], tr) && match(t.slice(1), new Set([...used, tr])));
    }
    s.solved[3] = ts.length === 5 && rows.every((n, r) => ts.filter((i: number) => Math.floor(i / 5) === r).length === n) && cols.every((n, c) => ts.filter((i: number) => i % 5 === c).length === n) && ts.every((a: number) => ts.every((b: number) => a === b || Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) > 1 || Math.abs(a % 5 - b % 5) > 1)) && match(ts, new Set());
    for (let b = 4; b < puzzles.length; b++) {
        const values = s[puzzles[b].field];
        const full = values.every(Boolean);
        s.solved[b] = full && (b === 4 ? values.slice(0, 3).reduce((n: number, id: string) => n + s.items.find((i: any) => i.id === id).n, 0) === values.slice(3).reduce((n: number, id: string) => n + s.items.find((i: any) => i.id === id).n, 0) : values.every((_: any, c: number) => s.settings[b][c] === puzzles[b].target!(c)));
    }
    s.solved[7] = circuitReadings(s).every(reading => reading.matched);
    s.solved[5] = !!s.beamTest?.passed && s.beamTest.signature === beamSignature(s);
    for (let board = 0; board < puzzles.length; board++)
        if (!s.closed.includes(board) && !readyToSolve(s, board)) s.solved[board] = false;
    progress(s);
    for (const board of s.closed) s.solved[board] = true;
}
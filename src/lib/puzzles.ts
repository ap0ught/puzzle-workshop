export const puzzles = [
    { name: 'Waterworks', icon: '╋', kind: 'pipe', field: 'pipes', size: 9, accepts: ['pipe'], rules: 'Fill all nine sockets, then tap pipes to rotate. Press Done to turn on the water. Connect the inlet to the outlet without leaks.' },
    { name: 'The Slider', icon: '▦', kind: 'tile', field: 'tiles', size: 9, accepts: ['tile'], rules: 'Collect eight tiles, then slide into order 1–8, with the gap last.' },
    { name: 'Lights Out', icon: '☀', kind: 'switch', field: 'switches', size: 9, accepts: ['switch', 'battery'], rules: 'Install nine switches or batteries. Tap to toggle a light and its neighbors. Turn all lights off.' },
    { name: 'Forest Camp', icon: '♧', kind: 'tent', field: 'tents', size: 25, accepts: ['tent'], rules: 'Place five tents beside trees. Tents cannot touch, even diagonally. Match the edge counts.' },
    { name: 'Balance Scales', icon: '⚖', kind: 'weight', field: 'balance', size: 6, cycles: 1, target: (_cell: number) => 0, accepts: ['weight', 'gear', 'tile'], rules: 'Fill all six pans. Balance the total weight of the top row against the bottom row. Each piece weighs its printed number.' },
    { name: 'Beam Routing', icon: '◇', kind: 'mirror', field: 'beam', size: 9, cycles: 3, target: (_cell: number) => 0, accepts: ['mirror', 'pipe'], rules: 'Fill nine sockets with mirrors or pipe sleeves. Tap to cycle through clear, / and backslash angles. Route light from the left emitter to the receiver at bottom right, then test the beam.' },
    { name: 'Gear Machine', icon: '⚙', kind: 'gear', field: 'gears', size: 9, cycles: 4, target: (cell: number) => cell % 3 + 1, accepts: ['gear', 'weight', 'pipe'], rules: 'This machine needs three speeds: slow (1), medium (2), and fast (3). Match each gear’s current speed to its required speed. All nine must match to restart the machine.' },
    { name: 'Electrical Circuit', icon: 'ϟ', kind: 'battery', field: 'circuit', size: 9, cycles: 4, target: (_cell: number) => 1, accepts: ['battery', 'switch', 'wire'], rules: 'Power three defense circuits. Fill the sockets, then adjust voltage, resistance and switches. Match each target current using I = V ÷ R.' }
];
export const kinds = puzzles.map(p => p.kind);
export const compatible = (board: number, item: any) => !!item && !!puzzles[board]?.accepts.includes(item.type);

export const requiredPieces = (board: number) => board === 1 ? 8 : board === 3 ? 5 : puzzles[board].size;
export const filledSockets = (state: any, board: number) => state[puzzles[board].field].filter(Boolean).length;
export const readyToSolve = (state: any, board: number) => filledSockets(state, board) === requiredPieces(board);

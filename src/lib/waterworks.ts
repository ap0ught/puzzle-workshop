// Touch-friendly, dependency-free flow simulation inspired by the reference game.
export function connections(index: number, rotation: number) {
    const base = index === 0 ? [3,1] : index === 2 ? [3,2] : index === 3 ? [2,1] : index === 5 ? [0,3] : index === 6 ? [0,1] : index === 8 ? [3,1] : [1,3];
    return base.map(direction => (direction + rotation) % 4);
}
export const waterSignature = (state: any) => JSON.stringify([state.pipes,state.rot]);
export function traceWater(state: any) {
    const path: number[] = [], queue = [{cell:0,entry:3}];
    const seen = new Set<number>();
    let outlet = false;
    while (queue.length) {
        const {cell,entry} = queue.shift()!;
        const id = state.pipes[cell];
        if (!id) return {passed:false,path,leak:cell,reason:'Water reached an empty socket.'};
        const ports = connections(parseInt(id.slice(4), 10),state.rot[cell]);
        if (!ports.includes(entry)) return {passed:false,path,leak:cell,reason:'These pipe ends do not connect.'};
        if (seen.has(cell)) continue;
        seen.add(cell);path.push(cell);
        for (const direction of ports.filter(port=>port!==entry)) {
            if (cell===8 && direction===1) {outlet=true;continue;}
            if (cell===0 && direction===3) continue;
            const row=Math.floor(cell/3), column=cell%3;
            if ((direction===0&&row===0)||(direction===2&&row===2)||(direction===1&&column===2)||(direction===3&&column===0))
                return {passed:false,path,leak:cell,reason:'Water is escaping through an open pipe end.'};
            queue.push({cell:cell+[-3,1,3,-1][direction],entry:(direction+2)%4});
        }
    }
    return {passed:outlet,path,leak:outlet?null:path.at(-1)??0,reason:outlet?'Water reached the outlet.':'The water route does not reach the outlet.'};
}

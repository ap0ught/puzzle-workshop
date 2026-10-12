// All Lights Out actions and hints use the same orthogonal-neighbor rule.
export function lightNeighbors(cell:number){return [cell,cell-3,cell+3,cell%3?cell-1:-1,cell%3<2?cell+1:-1].filter(c=>c>=0&&c<9);}
export function toggleLights(lights:boolean[],cell:number){for(const neighbor of lightNeighbors(cell))lights[neighbor]=!lights[neighbor];}
export function newLights(){const lights=Array(9).fill(false);for(let cell=0;cell<9;cell++)if(Math.random()<0.5)toggleLights(lights,cell);if(lights.every(v=>!v))toggleLights(lights,4);return lights;}
export function solveLights(lights:boolean[]):number[]{
 let best:number[]|null=null;
 for(let mask=0;mask<512;mask++){const trial=[...lights],moves:number[]=[];for(let cell=0;cell<9;cell++)if(mask>>cell&1){toggleLights(trial,cell);moves.push(cell);}if(trial.every(v=>!v)&&(!best||moves.length<best.length))best=moves;}
 return best??[];
}

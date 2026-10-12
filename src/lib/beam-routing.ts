// Independent square-grid optics implementation inspired by Beaming's connection mechanic.
// Directions: up, right, down, left. Pieces switch between clear, / and backslash.
export const beamSignature=(s:any)=>JSON.stringify([s.beam,s.settings[5]]);
export function traceBeam(s:any){
 const path:number[]=[],segments:number[][]=[];const visited=new Set<string>();
 let cell=0,direction=1;
 segments.push([-0.5,0,0,0]);
 while(cell>=0&&cell<9){
  const x=cell%3,y=Math.floor(cell/3),key=cell+':'+direction;
  if(visited.has(key))return {passed:false,path,segments,blocked:cell,reason:'The beam is trapped in a loop.'};
  visited.add(key);path.push(cell);
  if(!s.beam[cell])return {passed:false,path,segments,blocked:cell,reason:'The beam reached an empty socket.'};
  const mode=s.settings[5][cell]%3;
  direction=mode===1?[1,0,3,2][direction]:mode===2?[3,2,1,0][direction]:direction;
  if(cell===8&&direction===1){segments.push([x,y,2.5,y]);return {passed:true,path,segments,blocked:null,reason:'The receiver is lit!'};}
  const nx=x+[0,1,0,-1][direction],ny=y+[-1,0,1,0][direction];
  if(nx<0||nx>2||ny<0||ny>2){segments.push([x,y,x+(nx-x)*0.5,y+(ny-y)*0.5]);return {passed:false,path,segments,blocked:cell,reason:'The beam misses the receiver. Rotate the highlighted piece.'};}
  segments.push([x,y,nx,ny]);cell=ny*3+nx;
 }
 return {passed:false,path,segments,blocked:cell,reason:'No connection to the receiver.'};
}

export const systems=['Water pumps','Supply elevator','Floodlights','Perimeter sensors','Barricade supports','Laser targeting','Turret drive','Electric fence'];
const names=['Scout','Engineer','Medic','Ranger','Guardian','Commander','Mechanic','Sentinel'];
export function shufflePicture(size:number){
 const tiles=Array.from({length:size*size},(_,i)=>i+1);
 for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
 if(tiles.every((v,i)=>v===i+1))[tiles[0],tiles[1]]=[tiles[1],tiles[0]];
 return tiles;
}
export function rewardRoom(s:any,board:number){s.packages??=[];if(s.packages.some((p:any)=>p.room===board))return;const level=Math.min(s.packages.length+1,6),size=level+2;s.packages.push({id:'fighter-'+board,room:board,name:names[board],level,size,mode:'swap',tiles:shufflePicture(size),moves:0,recruited:false});s.systems??=[];if(!s.systems.includes(board))s.systems.push(board);}
export function upgradeDefense(s:any){s.packages??=[];s.systems??=[];s.defense??={wave:1,zombies:6,wall:100,log:'Activate systems and recruit fighters before defending the perimeter.'};for(const board of s.completed??[])rewardRoom(s,board);for(const pack of s.packages){if(pack.mode!=='swap'){pack.tiles=pack.tiles.map((v:number)=>v===0?pack.size*pack.size:v);pack.mode='swap';}}}
export function defenseAction(s:any,a:any){
 if(a.type==='swapFighter'){
 const pack=s.packages.find((p:any)=>p.id===a.package);if(!pack)throw Error('Earn this fighter package by solving its room first.');if(pack.recruited)throw Error('This fighter is already recruited.');
 const from=Number(a.from),to=Number(a.to);if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=pack.tiles.length||to>=pack.tiles.length||from===to)throw Error('Choose two different picture pieces.');
 if((a.expectedFrom!==undefined&&pack.tiles[from]!==a.expectedFrom)||(a.expectedTo!==undefined&&pack.tiles[to]!==a.expectedTo))throw Error('Your partner moved a selected piece. Select two pieces again.');
 [pack.tiles[from],pack.tiles[to]]=[pack.tiles[to],pack.tiles[from]];pack.moves++;if(pack.tiles.every((v:number,i:number)=>v===i+1)){pack.recruited=true;s.announcements.unshift(pack.name+' recruited! Level '+pack.level+' fighter ready outside.');}return true;
 }
 if(a.type==='fightWave'){
 if(s.defense.wall<=0)throw Error('The perimeter has fallen. Start a new adventure.');const fighters=s.packages.filter((p:any)=>p.recruited);if(!fighters.length)throw Error('Complete a fighter picture puzzle before defending.');
 const power=fighters.reduce((n:number,p:any)=>n+p.level*3,0)+s.systems.length*2,kills=Math.min(s.defense.zombies,power);s.defense.zombies-=kills;
 if(!s.defense.zombies){s.defense.log='Wave '+s.defense.wave+' repelled! '+kills+' zombies stopped.';s.defense.wave++;s.defense.zombies=6+s.defense.wave*3;}else{s.defense.wall=Math.max(0,s.defense.wall-s.defense.zombies*2);s.defense.log=kills+' zombies stopped. '+s.defense.zombies+' remain; wall integrity '+s.defense.wall+'%.';}s.announcements.unshift(s.defense.log);return true;
 }return false;
}

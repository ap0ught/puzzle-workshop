import {initial,act,check} from './lib/game.ts';
const prefix='puzzle-workshop:room:';
function view(state:any){return {...state,players:state.players.map(({token,...player}:any)=>player)};}
function read(code:string){const raw=localStorage.getItem(prefix+code);return raw?JSON.parse(raw):null;}
function save(code:string,state:any){localStorage.setItem(prefix+code,JSON.stringify(state));}
const response=(value:any,status=200)=>Response.json(value,{status});
async function handle(url:string,options?:RequestInit){
 try{
 if(!options?.method||options.method==='GET'){
 const code=new URL(url,'https://local.invalid').searchParams.get('code')?.toUpperCase()||'',s=read(code);if(!s)return response({error:'Room not found in this browser. Use Add local player or join from another tab of this browser.'},404);const before=JSON.stringify(s);check(s);if(JSON.stringify(s)!==before){s.version++;save(code,s);}return response(view(s));
 }
 const a=JSON.parse(String(options.body||'{}'));
 if(a.type==='create'){
 let code='';do{code=crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();}while(read(code));
 const token=crypto.randomUUID(),s=initial();s.players.push({id:1,name:String(a.name||'Player 1').slice(0,20),token,x:45,y:60});save(code,s);return response({code,token,player:1,state:view(s)});
 }
 const code=String(a.code||'').toUpperCase(),s=read(code);if(!s)return response({error:'Room not found in this browser. Remote co-op needs a backend.'},404);
 let token=a.token,player;
 if(a.type==='join'){if(s.players.length>=2)return response({error:'This room already has two players.'},409);token=crypto.randomUUID();player=2;s.players.push({id:2,name:String(a.name||'Player 2').slice(0,20),token,x:55,y:60});}else act(s,token,a);
 check(s);s.version++;save(code,s);return response({state:view(s),token,player});
 }catch(error:any){return response({error:error?.name==='QuotaExceededError'?'Browser storage is full. Export or remove old browser data before starting more rooms.':error.message||'Could not update the local room.'},400);}
}
export async function requestRoom(url:string,options?:RequestInit){
 // Shared-origin tabs serialize reads/moves where Web Locks are available.
 const locks=(navigator as any).locks;
 return locks?locks.request('puzzle-workshop-local-state',()=>handle(url,options)):handle(url,options);
}
